import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: '인증 토큰이 필요합니다.' });
      return;
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
      res.status(500).json({ error: '서버 설정 오류' });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as JwtPayload;

    // DB에서 최신 role 확인 (banned 체크)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: '존재하지 않는 사용자입니다.' });
      return;
    }

    if (user.role === 'banned') {
      res.status(403).json({ error: '이용이 제한된 계정입니다.' });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

// Alias for consistency
export const authenticateToken = authMiddleware;
