import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { sendEmail, verificationEmailHtml } from '../utils/email';
import { sendSMS } from '../utils/sms';
import { signAccessToken, setRefreshCookie, clearRefreshCookie, verifyRefreshToken, REFRESH_COOKIE_NAME, consumeJti, isFamilyRevoked, revokeFamily, isTokenIatStale, invalidateUserTokens } from '../utils/tokens';
import { isLocked, recordFailure, recordSuccess, DUMMY_BCRYPT_HASH, canSendEmail } from '../utils/loginGuard';
import { normalizeEmail } from '../utils/validate';
import { awardPoints } from '../utils/points';

// 가입 보너스 + 추천인 보너스 (양쪽 지급).
const SIGNUP_BONUS_POINTS = 1000;
const REFERRAL_BONUS_REFERRER = 500;  // 추천한 사람
const REFERRAL_BONUS_REFERRED = 200;  // 추천받아 가입한 사람 (가입 보너스 위에 추가)

// 비밀번호 해시 강도. OWASP 2024+ 권장은 12. 비용 ≈ 2^12 라운드.
const BCRYPT_COST = 12;

// 휴대폰 인증 무한 시도 방어 — phone 별 실패 카운터 (인메모리, 10분 윈도우).
// 6자리 코드 + IP 레이트리밋만으로는 phone 한 개에 백만 번 시도 가능.
const phoneVerifyAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_PHONE_VERIFY_ATTEMPTS = 5;
const PHONE_VERIFY_WINDOW_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of phoneVerifyAttempts) if (now >= v.resetAt) phoneVerifyAttempts.delete(k);
}, 5 * 60 * 1000);

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, nickname, phone, referralCode } = req.body;

    // 모든 입력 type 검증 — 객체/배열 주입 시 즉시 거절 (NoSQL injection 방어).
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string' || typeof phone !== 'string') {
      res.status(400).json({ error: '입력 형식이 올바르지 않습니다.' });
      return;
    }
    if (nickname !== undefined && typeof nickname !== 'string') {
      res.status(400).json({ error: '입력 형식이 올바르지 않습니다.' });
      return;
    }
    if (!email || !password || !name || !phone) {
      res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
      return;
    }

    // 이메일 정규화 — trim + lowercase. 같은 사용자 분신 차단.
    const emailNormalized = normalizeEmail(email);
    if (!emailNormalized) {
      res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
      return;
    }

    // 비밀번호 정책 — 클라이언트만 믿지 않고 서버에서도 강제.
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      res.status(400).json({ error: '비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.' });
      return;
    }

    // 한국 휴대폰 형식 (하이픈 자동 제거 후 검사).
    const phoneClean = phone.replace(/[-\s]/g, '');
    if (!/^01[016789]\d{7,8}$/.test(phoneClean)) {
      res.status(400).json({ error: '올바른 휴대폰 번호 형식이 아닙니다.' });
      return;
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: emailNormalized } });
    if (existingEmail) {
      res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
      return;
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone: phoneClean } });
    if (existingPhone) {
      res.status(400).json({ error: '이미 가입된 전화번호입니다. 같은 전화번호로는 하나의 계정만 만들 수 있습니다.' });
      return;
    }

    // 닉네임 중복 사전 차단 — Prisma unique constraint 가 던지는 모호한 500 대신 친절한 409 반환.
    const trimmedNickname = nickname ? String(nickname).trim() : '';
    if (trimmedNickname) {
      if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
        res.status(400).json({ error: '닉네임은 2~20자여야 합니다.' });
        return;
      }
      const existingNickname = await prisma.user.findFirst({ where: { nickname: trimmedNickname }, select: { id: true } });
      if (existingNickname) {
        res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    // 추천 코드 검증 — 잘못된 코드는 무시하고 가입 진행 (UX 우선).
    let referredById: string | undefined;
    if (typeof referralCode === 'string' && referralCode.trim()) {
      const code = referralCode.trim().toUpperCase();
      if (/^[A-Z0-9]{4,12}$/.test(code)) {
        const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
        if (referrer) referredById = referrer.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        email: emailNormalized,
        password: hashedPassword,
        name: name.trim(),
        nickname: trimmedNickname || null,
        phone: phoneClean,
        referredById: referredById,
      },
    });

    // 가입 축하 보너스 — 1000P. 실패해도 가입은 성공으로 처리 (포인트는 부수효과).
    try {
      await awardPoints(prisma, {
        userId: user.id,
        amount: SIGNUP_BONUS_POINTS,
        source: 'signup_bonus',
        description: '회원가입 축하 보너스',
      });

      // 추천인이 있으면 양쪽 다 보너스. 추천인은 무한 보너스 가능하지만
      // 추천 코드가 유니크 + 가입은 phone 인증 필수라 자기 자신 farming 어려움.
      if (referredById) {
        await awardPoints(prisma, {
          userId: user.id,
          amount: REFERRAL_BONUS_REFERRED,
          source: 'referral_bonus',
          refId: referredById,
          description: '추천 코드로 가입 보너스',
        });
        await awardPoints(prisma, {
          userId: referredById,
          amount: REFERRAL_BONUS_REFERRER,
          source: 'referral_bonus',
          refId: user.id,
          description: '친구 가입 보너스',
        });
      }
    } catch (e) {
      console.error('Signup bonus award failed:', e);
    }

    // 듀얼 토큰: access 1h (응답 body) + refresh 14d (HttpOnly 쿠키).
    const token = signAccessToken(user);
    // 가입 직후엔 자동 로그인 끔 (세션 쿠키 — 브라우저 닫으면 만료).
    setRefreshCookie(res, user.id, false);

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname || user.name,
        nickname: user.nickname,
        displayName: user.displayName,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        profileImage: user.profileImage,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const ip = (req.header('cf-connecting-ip') || req.header('x-real-ip') || req.ip || 'unknown').toString();

    // type 검증 — 객체/배열 주입 차단 (NoSQL injection 방어).
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: '입력 형식이 올바르지 않습니다.' });
      return;
    }
    if (!email || !password) {
      res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
      return;
    }

    // 이메일 정규화 — 가입 시와 동일하게 처리해야 매칭됨.
    const emailNormalized = normalizeEmail(email) || email.trim().toLowerCase();

    // Account lockout — 같은 (email, IP) 가 10회 실패하면 30분 잠금.
    const lockState = isLocked(emailNormalized, ip);
    if (lockState.locked) {
      res.set('Retry-After', String(lockState.retryAfter || 1800));
      res.status(429).json({
        error: `로그인 시도가 너무 많습니다. ${Math.ceil((lockState.retryAfter || 1800) / 60)}분 후 다시 시도해주세요.`,
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: emailNormalized } });

    // Constant-time bcrypt — 사용자 존재 여부와 상관없이 항상 bcrypt 실행.
    // 사용자 없으면 dummy hash 와 비교 → 처리 시간 일정 → timing-based user enumeration 차단.
    const passwordHash = user?.password || DUMMY_BCRYPT_HASH;
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isPasswordValid) {
      recordFailure(emailNormalized, ip);
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    if (user.role === 'deleted') {
      res.status(403).json({ error: '탈퇴한 계정입니다.' });
      return;
    }
    if (user.role === 'banned') {
      res.status(403).json({ error: '정지된 계정입니다.' });
      return;
    }

    // 로그인 성공 — 실패 카운터 리셋.
    recordSuccess(emailNormalized, ip);

    // 듀얼 토큰: access 1h (응답 body) + refresh 14d/세션 (HttpOnly 쿠키).
    // body 의 remember=true 면 14일 유지, 없으면 브라우저 닫을 때 만료.
    const remember = req.body?.remember === true;
    const token = signAccessToken(user);
    setRefreshCookie(res, user.id, remember);

    res.json({
      message: '로그인에 성공했습니다.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname || user.name,
        nickname: user.nickname,
        displayName: user.displayName,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        profileImage: user.profileImage,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error?.message, error?.stack);
    res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
};

// 내 뱃지 요청 목록 조회
export const getMyBadges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const badges = await prisma.badgeRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(badges);
  } catch (error) {
    console.error('Get my badges error:', error);
    res.status(500).json({ error: '뱃지 조회 중 오류가 발생했습니다.' });
  }
};

// 뱃지 인증 요청 — vertical 단위로 분리. 같은 vertical 내 pending 만 1건 제한.
const VALID_VERTICALS = ['snow', 'bike', 'run', 'surf', 'golf', 'camp'];
export const requestBadge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { badgeType, image, vertical } = req.body;

    if (!badgeType || typeof badgeType !== 'string') {
      res.status(400).json({ error: '뱃지 종류를 선택해주세요.' });
      return;
    }
    const verticalSlug = typeof vertical === 'string' && VALID_VERTICALS.includes(vertical) ? vertical : 'snow';

    // 같은 vertical 안에서 대기 중인 요청이 있으면 중복 방지 (다른 vertical 은 별도 허용)
    const existing = await prisma.badgeRequest.findFirst({
      where: { userId, vertical: verticalSlug, status: 'pending' },
    });
    if (existing) {
      res.status(400).json({ error: '같은 종목에서 이미 대기 중인 요청이 있습니다.' });
      return;
    }

    const badge = await prisma.badgeRequest.create({
      data: { userId, vertical: verticalSlug, badgeType, image: image || null },
    });
    res.status(201).json(badge);
  } catch (error) {
    console.error('Request badge error:', error);
    res.status(500).json({ error: '뱃지 요청 중 오류가 발생했습니다.' });
  }
};

// 비밀번호 변경
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ error: '현재 비밀번호가 일치하지 않습니다.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
    // 모든 기존 토큰 무효화 — 비번 변경 후 옛 토큰으로 접근 차단.
    invalidateUserTokens(userId);
    clearRefreshCookie(res);

    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
  }
};

// 프로필 수정
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { nickname, profileImage, activeBadge } = req.body;

    if (nickname !== undefined && nickname !== null && nickname !== '') {
      const trimmed = String(nickname).trim();
      if (trimmed.length < 2 || trimmed.length > 20) {
        res.status(400).json({ error: '닉네임은 2~20자여야 합니다.' });
        return;
      }
      const duplicate = await prisma.user.findFirst({
        where: { nickname: trimmed, NOT: { id: userId } },
        select: { id: true },
      });
      if (duplicate) {
        res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nickname !== undefined && { nickname: nickname ? String(nickname).trim() : null }),
        ...(profileImage !== undefined && { profileImage }),
        ...(activeBadge !== undefined && { activeBadge: activeBadge || null }),
      },
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.nickname || user.name,
      nickname: user.nickname,
      displayName: user.displayName,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      profileImage: user.profileImage,
      activeBadge: user.activeBadge,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '프로필 수정 중 오류가 발생했습니다.' });
  }
};

// 내 정보 조회
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }

    res.json({
      id: user.id,
      email: user.email,
      name: user.nickname || user.name,
      nickname: user.nickname,
      displayName: user.displayName,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      profileImage: user.profileImage,
      activeBadge: user.activeBadge,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: '프로필 조회 중 오류가 발생했습니다.' });
  }
};

export const sendPhoneVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phone } = req.body;

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3);

    await prisma.phoneVerification.create({
      data: {
        phone,
        code,
        expiresAt,
      },
    });

    // SMS 발송 (개발환경에서 env 미설정 시만 콘솔에 코드 노출 — 프로덕션 로그에 인증번호 노출 금지)
    const sent = await sendSMS(phone, `[스노우판] 인증번호: ${code}`);
    if (!sent && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV 인증번호] ${phone}: ${code}`);
    } else if (!sent) {
      console.error(`[ALERT] SMS 발송 실패 (phone=${phone.slice(0, 3)}***) — SMS 서비스 환경변수 점검 필요`);
    }

    res.json({
      message: '인증번호가 발송되었습니다.',
    });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: '인증번호 발송 중 오류가 발생했습니다.' });
  }
};

export const verifyPhone = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code } = req.body;

    if (typeof phone !== 'string' || typeof code !== 'string') {
      res.status(400).json({ error: '입력 형식이 올바르지 않습니다.' });
      return;
    }

    // phone 별 실패 카운터 — 6자리 코드 무한 시도(brute force) 차단.
    const now = Date.now();
    let bucket = phoneVerifyAttempts.get(phone);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + PHONE_VERIFY_WINDOW_MS };
      phoneVerifyAttempts.set(phone, bucket);
    }
    if (bucket.count >= MAX_PHONE_VERIFY_ATTEMPTS) {
      res.status(429).json({ error: '인증 시도 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
      return;
    }

    const verification = await prisma.phoneVerification.findFirst({
      where: {
        phone,
        code,
        verified: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      bucket.count++;
      res.status(400).json({ error: '인증번호가 올바르지 않거나 만료되었습니다.' });
      return;
    }

    // 성공 시 카운터 초기화 — 다음 인증 시 깨끗한 상태에서 시작.
    phoneVerifyAttempts.delete(phone);

    await prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });
    }

    res.json({
      message: '인증이 완료되었습니다.',
    });
  } catch (error) {
    console.error('Verify phone error:', error);
    res.status(500).json({ error: '인증 확인 중 오류가 발생했습니다.' });
  }
};

// 회원 탈퇴 — 거래 기록은 전자상거래법 5년 보관 의무로 유지하고 PII만 익명화.
// 비밀번호 확인 후 이메일·전화·이름·프로필을 마스킹하고 role='deleted'로 잠금.
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { password } = req.body as { password?: string };

    if (!password) {
      res.status(400).json({ error: '비밀번호를 입력해주세요.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }
    if (user.role === 'deleted') { res.status(400).json({ error: '이미 탈퇴한 계정입니다.' }); return; }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: '비밀번호가 일치하지 않습니다.' });
      return;
    }

    const stamp = Date.now();
    const anonEmail = `deleted_${userId}@snowpan.local`;
    const anonPhone = `deleted_${stamp}_${userId.slice(0, 8)}`;
    const lockedPasswordHash = await bcrypt.hash(`__deleted__${stamp}__${Math.random()}`, BCRYPT_COST);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonEmail,
          phone: anonPhone,
          name: '탈퇴한 회원',
          nickname: null,
          profileImage: null,
          fcmToken: null,
          activeBadge: null,
          phoneVerified: false,
          password: lockedPasswordHash,
          role: 'deleted',
        },
      });
      // 판매중 매물은 자동으로 거두기 (예약/판매완료 매물은 거래 기록 유지)
      await tx.product.updateMany({
        where: { userId, status: 'selling' },
        data: { status: 'sold' },
      });
    });

    invalidateUserTokens(userId);
    clearRefreshCookie(res);
    res.json({ message: '탈퇴 처리되었습니다.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: '탈퇴 처리 중 오류가 발생했습니다.' });
  }
};

// FCM 토큰 저장
export const saveFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { fcmToken } = req.body as { fcmToken: string };
    await prisma.user.update({ where: { id: userId }, data: { fcmToken } });
    res.json({ message: 'FCM 토큰이 저장되었습니다.' });
  } catch (error) {
    console.error('Save FCM token error:', error);
    res.status(500).json({ error: 'FCM 토큰 저장 중 오류가 발생했습니다.' });
  }
};

// 비밀번호 재설정 요청 (이메일로 인증코드 전송)
// 보안: user enumeration 방지 — 등록 여부에 관계없이 같은 응답 반환.
// 등록된 이메일에만 실제 코드 발송.
export const resetPasswordRequest = async (req: Request, res: Response): Promise<void> => {
  const GENERIC_MSG = '입력한 이메일이 등록된 계정이라면 인증번호가 발송됩니다. 메일함을 확인해주세요.';
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.json({ message: GENERIC_MSG });
      return;
    }
    const emailNormalized = normalizeEmail(email) || email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: emailNormalized } });
    if (!user || user.role === 'deleted') {
      // 미등록/탈퇴 계정 — 등록된 것처럼 응답하되 실제 발송 X.
      res.json({ message: GENERIC_MSG });
      return;
    }

    // 이메일 폭탄 방지 — 같은 이메일 24시간 내 5회 초과 발송 차단.
    const sendCheck = canSendEmail(email);
    if (!sendCheck.ok) {
      // 공격자에게도 같은 응답 — 다만 실제 발송 X.
      res.json({ message: GENERIC_MSG });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await prisma.emailVerification.deleteMany({ where: { email: emailNormalized, purpose: 'password_reset' } });
    await prisma.emailVerification.create({
      data: { email: emailNormalized, code, expiresAt, purpose: 'password_reset' },
    });

    const sent = await sendEmail(emailNormalized, '[스노우판] 비밀번호 재설정 인증번호', verificationEmailHtml(code));
    if (!sent && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV 비번재설정] ${emailNormalized}: ${code}`);
    } else if (!sent) {
      console.error(`[ALERT] 이메일 발송 실패 (email=${emailNormalized.split('@')[0].slice(0, 2)}***@${emailNormalized.split('@')[1]}) — 이메일 서비스 환경변수 점검 필요`);
    }

    res.json({ message: GENERIC_MSG });
  } catch (error) {
    console.error('Reset password request error:', error);
    // 에러도 일반 메시지로 — 어떤 시도든 같은 응답.
    res.json({ message: GENERIC_MSG });
  }
};

// 비밀번호 재설정 (인증코드 확인 후 비밀번호 변경)
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    // type 검증 + 필수 입력 + 비밀번호 정책 (가입과 동일).
    if (typeof email !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ error: '입력 형식이 올바르지 않습니다.' });
      return;
    }
    if (!email || !code || !newPassword) {
      res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      res.status(400).json({ error: '비밀번호는 영문과 숫자를 포함해 8자 이상이어야 합니다.' });
      return;
    }

    const emailNormalized = normalizeEmail(email) || email.trim().toLowerCase();

    const verification = await prisma.emailVerification.findFirst({
      where: { email: emailNormalized, code, purpose: 'password_reset', expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      res.status(400).json({ error: '인증번호가 올바르지 않거나 만료되었습니다.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: emailNormalized } });
    if (!user) {
      res.status(404).json({ error: '해당 이메일로 가입된 계정이 없습니다.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
    await prisma.$transaction([
      prisma.user.update({ where: { email: emailNormalized }, data: { password: hashedPassword } }),
      // 사용된 인증코드 즉시 삭제 + 같은 이메일의 남은 미사용 코드도 무효화
      prisma.emailVerification.deleteMany({ where: { email: emailNormalized } }),
    ]);
    // 모든 기존 토큰 무효화 — 비번 재설정 후 옛 토큰으로 접근 차단.
    invalidateUserTokens(user.id);
    clearRefreshCookie(res);

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
  }
};

// 공개 판매자 프로필 + 신뢰 신호 (가입일, 등록·판매·커뮤니티 활동량)
export const getSellerProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nickname: true,
        displayName: true,
        profileImage: true,
        createdAt: true,
        badgeRequests: { where: { status: 'approved' }, select: { badgeType: true, vertical: true } },
      },
    });

    if (!user) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }

    // 신뢰 신호 — 한 번에 병렬 조회
    const [products, soldCount, postCount] = await Promise.all([
      prisma.product.findMany({
        where: { userId: id, category: 'used' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, price: true, image: true, status: true, createdAt: true },
      }),
      prisma.product.count({ where: { userId: id, category: 'used', status: 'sold' } }),
      prisma.post.count({ where: { userId: id } }).catch(() => 0),
    ]);

    const displayName = user.displayName === 'nickname' && user.nickname ? user.nickname : user.name;

    res.json({
      id: user.id,
      name: displayName,
      profileImage: user.profileImage,
      // 호환: badges = snow vertical 만 평탄화 (기존 UI 그대로). badgesByVertical = 새 구조.
      badges: user.badgeRequests.filter(b => b.vertical === 'snow').map(b => b.badgeType),
      badgesByVertical: user.badgeRequests.reduce<Record<string, string[]>>((acc, b) => {
        (acc[b.vertical] = acc[b.vertical] || []).push(b.badgeType);
        return acc;
      }, {}),
      createdAt: user.createdAt,
      products,
      stats: {
        listingCount: products.length,
        soldCount,
        postCount,
      },
    });
  } catch (error) {
    console.error('Get seller profile error:', error);
    res.status(500).json({ error: '판매자 프로필 조회 중 오류가 발생했습니다.' });
  }
};


// ===== 광고 신청 (유저) =====
export const createAdRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, category, title, description, url, image, message } = req.body as {
      type: string; category?: string; title: string; description: string;
      url: string; image?: string; message?: string;
    };
    if (!type || !title || !description || !url) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }
    const item = await prisma.adRequest.create({
      data: { type, category: category || null, title, description, url, image: image || null, message: message || null, userId: req.user!.id },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Create ad request error:', error);
    res.status(500).json({ error: '광고 신청 중 오류가 발생했습니다.' });
  }
};

export const getMyAdRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.adRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Get my ad requests error:', error);
    res.status(500).json({ error: '광고 신청 목록 조회 중 오류가 발생했습니다.' });
  }
};

// 액세스 토큰 재발급 — refresh 쿠키만으로 인증 + token rotation.
// 매 refresh 마다 새 refresh 토큰 발급 (rotation). 옛 토큰 재사용 감지되면
// family 통째로 무효화 → 도난 시 사용자가 자기 토큰으로 다시 refresh 시도 시
// 즉시 강제 로그아웃 → 공격자 차단.
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const cookieToken = (req as any).cookies?.[REFRESH_COOKIE_NAME];
    if (!cookieToken) {
      res.status(401).json({ error: '재인증이 필요합니다.' });
      return;
    }
    let payload;
    try {
      payload = verifyRefreshToken(cookieToken);
    } catch {
      clearRefreshCookie(res);
      res.status(401).json({ error: '재인증이 필요합니다.' });
      return;
    }

    // family 가 이미 무효화된 경우 (도난 감지된 family) → 거절.
    if (isFamilyRevoked(payload.fam)) {
      clearRefreshCookie(res);
      res.status(401).json({ error: '재인증이 필요합니다.' });
      return;
    }

    // jti 재사용 감지 — 토큰이 두 번째 쓰이면 도난 의심 → family 무효화.
    if (!consumeJti(payload.jti)) {
      revokeFamily(payload.fam);
      clearRefreshCookie(res);
      res.status(401).json({ error: '비정상 접근이 감지되어 로그아웃되었습니다. 다시 로그인해주세요.' });
      return;
    }

    // 사용자 단위 무효화 (비밀번호 변경/탈퇴 후 옛 refresh 토큰) → 거절.
    if (isTokenIatStale(payload.userId, (payload as any).iat)) {
      clearRefreshCookie(res);
      res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true, nickname: true, displayName: true, profileImage: true, phone: true, phoneVerified: true, createdAt: true },
    });
    if (!user || user.role === 'deleted' || user.role === 'banned') {
      clearRefreshCookie(res);
      res.status(401).json({ error: '재인증이 필요합니다.' });
      return;
    }

    // 새 access + 새 refresh (같은 family 유지) — rotation.
    const token = signAccessToken(user);
    setRefreshCookie(res, user.id, true, payload.fam);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname || user.name,
        nickname: user.nickname,
        displayName: user.displayName,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        profileImage: user.profileImage,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: '토큰 갱신 중 오류가 발생했습니다.' });
  }
};

// 로그아웃 — refresh 쿠키 제거. 클라이언트는 별도로 access 토큰을 메모리/세션에서 비움.
export const logout = (_req: Request, res: Response): void => {
  clearRefreshCookie(res);
  res.json({ message: '로그아웃되었습니다.' });
};
