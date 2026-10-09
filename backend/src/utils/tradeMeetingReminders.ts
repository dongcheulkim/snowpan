// 거래 약속 자동 알림 (2026-10-09) — 예약 리마인더(reservationReminders)와 같은 10분 주기·창 방식.
//   전날 저녁 19:00~23:59  양쪽: "내일 거래 약속" / 당일 아침 08:00~11:59 양쪽: "오늘 거래 약속"(시간이 지났으면 생략)
//   약속 시간 2시간 뒤(시간 없으면 다음 날 11시 이후)  판매자: "거래 끝났으면 채팅에서 '거래 확정'을 눌러 주세요"
// 발송 기록 컬럼(updateMany where null)으로 중복 방지. 관리자 화면·E2E 는 runTradeMeetingReminders(at) 로 즉시 실행.
import prisma from '../config/database';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from './push';
import { emitToUser } from '../realtime';
import { parseKstDate } from './kst';
import { whenLabel } from '../controllers/tradeMeetingController';

const KST = 9 * 60 * 60 * 1000;
const kstYmd = (d: Date): string => new Date(d.getTime() + KST).toISOString().slice(0, 10);
const kstHour = (d: Date): number => new Date(d.getTime() + KST).getUTCHours();
const kstHm = (d: Date): string => new Date(d.getTime() + KST).toISOString().slice(11, 16);
function addDays(ymd: string, n: number): string { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

function notify(userId: string, title: string, message: string, link: string): void {
  createNotification(userId, 'system', title, message, link).catch(() => {});
  emitToUser(userId, 'new_notification', { type: 'system', title, message, link });
  sendPushToUser(userId, title, message, link).catch(() => {});
}

export interface TradeReminderResult { eve: number; day: number; followUp: number }

type Row = { id: string; roomId: string; sellerId: string; buyerId: string; date: Date; time: string | null; place: string; productId: string };
const rowSelect = { id: true, roomId: true, sellerId: true, buyerId: true, date: true, time: true, place: true, productId: true } as const;

async function remindBoth(rows: Row[], field: 'remindedEveAt' | 'remindedDayAt', dayLabel: '내일' | '오늘', now: Date): Promise<number> {
  let sent = 0;
  const nowHm = kstHm(now);
  for (const r of rows) {
    const claimed = await prisma.tradeMeeting.updateMany({ where: { id: r.id, [field]: null }, data: { [field]: now } });
    if (!claimed.count) continue;
    if (dayLabel === '오늘' && r.time && r.time <= nowHm) continue;
    const p = await prisma.product.findUnique({ where: { id: r.productId }, select: { name: true } });
    const body = `${whenLabel(r.date, r.time, r.place)} · "${p?.name || '매물'}". 변경이 필요하면 채팅으로 알려주세요.`;
    for (const uid of [r.sellerId, r.buyerId]) notify(uid, `${dayLabel} 거래 약속`, body, `/chat/${r.roomId}`);
    sent++;
  }
  return sent;
}

export async function runTradeMeetingReminders(now: Date = new Date()): Promise<TradeReminderResult> {
  const result: TradeReminderResult = { eve: 0, day: 0, followUp: 0 };
  const hour = kstHour(now);
  const today = kstYmd(now);
  const todayStart = parseKstDate(today)!;
  const tomorrowStart = parseKstDate(addDays(today, 1))!;

  if (hour >= 19) {
    const rows = await prisma.tradeMeeting.findMany({ where: { status: 'confirmed', date: tomorrowStart, remindedEveAt: null }, select: rowSelect });
    result.eve = await remindBoth(rows, 'remindedEveAt', '내일', now);
  }
  if (hour >= 8 && hour < 12) {
    const rows = await prisma.tradeMeeting.findMany({ where: { status: 'confirmed', date: todayStart, remindedDayAt: null }, select: rowSelect });
    result.day = await remindBoth(rows, 'remindedDayAt', '오늘', now);
  }
  // 약속 뒤 후속: 오늘 약속 중 시간이 2시간 넘게 지난 것 + 지난 날짜 약속(시간 없으면 다음 날 11시 이후)
  const nowHm = kstHm(now);
  const twoHoursAgo = kstHm(new Date(now.getTime() - 2 * 60 * 60 * 1000));
  const candidates = await prisma.tradeMeeting.findMany({
    where: { status: 'confirmed', followUpAt: null, date: { lte: todayStart } },
    select: { ...rowSelect, status: true },
  });
  for (const r of candidates) {
    const isToday = r.date.getTime() === todayStart.getTime();
    const due = isToday ? (!!r.time && r.time <= twoHoursAgo && nowHm >= r.time) : (!r.time ? hour >= 11 : true);
    if (!due) continue;
    const claimed = await prisma.tradeMeeting.updateMany({ where: { id: r.id, followUpAt: null }, data: { followUpAt: now } });
    if (!claimed.count) continue;
    const p = await prisma.product.findUnique({ where: { id: r.productId }, select: { name: true } });
    notify(r.sellerId, '거래는 잘 끝나셨나요?', `"${p?.name || '매물'}" 거래가 끝났으면 채팅에서 '거래 확정'을, 못 만났으면 '약속 취소'를 눌러 주세요.`, `/chat/${r.roomId}`);
    result.followUp++;
  }
  return result;
}

export function startTradeMeetingReminderScheduler(): void {
  const tick = (): void => { runTradeMeetingReminders().catch((e) => console.error('거래 약속 리마인더 오류:', e instanceof Error ? e.message : e)); };
  setTimeout(tick, 45_000);
  setInterval(tick, 10 * 60_000);
}
