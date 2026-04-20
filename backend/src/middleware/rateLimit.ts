import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitEntry>();

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
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
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

// Default: 500 requests per minute per IP
export const generalLimiter = createRateLimiter(500, 60_000);

// Auth routes: 50 per minute
export const authLimiter = createRateLimiter(50, 60_000);

// Write operations (POST/PUT/DELETE): 200 per minute
export const writeLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return createRateLimiter(200, 60_000)(req, res, next);
  }
  next();
};

// Strict: only apply to POST; abuse-prone endpoints (reviews, reports, comments, ad creation)
// 10 per minute per IP
export const strictWriteLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST') {
    return createRateLimiter(10, 60_000)(req, res, next);
  }
  next();
};
