import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
      return;
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      res.status(400).json({ error: '이미 가입된 전화번호입니다. 같은 전화번호로는 하나의 계정만 만들 수 있습니다.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' as any }
    );

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
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

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' as any }
    );

    res.json({
      message: '로그인에 성공했습니다.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
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
    console.error('Login error:', error);
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

// 뱃지 인증 요청
export const requestBadge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { badgeType, image } = req.body;

    // 이미 대기 중인 요청이 있으면 중복 방지
    const existing = await prisma.badgeRequest.findFirst({
      where: { userId, status: 'pending' },
    });
    if (existing) {
      res.status(400).json({ error: '이미 대기 중인 요청이 있습니다.' });
      return;
    }

    const badge = await prisma.badgeRequest.create({
      data: { userId, badgeType, image: image || null },
    });
    res.status(201).json(badge);
  } catch (error) {
    console.error('Request badge error:', error);
    res.status(500).json({ error: '뱃지 요청 중 오류가 발생했습니다.' });
  }
};

// 프로필 수정
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { nickname, profileImage } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(profileImage !== undefined && { profileImage }),
      },
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      displayName: user.displayName,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      profileImage: user.profileImage,
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
      name: user.name,
      nickname: user.nickname,
      displayName: user.displayName,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      profileImage: user.profileImage,
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

    console.log(`인증번호 [${phone}]: ${code}`);

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
      res.status(400).json({ error: '인증번호가 올바르지 않거나 만료되었습니다.' });
      return;
    }

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
export const resetPasswordRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: '해당 이메일로 가입된 계정이 없습니다.' });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // PhoneVerification 테이블을 재사용하여 이메일 인증코드 저장 (phone 필드에 email 저장)
    await prisma.phoneVerification.create({
      data: { phone: email, code, expiresAt },
    });

    console.log(`비밀번호 재설정 인증번호 [${email}]: ${code}`);
    res.json({ message: '인증번호가 이메일로 발송되었습니다.' });
  } catch (error) {
    console.error('Reset password request error:', error);
    res.status(500).json({ error: '인증번호 발송 중 오류가 발생했습니다.' });
  }
};

// 비밀번호 재설정 (인증코드 확인 후 비밀번호 변경)
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    const verification = await prisma.phoneVerification.findFirst({
      where: { phone: email, code, verified: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      res.status(400).json({ error: '인증번호가 올바르지 않거나 만료되었습니다.' });
      return;
    }

    await prisma.phoneVerification.update({ where: { id: verification.id }, data: { verified: true } });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
  }
};

// 공개 판매자 프로필
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
        badgeRequests: { where: { status: 'approved' }, select: { badgeType: true } },
      },
    });

    if (!user) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }

    const products = await prisma.product.findMany({
      where: { userId: id, category: 'used' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, price: true, image: true, createdAt: true },
    });

    const displayName = user.displayName === 'nickname' && user.nickname ? user.nickname : user.name;

    res.json({
      id: user.id,
      name: displayName,
      profileImage: user.profileImage,
      badges: user.badgeRequests.map(b => b.badgeType),
      createdAt: user.createdAt,
      products,
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
