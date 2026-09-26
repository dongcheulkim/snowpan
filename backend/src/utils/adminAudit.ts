// 관리자 개인정보 열람 기록 + 보관 기간 지난 정보 자동 파기 (2026-09-26, 사장님 "대기업처럼" 1·2번).
// - 열람 기록: 탈퇴 회원 원래 신원, 지운 매물 기록, 로그인 기록을 볼 때 누가·언제·무엇을 봤는지 남긴다 (개인정보보호법 안전조치: 접근기록).
// - 자동 파기: 탈퇴 5년 지난 회원의 원래 이름·이메일·전화 삭제, 지운 지 5년 지난 매물 완전 삭제, 열람 기록 2년 지나면 삭제.
import type { Request } from 'express';
import prisma from '../config/database';

export const RETENTION_YEARS = 5;
export const ACCESS_LOG_YEARS = 2;

export const ACCESS_ACTIONS = {
  withdrawnIdentity: 'withdrawn_identity_view',
  deletedProducts: 'deleted_products_view',
  loginHistory: 'login_history_view',
} as const;

export function logAdminAccess(req: Request & { user?: { id: string } }, action: string, targetId?: string | null, detail?: string | null): void {
  const adminId = req.user?.id;
  if (!adminId) return;
  const ip = (req.ip || '').slice(0, 64) || null;
  prisma.adminAccessLog
    .create({ data: { adminId, action, targetId: targetId || null, detail: detail ? detail.slice(0, 200) : null, ip } })
    .catch((e) => console.warn('admin access log failed:', e instanceof Error ? e.message : e));
}

// 목록 화면용 마스킹 — 전체 값은 열람 기록이 남는 단건 조회로만
export const maskName = (n: string | null | undefined): string | null => (n ? n[0] + '*'.repeat(Math.max(1, n.length - 1)) : null);
export const maskEmail = (e: string | null | undefined): string | null => {
  if (!e) return null;
  const [local, domain] = e.split('@');
  if (!domain) return e.slice(0, 2) + '***';
  return `${local.slice(0, 2)}***@${domain}`;
};
export const maskPhone = (p: string | null | undefined): string | null => (p ? p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1****$3') : p || null);

export interface PurgeResult { identities: number; products: number; accessLogs: number; at: string }

function yearsAgo(now: Date, years: number): Date {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d;
}

// 보관 기간 지난 것만 지운다. now 를 넘기면 그 시각 기준(E2E). 결과 건수 반환.
export async function purgeRetention(now: Date = new Date()): Promise<PurgeResult> {
  const identityCutoff = yearsAgo(now, RETENTION_YEARS);
  const logCutoff = yearsAgo(now, ACCESS_LOG_YEARS);
  const identities = await prisma.user.updateMany({
    where: {
      role: 'deleted',
      withdrawnAt: { lt: identityCutoff },
      OR: [{ withdrawnName: { not: null } }, { withdrawnEmail: { not: null } }, { withdrawnPhone: { not: null } }, { withdrawnProviders: { not: null } }],
    },
    data: { withdrawnName: null, withdrawnEmail: null, withdrawnPhone: null, withdrawnProviders: null },
  });
  // 지운 매물: 소프트 삭제 필터를 덮어써서(deletedAt 직접 지정) 5년 지난 행만 완전 삭제
  const products = await prisma.product.deleteMany({ where: { deletedAt: { lt: identityCutoff } } });
  const accessLogs = await prisma.adminAccessLog.deleteMany({ where: { createdAt: { lt: logCutoff } } });
  const result = { identities: identities.count, products: products.count, accessLogs: accessLogs.count, at: now.toISOString() };
  if (result.identities || result.products || result.accessLogs) console.log('보관 기간 만료 파기:', result);
  return result;
}

// 매일 03:30 KST 무렵 한 번 (30분마다 확인)
export function startRetentionScheduler(): void {
  let lastRunDay = '';
  const tick = async () => {
    const kst = new Date(Date.now() + 9 * 3600_000);
    const day = kst.toISOString().slice(0, 10);
    if (kst.getUTCHours() !== 3 || lastRunDay === day) return;
    lastRunDay = day;
    try { await purgeRetention(); } catch (e) { console.warn('보관 기간 파기 실패:', e instanceof Error ? e.message : e); }
  };
  setInterval(tick, 30 * 60 * 1000);
}
