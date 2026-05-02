import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { isTokenIatStale } from '../utils/tokens';

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

    // 명시적 algorithm + 만료 검증 강제. type='access' 만 허용 — refresh 토큰을 access 자리에 넣는 공격 차단.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: false,
    }) as JwtPayload & { type?: string; iat?: number };
    if (decoded.type && decoded.type !== 'access') {
      res.status(401).json({ error: '잘못된 토큰 타입입니다.' });
      return;
    }
    // 비번 변경/탈퇴 등으로 사용자 단위로 토큰 무효화된 경우 — 옛 토큰 거절.
    if (isTokenIatStale(decoded.userId, decoded.iat)) {
      res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
      return;
    }

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

// 관리자 전용 라우트 가드 — authMiddleware 뒤에 체이닝 해서 사용.
// 현재 컨트롤러마다 반복되는 role 체크를 중앙화. 신규 라우트에서는 이 미들웨어를 쓰는 걸 권장.
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
    return;
  }
  next();
};
