// 예약 자동 알림 (2026-09-24) — 10분마다 돌며 KST 기준 시간 창 안에서 한 번씩만 보낸다 (예약 행의 발송 기록 컬럼으로 중복 방지).
//   전날 저녁 19:00~23:59  손님: 예약 건별 "내일 예약 안내"  / 매장: 매장별 묶음 "내일 예약 N건" (사장님+직원)
//   당일 아침 08:00~11:59  손님: 건별 "오늘 예약 안내"(시간이 이미 지났으면 생략) / 매장: 묶음 "오늘 예약 N건"
//   방문 다음 날 11:00~19:59  손님: "방문은 어떠셨어요? 리뷰를 남겨주세요" (이미 리뷰를 썼으면 생략), 매장 페이지 리뷰 칸으로 연결
// 확정 직후(2시간 안)엔 확정 알림으로 충분해 손님 리마인더는 생략하고 발송 기록만 남긴다. 창을 시각이 아니라 범위로 둔 건
// 서버가 잠깐 죽었다 살아나도 그 창 안에서는 이어서 보내기 위함. 관리자 화면·E2E 는 runReservationReminders(at) 로 즉시 실행.
import prisma from '../config/database';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from './push';
import { emitToUser } from '../realtime';
import { shopManagerIds, getShopBasic, isStaffShopType } from './shopAccess';
import { parseKstDate } from './kst';

const KST = 9 * 60 * 60 * 1000;
const kstYmd = (d: Date): string => new Date(d.getTime() + KST).toISOString().slice(0, 10);
const kstHour = (d: Date): number => new Date(d.getTime() + KST).getUTCHours();
const kstHm = (d: Date): string => new Date(d.getTime() + KST).toISOString().slice(11, 16);
function addDays(ymd: string, n: number): string { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

const PATH: Record<string, string> = { skishop: '/skishop', repair: '/repair', rental: '/rental', lesson: '/lesson', accommodation: '/accommodation' };
const RECENT_MS = 2 * 60 * 60 * 1000;

function notify(userId: string, title: string, message: string, link: string): void {
  createNotification(userId, 'system', title, message, link).catch(() => {});
  emitToUser(userId, 'new_notification', { type: 'system', title, message, link });
  sendPushToUser(userId, title, message, link).catch(() => {});
}

export interface ReminderRunResult { customerEve: number; ownerEve: number; customerDay: number; ownerDay: number; reviewRequests: number }

type Row = { id: string; shopType: string; shopId: string; shopName: string; ownerId: string; customerId: string; roomId: string | null; time: string | null; respondedAt: Date | null;
  customerRemindedEveAt: Date | null; customerRemindedDayAt: Date | null; ownerRemindedEveAt: Date | null; ownerRemindedDayAt: Date | null };
type OwnerField = 'ownerRemindedEveAt' | 'ownerRemindedDayAt';
type CustomerField = 'customerRemindedEveAt' | 'customerRemindedDayAt';

const customerLink = (r: Row): string => (r.roomId ? `/chat/${r.roomId}` : '/mypage/reservations');

// 손님 건별 리마인더 — 발송 기록을 먼저 잡고(updateMany where null) 잡힌 것만 보낸다
async function remindCustomers(rows: Row[], field: CustomerField, dayLabel: '내일' | '오늘', now: Date): Promise<number> {
  let sent = 0;
  const nowHm = kstHm(now);
  for (const r of rows) {
    if (r[field]) continue;
    const claimed = await prisma.reservation.updateMany({ where: { id: r.id, [field]: null }, data: { [field]: now } });
    if (!claimed.count) continue;
    if (r.respondedAt && now.getTime() - r.respondedAt.getTime() < RECENT_MS) continue; // 방금 확정됨 → 확정 알림으로 충분
    if (dayLabel === '오늘' && r.time && r.time <= nowHm) continue; // 이미 지난 시간
    const when = `${dayLabel}${r.time ? ' ' + r.time : ''}`;
    const tail = dayLabel === '내일' ? '변경이 필요하면 채팅으로 알려주세요.' : '잘 다녀오세요.';
    notify(r.customerId, `${dayLabel} 예약 안내`, `${when} ${r.shopName} 예약이 있어요. ${tail}`, customerLink(r));
    sent++;
  }
  return sent;
}

// 매장 묶음 리마인더 — 매장별 한 번, 사장님+직원 전원에게. 그날 확정 예약 총 건수를 알려준다
async function remindShops(rows: Row[], field: OwnerField, dayLabel: '내일' | '오늘', now: Date, dayStart: Date): Promise<number> {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (r[field]) continue;
    const k = `${r.shopType}:${r.shopId}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  let sent = 0;
  for (const list of groups.values()) {
    const claimed = await prisma.reservation.updateMany({ where: { id: { in: list.map((r) => r.id) }, [field]: null }, data: { [field]: now } });
    if (!claimed.count) continue;
    const first = list[0];
    const total = await prisma.reservation.count({ where: { shopType: first.shopType, shopId: first.shopId, status: 'confirmed', date: dayStart } });
    const extra = claimed.count < total ? ` (새로 확정 ${claimed.count}건)` : '';
    const title = `${dayLabel} 예약 ${total}건`;
    const message = `${first.shopName}: ${dayLabel} 예약 ${total}건이 있어요.${extra} 일정을 확인해 주세요.`;
    for (const id of await shopManagerIds(first.shopType, first.shopId, first.ownerId)) notify(id, title, message, '/mypage/shop-reservations');
    sent++;
  }
  return sent;
}

async function requestReviews(rows: Row[], now: Date): Promise<number> {
  let sent = 0;
  for (const r of rows) {
    const claimed = await prisma.reservation.updateMany({ where: { id: r.id, reviewRequestedAt: null }, data: { reviewRequestedAt: now } });
    if (!claimed.count) continue;
    if (!isStaffShopType(r.shopType) || !PATH[r.shopType]) continue;
    const reviewed = await prisma.shopReview.findUnique({ where: { shopType_shopId_userId: { shopType: r.shopType, shopId: r.shopId, userId: r.customerId } }, select: { id: true } });
    if (reviewed) continue;
    const shop = await getShopBasic(r.shopType, r.shopId);
    if (!shop) continue; // 매장이 지워졌으면 리뷰 칸도 없다
    notify(r.customerId, `${r.shopName} 방문은 어떠셨어요?`, '리뷰를 남기면 다른 분들에게 큰 도움이 돼요.', `${PATH[r.shopType]}/${r.shopId}#reviews`);
    sent++;
  }
  return sent;
}

const rowSelect = { id: true, shopType: true, shopId: true, shopName: true, ownerId: true, customerId: true, roomId: true, time: true, respondedAt: true,
  customerRemindedEveAt: true, customerRemindedDayAt: true, ownerRemindedEveAt: true, ownerRemindedDayAt: true } as const;

export async function runReservationReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const result: ReminderRunResult = { customerEve: 0, ownerEve: 0, customerDay: 0, ownerDay: 0, reviewRequests: 0 };
  const hour = kstHour(now);
  const today = kstYmd(now);
  const todayStart = parseKstDate(today)!;
  const tomorrowStart = parseKstDate(addDays(today, 1))!;
  const yesterdayStart = parseKstDate(addDays(today, -1))!;

  if (hour >= 19) {
    const rows = await prisma.reservation.findMany({ where: { status: 'confirmed', date: tomorrowStart, OR: [{ customerRemindedEveAt: null }, { ownerRemindedEveAt: null }] }, select: rowSelect });
    result.customerEve = await remindCustomers(rows, 'customerRemindedEveAt', '내일', now);
    result.ownerEve = await remindShops(rows, 'ownerRemindedEveAt', '내일', now, tomorrowStart);
  }
  if (hour >= 8 && hour < 12) {
    const rows = await prisma.reservation.findMany({ where: { status: 'confirmed', date: todayStart, OR: [{ customerRemindedDayAt: null }, { ownerRemindedDayAt: null }] }, select: rowSelect });
    result.customerDay = await remindCustomers(rows, 'customerRemindedDayAt', '오늘', now);
    result.ownerDay = await remindShops(rows, 'ownerRemindedDayAt', '오늘', now, todayStart);
  }
  if (hour >= 11 && hour < 20) {
    const rows = await prisma.reservation.findMany({ where: { status: 'confirmed', reviewRequestedAt: null, OR: [{ endDate: yesterdayStart }, { endDate: null, date: yesterdayStart }] }, select: rowSelect });
    result.reviewRequests = await requestReviews(rows, now);
  }
  return result;
}

export function startReservationReminderScheduler(): void {
  const tick = (): void => { runReservationReminders().catch((e) => console.error('예약 리마인더 오류:', e instanceof Error ? e.message : e)); };
  setTimeout(tick, 30_000);
  setInterval(tick, 10 * 60_000);
}
