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

// Default: 100 requests per minute per IP
export const generalLimiter = createRateLimiter(100, 60_000);

// Stricter for auth routes: 20 per minute
export const authLimiter = createRateLimiter(20, 60_000);

// Stricter for write operations (POST/PUT/DELETE): 30 per minute
export const writeLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return createRateLimiter(30, 60_000)(req, res, next);
  }
  next();
};
