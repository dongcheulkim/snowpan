// 로그인 기록 (IP·기기) — 사기 신고·분쟁 대응용. 기본 90일 뒤 자동 삭제.
import type { Request, Response } from 'express';
import prisma from '../config/database';
import { logAdminAccess, ACCESS_ACTIONS } from './adminAudit';
import type { AuthRequest } from '../middleware/auth';

export const LOGIN_LOG_DAYS = Math.max(1, Number(process.env.LOGIN_LOG_DAYS) || 90);

// 실패해도 로그인은 막지 않는다 (fire-and-forget)
export function recordLogin(req: Request, userId: string, method: 'email' | 'register' | 'kakao' | 'naver' | 'apple'): void {
  const ip = (req.ip || req.socket?.remoteAddress || 'unknown').toString().slice(0, 64);
  const ua = String(req.headers['user-agent'] || '').slice(0, 200) || null;
  prisma.loginLog.create({ data: { userId, ip, userAgent: ua, method } }).catch((e) => console.warn('login log failed:', e instanceof Error ? e.message : e));
}

export async function pruneLoginLogs(): Promise<number> {
  const cutoff = new Date(Date.now() - LOGIN_LOG_DAYS * 24 * 60 * 60 * 1000);
  const r = await prisma.loginLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return r.count;
}

export function startLoginLogPruner(): void {
  pruneLoginLogs().catch(() => {});
  setInterval(() => { pruneLoginLogs().catch(() => {}); }, 24 * 60 * 60 * 1000);
}

// 관리자: 최근 로그인 20건 + 같은 IP 를 쓴 다른 계정 (신고·분쟁 확인용)
export const loginHistoryHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const userId = String(req.params.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) { res.status(400).json({ error: '잘못된 사용자 ID' }); return; }
    logAdminAccess(req, ACCESS_ACTIONS.loginHistory, userId);
    const logins = await prisma.loginLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20, select: { ip: true, userAgent: true, method: true, createdAt: true } });
    const ips = Array.from(new Set(logins.map((l) => l.ip))).filter((ip) => ip && ip !== 'unknown');
    let sameIpAccounts: { id: string; nickname: string | null; email: string; role: string; ip: string; lastAt: Date }[] = [];
    if (ips.length) {
      const rows = await prisma.loginLog.findMany({
        where: { ip: { in: ips }, userId: { not: userId } },
        orderBy: { createdAt: 'desc' },
        distinct: ['userId', 'ip'],
        take: 50,
        select: { userId: true, ip: true, createdAt: true, user: { select: { id: true, nickname: true, email: true, role: true } } },
      });
      sameIpAccounts = rows.map((r) => ({ id: r.user.id, nickname: r.user.nickname, email: r.user.email, role: r.user.role, ip: r.ip, lastAt: r.createdAt }));
    }
    res.json({ retentionDays: LOGIN_LOG_DAYS, logins, sameIpAccounts });
  } catch (e) {
    console.error('login history error:', e);
    res.status(500).json({ error: '로그인 기록 조회 실패' });
  }
};
