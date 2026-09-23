// 사장님 현황 — 2026-09-23 사용자 요청 "문의·예약·레슨 같은 걸 더 세세하게, 통계·일정".
// 내가 관리하는 매장(사장님 + 직원) 전체의 오늘 할 일, 앞으로 2주 예약 일정, 최근 30일 통계, 매장별 숫자를 한 번에 준다.
import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { displayName } from '../utils/displayName';
import { kstDayStart } from '../utils/kst';
import { staffShopsOf, StaffShopType } from '../utils/shopAccess';

const router = Router();
const KST = 9 * 60 * 60 * 1000;
const LABEL: Record<StaffShopType, string> = { skishop: '스키·보드샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소' };
const PATH: Record<StaffShopType, string> = { skishop: '/skishop', repair: '/repair', rental: '/rental', lesson: '/lesson', accommodation: '/accommodation' };
const kstYmd = (d: Date) => new Date(d.getTime() + KST).toISOString().slice(0, 10);
const parseDetails = (raw: string | null) => { if (!raw) return null; try { const v = JSON.parse(raw); return v && typeof v === 'object' ? v : null; } catch { return null; } };

interface ShopRef { shopType: StaffShopType; shopId: string; name: string; views: number; approved: boolean; staffRole?: 'staff' }

// 내가 사장님인 매장 + 직원으로 붙은 매장 (5종)
async function myShops(userId: string): Promise<ShopRef[]> {
  const staff = await staffShopsOf(userId);
  const idsOf = (t: StaffShopType) => staff.filter((s) => s.shopType === t).map((s) => s.shopId);
  const sel = { id: true, name: true, userId: true, viewCount: true, approved: true } as const;
  const where = (t: StaffShopType) => ({ OR: [{ userId }, { id: { in: idsOf(t) } }] });
  const [a, b, c, d, e] = await Promise.all([
    prisma.skiShop.findMany({ where: where('skishop'), select: sel }),
    prisma.repairShop.findMany({ where: where('repair'), select: sel }),
    prisma.rental.findMany({ where: where('rental'), select: sel }),
    prisma.lesson.findMany({ where: where('lesson'), select: sel }),
    prisma.accommodation.findMany({ where: where('accommodation'), select: sel }),
  ]);
  const out: ShopRef[] = [];
  const push = (t: StaffShopType, rows: { id: string; name: string; userId: string | null; viewCount: number | null; approved: boolean }[]) =>
    rows.forEach((r) => out.push({ shopType: t, shopId: r.id, name: r.name, views: r.viewCount || 0, approved: r.approved, ...(r.userId && r.userId !== userId ? { staffRole: 'staff' as const } : {}) }));
  push('skishop', a); push('repair', b); push('rental', c); push('lesson', d); push('accommodation', e);
  return out;
}

router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const shops = await myShops(me);
    const pairs = shops.map((s) => ({ shopType: s.shopType, shopId: s.shopId }));
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = kstDayStart();
    const until = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    const empty = { todo: { requested: 0, unrepliedReviews: 0, newApplications7d: 0, unreadChats: 0, todayReservations: 0 }, last30d: { requests: 0, confirmed: 0, declined: 0, cancelled: 0, reviews: 0, applications: 0, chats: 0 }, shops: [] as unknown[], schedule: [] as unknown[] };
    if (!pairs.length) { res.json(empty); return; }
    const shopWhere = { OR: pairs };

    const [reservations, reviews, recruits, posts, rooms, unreadRaw] = await Promise.all([
      prisma.reservation.findMany({ where: { ...shopWhere, ownerHidden: false }, include: { customer: { select: { id: true, name: true, nickname: true } } }, orderBy: [{ date: 'asc' }, { time: 'asc' }] }),
      prisma.shopReview.findMany({ where: shopWhere, select: { shopType: true, shopId: true, rating: true, ownerReply: true, createdAt: true } }),
      prisma.shopRecruit.findMany({ where: shopWhere, include: { applications: { select: { createdAt: true } } } }),
      prisma.shopPost.groupBy({ by: ['shopType', 'shopId'], where: shopWhere, _count: { _all: true } }),
      prisma.chatRoom.findMany({ where: { OR: [{ user1Id: me }, { user2Id: me }], status: 'accepted', updatedAt: { gte: since30 } }, select: { id: true } }),
      prisma.$queryRaw<{ cnt: bigint }[]>`
        SELECT COUNT(*) AS cnt FROM "messages" m JOIN "chat_rooms" r ON r.id = m."roomId"
        WHERE (r."user1Id" = ${me} OR r."user2Id" = ${me}) AND m."senderId" <> ${me}
          AND m."createdAt" > COALESCE(CASE WHEN r."user1Id" = ${me} THEN r."user1LastReadAt" ELSE r."user2LastReadAt" END, 'epoch'::timestamptz)`,
    ]);

    const key = (t: string, id: string) => `${t}:${id}`;
    const perShop: Record<string, { requested: number; confirmed: number; total: number; reviews: number; ratingSum: number; unreplied: number; applications: number; posts: number }> = {};
    for (const s of shops) perShop[key(s.shopType, s.shopId)] = { requested: 0, confirmed: 0, total: 0, reviews: 0, ratingSum: 0, unreplied: 0, applications: 0, posts: 0 };
    const last30d = { requests: 0, confirmed: 0, declined: 0, cancelled: 0, reviews: 0, applications: 0, chats: rooms.length };
    let requested = 0, todayReservations = 0;
    const scheduleMap = new Map<string, unknown[]>();
    for (const r of reservations) {
      const k = perShop[key(r.shopType, r.shopId)]; if (k) { k.total++; if (r.status === 'requested') k.requested++; if (r.status === 'confirmed') k.confirmed++; }
      if (r.status === 'requested') requested++;
      if (r.createdAt >= since30) { last30d.requests++; if (r.status === 'confirmed') last30d.confirmed++; if (r.status === 'declined') last30d.declined++; if (r.status === 'cancelled') last30d.cancelled++; }
      if ((r.status === 'requested' || r.status === 'confirmed') && r.date >= todayStart && r.date < until) {
        const ymd = kstYmd(r.date);
        if (ymd === kstYmd(todayStart)) todayReservations++;
        if (!scheduleMap.has(ymd)) scheduleMap.set(ymd, []);
        scheduleMap.get(ymd)!.push({ id: r.id, shopType: r.shopType, shopId: r.shopId, shopName: r.shopName, time: r.time, status: r.status, adults: r.adults, children: r.children, endDate: r.endDate ? kstYmd(r.endDate) : null, details: parseDetails(r.details), note: r.note, customer: r.customer ? displayName(r.customer) : '손님', roomId: r.roomId });
      }
    }
    let unrepliedReviews = 0;
    for (const v of reviews) { const k = perShop[key(v.shopType, v.shopId)]; if (k) { k.reviews++; k.ratingSum += v.rating; if (!v.ownerReply) k.unreplied++; } if (!v.ownerReply) unrepliedReviews++; if (v.createdAt >= since30) last30d.reviews++; }
    let newApplications7d = 0;
    for (const rc of recruits) { const k = perShop[key(rc.shopType, rc.shopId)]; for (const a of rc.applications) { if (k) k.applications++; if (a.createdAt >= since30) last30d.applications++; if (a.createdAt >= since7) newApplications7d++; } }
    for (const p of posts) { const k = perShop[key(p.shopType, p.shopId)]; if (k) k.posts = p._count._all; }
    const unreadChats = Number(unreadRaw[0]?.cnt || 0);

    res.json({
      todo: { requested, unrepliedReviews, newApplications7d, unreadChats, todayReservations },
      last30d,
      shops: shops.map((s) => { const k = perShop[key(s.shopType, s.shopId)]; return { ...s, label: LABEL[s.shopType], path: `${PATH[s.shopType]}/${s.shopId}`, reservations: { requested: k.requested, confirmed: k.confirmed, total: k.total }, reviews: { count: k.reviews, avg: k.reviews ? Math.round((k.ratingSum / k.reviews) * 10) / 10 : 0, unreplied: k.unreplied }, applications: k.applications, posts: k.posts }; }),
      schedule: [...scheduleMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, items]) => ({ date, items })),
    });
  } catch (e) { console.error('Owner summary error:', e); res.status(500).json({ error: '현황을 불러오지 못했어요.' }); }
});

export default router;
