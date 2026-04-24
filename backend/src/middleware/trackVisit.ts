import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth';

// 같은 IP가 짧은 시간 안에 여러 번 요청해도 DB 쓰기는 5분당 1회로 제한.
const recentVisits = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000;

// 어떤 path 는 통계에서 제외 (헬스체크, 사이트맵, 정적 파일 등)
function shouldSkip(path: string): boolean {
  return (
    path === '/' ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/banners') || // 너무 자주 폴링됨
    path.startsWith('/api/notifications') ||
    path.startsWith('/sitemap') ||
    path.startsWith('/uploads') ||
    path.startsWith('/api/admin')
  );
}

function getClientIp(req: Request): string {
  const cf = req.header('cf-connecting-ip');
  if (cf) return cf.trim();
  const xReal = req.header('x-real-ip');
  if (xReal) return xReal.trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// KST 기준 YYYY-MM-DD
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function trackVisit(req: AuthRequest, _res: Response, next: NextFunction): void {
  // 응답 차단하지 않고 next 먼저
  next();

  if (shouldSkip(req.path)) return;

  const ip = getClientIp(req);
  if (!ip || ip === 'unknown') return;

  const now = Date.now();
  const last = recentVisits.get(ip);

  if (last && now - last < THROTTLE_MS) {
    // 5분 내 재방문 — pageview 카운트만 증가시키고 DB 한 번만 업데이트
    return;
  }

  recentVisits.set(ip, now);

  // 메모리 누수 방지: 1만 IP 넘으면 cleanup
  if (recentVisits.size > 10_000) {
    const cutoff = now - THROTTLE_MS;
    for (const [k, v] of recentVisits) {
      if (v < cutoff) recentVisits.delete(k);
    }
  }

  const date = todayKST();
  const userId = req.user?.id || null;

  // fire and forget — 실패해도 응답에는 영향 없음
  prisma.dailyVisit
    .upsert({
      where: { ip_date: { ip, date } },
      update: { count: { increment: 1 }, lastSeen: new Date(), userId: userId || undefined },
      create: { ip, date, count: 1, userId },
    })
    .catch((err) => console.warn('trackVisit upsert 실패:', err?.message));
}
