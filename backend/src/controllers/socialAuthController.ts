import { Request, Response } from 'express';
import prisma from '../config/database';
import { signAccessToken, setRefreshCookie } from '../utils/tokens';
import { awardPoints } from '../utils/points';
import { normalizeEmail } from '../utils/validate';

// 소셜 로그인 (카카오/네이버). 서버사이드 OAuth authorization code flow.
// 키: KAKAO_CLIENT_ID (+옵션 KAKAO_CLIENT_SECRET), NAVER_LOGIN_CLIENT_ID/SECRET.
//   ⚠️ 네이버 로그인은 검색 API(NAVER_CLIENT_ID)와 다른 앱 키 — NAVER_LOGIN_* 사용.
// FRONTEND_URL 로 콜백 후 리다이렉트.

const FRONTEND = () => process.env.FRONTEND_URL || 'https://snowpan.kr';
const API_BASE = () => process.env.RENDER_EXTERNAL_URL || 'https://snowpan.onrender.com';
const APP_SCHEME = 'kr.snowpan.app'; // Capacitor 앱 커스텀 스킴 (딥링크로 토큰 되돌림)
const SIGNUP_BONUS = 1000;

interface SocialProfile {
  provider: 'kakao' | 'naver';
  providerId: string;
  email?: string | null;
  emailVerified?: boolean; // 제공자가 이메일 인증됨을 보증하는가 (카카오 is_email_verified / 네이버는 true)
  name?: string | null;
  profileImage?: string | null;
}

// 소셜 프로필 → 유저 조회/생성 후 우리 토큰 발급 + 리다이렉트.
// isApp=true 면 웹(snowpan.kr) 대신 앱 커스텀 스킴(kr.snowpan.app://)으로 딥링크 리다이렉트.
async function completeLogin(res: Response, profile: SocialProfile, isApp: boolean): Promise<void> {
  // 인증된 이메일만 신뢰 — 미인증 이메일로 기존 계정에 붙는 탈취 차단. 정규화(소문자/trim)해서 이메일가입과 동일 규칙.
  const verifiedEmail = profile.emailVerified && profile.email ? normalizeEmail(profile.email) : null;

  // 1) (provider, providerId) 로 기존 소셜 유저 조회.
  let user = await prisma.user.findFirst({ where: { provider: profile.provider, providerId: profile.providerId } });

  // 2) 없으면 "인증된" 이메일로만 기존 계정 연결. 그 계정이 이미 다른 소셜에 연결돼 있으면 덮지 않음.
  if (!user && verifiedEmail) {
    const byEmail = await prisma.user.findUnique({ where: { email: verifiedEmail } });
    if (byEmail && !byEmail.provider) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { provider: profile.provider, providerId: profile.providerId, profileImage: byEmail.profileImage || profile.profileImage || null },
      });
    } else if (byEmail) {
      // 이미 다른 provider 연결된 계정 — 자동 병합 안 함(안전).
      user = byEmail;
    }
  }

  // 3) 그래도 없으면 신규 생성. 인증 이메일 없으면 placeholder (@social.local) — unique 보장.
  let isNew = false;
  if (!user) {
    const email = verifiedEmail || `${profile.provider}_${profile.providerId}@social.local`;
    user = await prisma.user.create({
      data: {
        email,
        password: null,
        name: profile.name || '스노우판 유저',
        phone: null,
        provider: profile.provider,
        providerId: profile.providerId,
        profileImage: profile.profileImage || null,
      },
    });
    isNew = true;
  }

  // 탈퇴/차단 계정은 소셜로도 재로그인 불가 — 토큰 발급 전 차단.
  if (user.role === 'deleted' || user.role === 'banned') {
    return fail(res, '이용이 제한된 계정입니다.', isApp);
  }

  if (isNew) {
    await awardPoints(prisma, { userId: user.id, amount: SIGNUP_BONUS, source: 'signup_bonus', description: '회원가입 축하 보너스' }).catch(() => {});
  }

  // 우리 토큰 발급 + refresh 쿠키(소셜은 지속 로그인). 프론트로 토큰·유저 전달.
  const token = signAccessToken(user);
  setRefreshCookie(res, user.id, true);
  const minimal = { id: user.id, email: user.email, name: user.name, nickname: user.nickname, role: user.role, phone: user.phone, profileImage: user.profileImage, provider: user.provider };
  const payload = Buffer.from(JSON.stringify(minimal)).toString('base64url');
  // isNew=1 이면 프론트가 온보딩(/welcome)으로 보냄 — 닉네임·약관 미완료 신규 소셜 유저.
  const hash = `#token=${encodeURIComponent(token)}&user=${payload}&provider=${profile.provider}&isNew=${isNew ? 1 : 0}`;
  // 앱: 커스텀 스킴 딥링크로 토큰 반환 → 앱이 받아 로그인. 웹: 기존 /oauth/callback.
  res.redirect(isApp ? `${APP_SCHEME}://oauth/callback${hash}` : `${FRONTEND()}/oauth/callback${hash}`);
}

function fail(res: Response, msg: string, isApp = false): void {
  const q = `social_error=${encodeURIComponent(msg)}`;
  res.redirect(isApp ? `${APP_SCHEME}://login?${q}` : `${FRONTEND()}/login?${q}`);
}

// ===== 카카오 =====
export function kakaoConfigured() { return Boolean(process.env.KAKAO_CLIENT_ID); }

export const kakaoStart = (req: Request, res: Response): void => {
  if (!kakaoConfigured()) { res.status(503).json({ error: '카카오 로그인 준비 중입니다.' }); return; }
  const redirectUri = `${API_BASE()}/api/auth/kakao/callback`;
  // 앱에서 시작하면 state=app 을 실어 콜백에서 앱 딥링크로 되돌리게 함.
  const state = req.query.platform === 'app' ? '&state=app' : '';
  const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}${state}`;
  res.redirect(url);
};

export const kakaoCallback = async (req: Request, res: Response): Promise<void> => {
  const isApp = String(req.query.state || '') === 'app';
  try {
    const code = String(req.query.code || '');
    if (!code) return fail(res, '인증 코드가 없습니다.', isApp);
    const redirectUri = `${API_BASE()}/api/auth/kakao/callback`;

    // 토큰 교환
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID!,
        redirect_uri: redirectUri,
        code,
        ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_code?: string; error_description?: string };
    if (!tokenData.access_token) {
      console.error('카카오 토큰 발급 실패:', tokenData);
      const detail = tokenData.error_description || tokenData.error_code || tokenData.error || '알 수 없음';
      return fail(res, `카카오 토큰 발급 실패: ${detail}`, isApp);
    }

    // 프로필 조회
    const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json() as { id?: number; msg?: string; code?: number; kakao_account?: { email?: string; is_email_verified?: boolean; profile?: { nickname?: string; profile_image_url?: string } } };
    if (!me.id) {
      console.error('카카오 프로필 조회 실패:', me);
      return fail(res, `카카오 프로필 조회 실패: ${me.msg || '알 수 없음'}`, isApp);
    }

    await completeLogin(res, {
      provider: 'kakao',
      providerId: String(me.id),
      email: me.kakao_account?.email || null,
      emailVerified: me.kakao_account?.is_email_verified === true,
      name: me.kakao_account?.profile?.nickname || null,
      profileImage: me.kakao_account?.profile?.profile_image_url || null,
    }, isApp);
  } catch (err) {
    console.error('카카오 콜백 에러:', err);
    fail(res, '로그인 처리 중 오류가 발생했습니다.', isApp);
  }
};

// ===== 네이버 =====
export function naverLoginConfigured() { return Boolean(process.env.NAVER_LOGIN_CLIENT_ID && process.env.NAVER_LOGIN_CLIENT_SECRET); }

export const naverStart = (req: Request, res: Response): void => {
  if (!naverLoginConfigured()) { res.status(503).json({ error: '네이버 로그인 준비 중입니다.' }); return; }
  const redirectUri = `${API_BASE()}/api/auth/naver/callback`;
  // 앱이면 state 앞에 app: 를 붙여 콜백에서 앱 딥링크로 되돌림 (뒤는 CSRF 랜덤).
  const state = (req.query.platform === 'app' ? 'app:' : '') + Math.random().toString(36).slice(2);
  const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${process.env.NAVER_LOGIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  res.redirect(url);
};

export const naverCallback = async (req: Request, res: Response): Promise<void> => {
  const isApp = String(req.query.state || '').startsWith('app:');
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code) return fail(res, '인증 코드가 없습니다.', isApp);
    const redirectUri = `${API_BASE()}/api/auth/naver/callback`;

    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_LOGIN_CLIENT_ID}&client_secret=${process.env.NAVER_LOGIN_CLIENT_SECRET}&code=${code}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`);
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
    if (!tokenData.access_token) {
      console.error('네이버 토큰 발급 실패:', tokenData);
      return fail(res, `네이버 토큰 발급 실패: ${tokenData.error_description || tokenData.error || '알 수 없음'}`, isApp);
    }

    const meRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json() as { response?: { id?: string; email?: string; name?: string; nickname?: string; profile_image?: string } };
    const r = me.response;
    if (!r?.id) return fail(res, '네이버 프로필 조회 실패', isApp);

    await completeLogin(res, {
      provider: 'naver',
      providerId: r.id,
      email: r.email || null,
      emailVerified: !!r.email, // 네이버 로그인 이메일은 인증된 값
      name: r.name || r.nickname || null,
      profileImage: r.profile_image || null,
    }, isApp);
  } catch (err) {
    console.error('네이버 콜백 에러:', err);
    fail(res, '로그인 처리 중 오류가 발생했습니다.', isApp);
  }
};
