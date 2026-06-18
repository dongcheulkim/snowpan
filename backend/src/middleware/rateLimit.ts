import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitEntry>();

// 실제 클라이언트 IP 추출: Render 는 Cloudflare → Render LB → Express 2홉 체인이라
// trust proxy 만으로는 부족. Cloudflare 가 원본 IP를 CF-Connecting-IP 헤더에 실어 보냄.
// 우선순위: CF-Connecting-IP → X-Real-IP → req.ip → socket.
function getClientIp(req: Request): string {
  const cf = req.header('cf-connecting-ip');
  if (cf) return cf.trim();
  const xReal = req.header('x-real-ip');
  if (xReal) return xReal.trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Cleanup expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipMap) {
    if (now > entry.resetAt) {
      ipMap.delete(key);
    }
  }
}, 60_000);

function createRateLimiter(maxRequests: number, windowMs: number = 60_000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 로드테스트 bypass: LOADTEST_BYPASS_KEY env 가 설정되어 있고 요청 헤더와 일치하면 rate limit 스킵.
    // 프로덕션에서 이 env를 의도적으로 세팅할 때만 동작함.
    const bypassKey = process.env.LOADTEST_BYPASS_KEY;
    if (bypassKey && req.header('X-Loadtest-Key') === bypassKey) {
      return next();
    }

    const ip = getClientIp(req);
    const key = `${ip}:${maxRequests}`;
    const now = Date.now();

    const entry = ipMap.get(key);

    if (!entry || now > entry.resetAt) {
      ipMap.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        retryAfter,
      });
      return;
    }

    entry.count++;
    next();
  };
}

// 5,000 DAU 시즌 피크 대비 한도 — 한국 통신사 CGN (carrier NAT) 으로 여러 사용자가
// 같은 외부 IP 공유 가능성 감안하여 IP 기반 한도는 여유 있게.
// 악용 방지는 createUserLimiter (userId 기반) 가 1차로 잡고, IP 한도는 봇/스크래퍼 차단용.

// 일반 요청: 800/min/IP (페이지 로딩 시 동시 10+ API 호출 × 학교/카페 공유 IP × 동시 사용자)
export const generalLimiter = createRateLimiter(800, 60_000);

// Auth 라우트 (광범위): 400/min — /auth/profile 폴링 + 일반 인증 흐름
export const authLimiter = createRateLimiter(400, 60_000);

// 민감 auth (로그인/가입/비번재설정/전화인증): 10/min — 무차별 대입 방어 우선, 변경 X
export const sensitiveAuthLimiter = createRateLimiter(10, 60_000);

// 쓰기 작업 (POST/PUT/DELETE): 300/min/IP
export const writeLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return createRateLimiter(300, 60_000)(req, res, next);
  }
  next();
};

// Strict POST (리뷰/신고/댓글/광고 신청): 30/min/IP (공유 IP 사용자 다수 고려).
// userId 기반 limiter (postCreateLimiter 등) 가 개인 단위 추가 차단.
export const strictWriteLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST') {
    return createRateLimiter(30, 60_000)(req, res, next);
  }
  next();
};

// 인증된 사용자별 rate limit — IP 우회 (VPN/Tor) 시 IP 기반 limiter 가 무력하므로
// userId 기반으로 추가 throttle. createUserLimiter(maxPerWindow, windowMs).
// req.user 가 없으면 (비로그인) 다음 미들웨어로 넘김 — IP 기반 limiter 가 잡음.
const userMap = new Map<string, RateLimitEntry>();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userMap) {
    if (now > entry.resetAt) userMap.delete(key);
  }
}, 60_000);

export function createUserLimiter(maxRequests: number, windowMs: number) {
  return (req: any, res: Response, next: NextFunction): void => {
    const userId: string | undefined = req.user?.id;
    if (!userId) { next(); return; }
    const key = `${userId}:${maxRequests}:${windowMs}`;
    const now = Date.now();
    const entry = userMap.get(key);
    if (!entry || now > entry.resetAt) {
      userMap.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        error: '너무 빠르게 작성하고 있습니다. 잠시 후 다시 시도해주세요.',
        retryAfter,
      });
      return;
    }
    entry.count++;
    next();
  };
}

// 글 작성: 1분에 3건, 1시간에 20건 (스팸 방지). 정상 사용자에겐 충분.
export const postCreateLimiter = createUserLimiter(3, 60_000);
export const postCreateLimiterHourly = createUserLimiter(20, 60 * 60_000);

// 댓글: 1분에 5건, 1시간에 60건.
export const commentCreateLimiter = createUserLimiter(5, 60_000);
export const commentCreateLimiterHourly = createUserLimiter(60, 60 * 60_000);

// 매물 등록 (중고/신상): 1분에 5건, 1시간에 30건 (userId 기준).
// 단일 계정으로 수백 건 자동 도배되는 것을 차단. 정상 판매자에겐 충분한 한도.
export const listingCreateLimiter = createUserLimiter(5, 60_000);
export const listingCreateLimiterHourly = createUserLimiter(30, 60 * 60_000);
