// 스키장 개장 알림 (2026-10-05) — 신청자에게 ① 개장일이 정해졌을 때 ② 개장 전날 저녁에 알림(앱 푸시 포함).
// 꼭 필요한 알림만 보낸다는 약속에 맞게, 본인이 "알림 받기"를 누른 스키장에 대해서만 보낸다.
import prisma from '../config/database';
import { createNotification } from '../controllers/notificationController';

function kstYmd(d: Date): string { return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10); }
function mdLabel(d: Date): string { const k = new Date(d.getTime() + 9 * 3600_000); return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`; }

// 관리자가 개장일을 넣거나 바꿨을 때
export async function notifyOpenDateSet(resort: { id: string; name: string; openDate: Date | null }): Promise<number> {
  if (!resort.openDate) return 0;
  if (kstYmd(resort.openDate) < kstYmd(new Date())) return 0; // 지난 날짜면 알리지 않음
  const subs = await prisma.resortOpenAlert.findMany({ where: { resortId: resort.id }, select: { id: true, userId: true } });
  const link = `/resort/${encodeURIComponent(resort.name)}`;
  for (const s of subs) await createNotification(s.userId, 'system', `${resort.name} 개장일이 정해졌어요`, `${mdLabel(resort.openDate)}에 문을 열어요. 개장 전날 한 번 더 알려드릴게요.`, link).catch(() => {});
  if (subs.length) await prisma.resortOpenAlert.updateMany({ where: { resortId: resort.id }, data: { notifiedDate: true, notifiedEve: false } });
  return subs.length;
}

// 하루 한 번(저녁): 내일 개장하는 스키장 신청자에게 알리고, 개장일이 지난 신청은 정리
export async function runOpenAlertDaily(now = new Date()): Promise<{ eve: number; cleaned: number }> {
  const today = kstYmd(now); const tomorrow = kstYmd(new Date(now.getTime() + 24 * 3600_000));
  const resorts = await prisma.skiResort.findMany({ where: { openDate: { not: null } }, select: { id: true, name: true, openDate: true } });
  let eve = 0; let cleaned = 0;
  for (const r of resorts) {
    const day = kstYmd(r.openDate as Date);
    if (day === tomorrow) {
      const subs = await prisma.resortOpenAlert.findMany({ where: { resortId: r.id, notifiedEve: false }, select: { id: true, userId: true } });
      for (const s of subs) await createNotification(s.userId, 'system', `내일 ${r.name} 개장`, `${mdLabel(r.openDate as Date)} 개장이에요. 웹캠과 근처 매장을 미리 확인해 보세요.`, `/resort/${encodeURIComponent(r.name)}`).catch(() => {});
      if (subs.length) await prisma.resortOpenAlert.updateMany({ where: { id: { in: subs.map((s) => s.id) } }, data: { notifiedEve: true } });
      eve += subs.length;
    } else if (day < today) {
      // 개장일 이전에 신청한 것만 정리 — 개장 뒤에 다음 시즌용으로 새로 신청한 것은 남긴다
      const del = await prisma.resortOpenAlert.deleteMany({ where: { resortId: r.id, createdAt: { lt: r.openDate as Date } } }); cleaned += del.count;
    }
  }
  return { eve, cleaned };
}

export function startOpenAlertScheduler(): void {
  let lastRunDay = '';
  const tick = async () => {
    const kst = new Date(Date.now() + 9 * 3600_000); const day = kst.toISOString().slice(0, 10);
    if (kst.getUTCHours() !== 18 || lastRunDay === day) return; // 매일 18시(KST)
    lastRunDay = day;
    try { const r = await runOpenAlertDaily(); if (r.eve || r.cleaned) console.log(`[openAlert] 전날 알림 ${r.eve}건, 정리 ${r.cleaned}건`); } catch (e) { console.warn('[openAlert] 실패:', e instanceof Error ? e.message : e); }
  };
  setInterval(tick, 20 * 60 * 1000);
}
