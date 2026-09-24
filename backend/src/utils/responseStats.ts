// 매장 답장 속도 (2026-09-24) — 매장 연결 채팅방(ChatRoomShop)의 최근 30일 손님 문의에 대해 매장 쪽(사장님·직원)의 첫 답장까지 걸린 시간.
// "문의 묶음" = 손님이 보낸 뒤 매장 쪽 답장이 오기 전까지의 연속 메시지(첫 메시지 시각 기준). 24시간 넘게 답이 없으면 미답장으로 센다.
// 6시간마다 갱신, 관리자 즉시 실행 POST /admin/jobs/response-stats. 묶음 3개 미만이면 표시 안 함 (라벨 null).
import prisma from '../config/database';
import { shopManagerIds } from './shopAccess';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 30 * DAY_MS;

export interface ResponseSummary { label: string | null; medianMinutes: number | null; replyRate: number | null; sampleCount: number }

export function responseLabel(medianMinutes: number | null | undefined, sampleCount: number): string | null {
  if (medianMinutes == null || sampleCount < 3) return null;
  if (medianMinutes <= 10) return '보통 10분 안에 답장';
  if (medianMinutes <= 60) return '보통 1시간 안에 답장';
  if (medianMinutes <= 180) return '보통 3시간 안에 답장';
  if (medianMinutes <= 720) return '보통 반나절 안에 답장';
  if (medianMinutes <= 1440) return '보통 하루 안에 답장';
  return '답장까지 하루 넘게 걸려요';
}

export function summarize(stat: { medianMinutes: number | null; replyRate: number | null; sampleCount: number } | null | undefined): ResponseSummary {
  if (!stat) return { label: null, medianMinutes: null, replyRate: null, sampleCount: 0 };
  const label = responseLabel(stat.medianMinutes, stat.sampleCount);
  return { label, medianMinutes: label ? stat.medianMinutes : null, replyRate: label ? stat.replyRate : null, sampleCount: stat.sampleCount };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export async function updateResponseStats(now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const links = await prisma.chatRoomShop.findMany({ select: { roomId: true, shopType: true, shopId: true, ownerUserId: true, createdAt: true } });
  const byShop = new Map<string, typeof links>();
  for (const l of links) { const k = `${l.shopType}:${l.shopId}`; if (!byShop.has(k)) byShop.set(k, []); byShop.get(k)!.push(l); }
  let updated = 0;
  for (const [, shopLinks] of byShop) {
    const first = shopLinks[0];
    const managers = new Set(await shopManagerIds(first.shopType, first.shopId, first.ownerUserId));
    const deltasMin: number[] = [];
    let unanswered = 0;
    for (const link of shopLinks) {
      const from = link.createdAt > since ? link.createdAt : since;
      const msgs = await prisma.message.findMany({ where: { roomId: link.roomId, createdAt: { gte: from } }, orderBy: { createdAt: 'asc' }, select: { senderId: true, createdAt: true } });
      let pending: Date | null = null;
      for (const m of msgs) {
        if (managers.has(m.senderId)) {
          if (pending) { deltasMin.push(Math.round((m.createdAt.getTime() - pending.getTime()) / 60000)); pending = null; }
        } else if (!pending) {
          pending = m.createdAt;
        }
      }
      if (pending && now.getTime() - pending.getTime() > DAY_MS) unanswered++;
    }
    const sampleCount = deltasMin.length + unanswered;
    const medianMinutes = median(deltasMin);
    const replyRate = sampleCount ? Math.round((deltasMin.filter((d) => d <= 1440).length / sampleCount) * 100) : null;
    await prisma.shopResponseStat.upsert({
      where: { shopType_shopId: { shopType: first.shopType, shopId: first.shopId } },
      create: { shopType: first.shopType, shopId: first.shopId, medianMinutes, replyRate, sampleCount },
      update: { medianMinutes, replyRate, sampleCount },
    });
    updated++;
  }
  return updated;
}

export function startResponseStatScheduler(): void {
  const tick = (): void => { updateResponseStats().catch((e) => console.error('답장 속도 갱신 오류:', e instanceof Error ? e.message : e)); };
  setTimeout(tick, 60_000);
  setInterval(tick, 6 * 60 * 60_000);
}
