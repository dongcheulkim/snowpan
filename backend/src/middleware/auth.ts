import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { isTokenIatStale, isIatBeforeInvalidation, isTokenVersionStale } from '../utils/tokens';

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
    }) as JwtPayload & { type?: string; iat?: number; tv?: number };
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
      select: { id: true, email: true, role: true, sessionInvalidBefore: true, tokenVersion: true },
    });

    if (!user) {
      res.status(401).json({ error: '존재하지 않는 사용자입니다.' });
      return;
    }

    // 토큰 세대(tv) 검사 — 비번변경·밴·탈퇴로 tokenVersion 이 올라가면 옛 토큰 즉시 거절.
    // (iat 초단위 비교의 같은-초 경계 문제 없음, 재시작에도 영속)
    if (isTokenVersionStale(decoded.tv, user.tokenVersion)) {
      res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
      return;
    }

    // 영속 무효화 검사 — 재시작으로 인메모리 마커가 사라져도 DB 기준으로 옛 토큰 거절.
    if (isIatBeforeInvalidation(decoded.iat, user.sessionInvalidBefore)) {
      res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
      return;
    }

    if (user.role === 'banned' || user.role === 'deleted') {
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

// 글로벌 사전 미들웨어 — Authorization 헤더가 *있을 때* 검증.
// 헤더 없으면 통과 (공개 endpoint 정상 작동).
// 헤더 있는데 만료/위조면 401 → 클라가 즉시 refresh 시도하도록.
// audit P0 "만료 토큰 → 200 통과" 대응: 헤더가 있으면 무조건 검증 통과해야 진입 가능.
export const validateAuthHeaderIfPresent = (req: Request, res: Response, next: NextFunction): void => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) { next(); return; }
  const token = auth.slice(7).trim();
  if (!token) { next(); return; }
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: '서버 설정 오류' });
    return;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
    next();
  } catch (err: any) {
    const expired = err?.name === 'TokenExpiredError';
    res.status(401).json({ error: expired ? '세션이 만료되었습니다.' : '유효하지 않은 토큰입니다.' });
  }
};

// 선택적 인증 — 토큰이 있고 유효하면 req.user 세팅, 없거나 무효면 익명으로 통과(거절 안 함).
// 공개 상세 조회에서 "소유자/관리자면 미승인도 보이게" 같은 분기용.
export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ') || !process.env.JWT_SECRET) { next(); return; }
  const token = auth.slice(7).trim();
  if (!token) { next(); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: false,
    }) as { userId: string; email?: string; role?: string; type?: string; iat?: number; tv?: number };
    // 비번 변경/로그아웃 등으로 무효화된 토큰이면 익명 취급 (인증 미들웨어와 동일 기준).
    if ((!decoded.type || decoded.type === 'access') && !isTokenIatStale(decoded.userId, decoded.iat)) {
      let role = decoded.role || 'user';
      // admin 클레임만 DB 재확인 — optionalAuth 는 성능상 DB 를 안 타지만, admin 은
      // 미승인 매물 가시성 게이트라 강등/밴/토큰무효화가 즉시 반영돼야 함.
      // (일반 유저 경로는 개인화뿐이라 기존대로 무쿼리 유지)
      if (role === 'admin') {
        try {
          const u = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { role: true, tokenVersion: true, sessionInvalidBefore: true },
          });
          const tvOk = u && (decoded.tv ?? 0) === u.tokenVersion;
          const iatOk = u && !isIatBeforeInvalidation(decoded.iat, u.sessionInvalidBefore);
          role = u && u.role === 'admin' && tvOk && iatOk ? 'admin' : 'user';
        } catch { role = 'user'; }
      }
      req.user = { id: decoded.userId, email: decoded.email || '', role };
    }
  } catch { /* 무효 토큰 → 익명으로 진행 */ }
  next();
};

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
