// 방문 예약 (2026-09-17) — 결제 없는 예약 요청. 손님이 매장(렌탈·스키샵·정비샵·레슨·숙소)에 방문일·인원을 보내면
// 두 사람의 채팅방에 예약 카드(type 'reservation')가 올라가고, 사장님이 그 방에서 확정·거절한다.
// 카드 메시지는 여기서만 만든다 — 소켓 send_message 는 text/image 만 받으므로 클라이언트가 위조할 수 없다.
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { isBlockedEither, BLOCKED_CHAT_MESSAGE } from '../utils/blocks';
import { displayName } from '../utils/displayName';
import { parseKstDate, kstDayStart } from '../utils/kst';
import { sanitizeText } from '../utils/sanitize';
import { createNotification } from './notificationController';
import { sendPushToUser } from '../utils/push';
import { linkRoomToShop } from '../utils/chatRoomShops';
import { alertUser } from '../utils/ownerAlerts';
import { emitToRoom, emitToUser } from '../realtime';
import { isShopStaff, staffShopsOf, shopManagerIds } from '../utils/shopAccess';

const SHOP_TYPES = ['rental', 'skishop', 'repair', 'lesson', 'accommodation'] as const; // 정비샵은 2026-09-22 추가 (사용자 요청)
type ShopType = (typeof SHOP_TYPES)[number];
const STATUSES = ['requested', 'confirmed', 'declined', 'cancelled'] as const;
type ReservationStatus = (typeof STATUSES)[number];
type ReservationEvent = ReservationStatus;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const NOTE_MAX = 300;
const OWNER_MESSAGE_MAX = 200;
const DETAILS_MAX = 1000;

const NOT_ACCEPTING = '이 매장은 아직 예약을 받지 않아요';

// ───────── KST 날짜 표기 ─────────
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
function kstYmd(d: Date): string {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  const mm = String(k.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(k.getUTCDate()).padStart(2, '0');
  return `${k.getUTCFullYear()}-${mm}-${dd}`;
}
function kstMd(d: Date): string {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()}`;
}
// 'M/D' 또는 'M/D ~ M/D'
function dateLabel(date: Date, endDate: Date | null): string {
  return endDate ? `${kstMd(date)} ~ ${kstMd(endDate)}` : kstMd(date);
}
// 알림 본문 앞부분: "매장명 · 12/20 14:00"
function whenLabel(shopName: string, date: Date, endDate: Date | null, time: string | null): string {
  return `${shopName} · ${dateLabel(date, endDate)}${time ? ' ' + time : ''}`;
}

// ───────── 업종별 추가 항목(details) 화이트리스트 ─────────
// 알 수 없는 키는 조용히 버린다. 문자열 ≤ 40자, 정수 0~99, options 는 문자열 배열(≤ 5개, 각 ≤ 20자).
const DETAIL_STRING_KEYS = ['level', 'purpose', 'lessonType', 'equipment'] as const; // equipment: 정비샵 장비 종류
const DETAIL_INT_KEYS = ['ski', 'board', 'rooms', 'qty'] as const;                    // qty: 정비샵 맡길 장비 수 (정비 항목은 options 재사용)
type Details = Record<string, string | number | string[]>;

function pickDetails(input: unknown): { details: Details | null; error?: string } {
  if (input === undefined || input === null || input === '') return { details: null };
  if (typeof input !== 'object' || Array.isArray(input)) return { details: null, error: '추가 항목 형식이 올바르지 않아요' };
  const src = input as Record<string, unknown>;
  const out: Details = {};
  for (const key of DETAIL_STRING_KEYS) {
    const v = src[key];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string') return { details: null, error: '추가 항목 형식이 올바르지 않아요' };
    const s = sanitizeText(v, 40);
    if (s) out[key] = s;
  }
  for (const key of DETAIL_INT_KEYS) {
    const v = src[key];
    if (v === undefined || v === null || v === '') continue;
    const n = typeof v === 'string' && /^\d{1,2}$/.test(v.trim()) ? Number(v.trim()) : v;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 99) return { details: null, error: '추가 항목 수량은 0~99 사이여야 해요' };
    out[key] = n;
  }
  if (src.options !== undefined && src.options !== null) {
    if (!Array.isArray(src.options)) return { details: null, error: '옵션 형식이 올바르지 않아요' };
    if (src.options.length > 5) return { details: null, error: '옵션은 5개까지 고를 수 있어요' };
    const opts: string[] = [];
    for (const o of src.options) {
      if (typeof o !== 'string') return { details: null, error: '옵션 형식이 올바르지 않아요' };
      if (o.length > 20) return { details: null, error: '옵션은 20자까지 적을 수 있어요' };
      const s = sanitizeText(o, 20);
      if (s) opts.push(s);
    }
    if (opts.length) out.options = opts;
  }
  if (!Object.keys(out).length) return { details: null };
  if (JSON.stringify(out).length > DETAILS_MAX) return { details: null, error: '추가 항목이 너무 길어요' };
  return { details: out };
}

function parseDetails(raw: string | null): Details | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Details) : null;
  } catch {
    return null;
  }
}

// ───────── 매장 조회: 승인됐고 사장님이 직접 관리하는 매장만 예약을 받는다 ─────────
interface ManagedShop { id: string; name: string; ownerId: string; phone: string | null }

async function findManagedShop(shopType: ShopType, shopId: string): Promise<{ shop: ManagedShop | null; exists: boolean }> {
  const select = { id: true, name: true, userId: true, approved: true } as const;
  let row: { id: string; name: string; userId: string | null; approved: boolean; claimable?: boolean; phone?: string | null } | null = null;
  if (shopType === 'rental') row = await prisma.rental.findUnique({ where: { id: shopId }, select: { ...select, claimable: true, phone: true } });
  else if (shopType === 'skishop') row = await prisma.skiShop.findUnique({ where: { id: shopId }, select: { ...select, claimable: true, phone: true } });
  else if (shopType === 'repair') row = await prisma.repairShop.findUnique({ where: { id: shopId }, select: { ...select, claimable: true, phone: true } });
  else if (shopType === 'lesson') row = await prisma.lesson.findUnique({ where: { id: shopId }, select: { ...select, phone: true } });
  else if (shopType === 'accommodation') row = await prisma.accommodation.findUnique({ where: { id: shopId }, select });
  if (!row) return { shop: null, exists: false };
  // 관리자 시딩(claimable) 매장은 아직 사장님이 없으니 예약을 받을 수 없다
  if (!row.approved || !row.userId || row.claimable === true) return { shop: null, exists: true };
  return { shop: { id: row.id, name: row.name, ownerId: row.userId, phone: row.phone || null }, exists: true };
}

// ───────── 채팅방: 두 사람의 유일한 방을 찾거나 만든다 (예약은 거래 성격이라 항상 대화 가능 상태) ─────────
async function getOrCreateRoom(userA: string, userB: string): Promise<{ id: string }> {
  const [u1, u2] = [userA, userB].sort();
  const room = await prisma.chatRoom.upsert({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    create: { user1Id: u1, user2Id: u2 },
    update: {},
    select: { id: true, status: true },
  });
  if (room.status !== 'accepted') {
    // 채팅 요청 대기/거절 방이어도 예약 요청은 매물 문의처럼 성사시킨다 — 사장님이 예약 카드로 답해야 하므로
    await prisma.chatRoom.update({ where: { id: room.id }, data: { status: 'accepted', requestedBy: null } });
  }
  return { id: room.id };
}

// ───────── 카드 메시지 ─────────
interface ReservationRow {
  id: string; shopType: string; shopId: string; shopName: string; ownerId: string; customerId: string; roomId: string | null;
  date: Date; endDate: Date | null; time: string | null; adults: number; children: number; details: string | null; note: string | null;
  status: string; ownerMessage: string | null; respondedAt: Date | null; createdAt: Date; updatedAt: Date;
}

// content(JSON) 스키마 — 프론트가 채팅방에서 예약 카드로 그린다
function cardContent(r: ReservationRow, event: ReservationEvent, extra: { message?: string | null; by?: 'customer' | 'owner' } = {}): string {
  return JSON.stringify({
    reservationId: r.id,
    event,
    shopType: r.shopType,
    shopId: r.shopId,
    shopName: r.shopName,
    date: kstYmd(r.date),
    endDate: r.endDate ? kstYmd(r.endDate) : null,
    time: r.time,
    adults: r.adults,
    children: r.children,
    details: parseDetails(r.details),
    note: r.note,
    message: extra.message ?? null,
    by: extra.by ?? null,
  });
}

async function sendCard(roomId: string, senderId: string, content: string): Promise<void> {
  const message = await prisma.message.create({
    data: { roomId, senderId, content, type: 'reservation' },
    include: { sender: { select: { id: true, name: true, nickname: true, profileImage: true } } },
  });
  await prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
  // 소켓 핸들러의 new_message 와 같은 모양 — 실명 대신 표시명
  emitToRoom(roomId, 'new_message', { ...message, sender: { ...message.sender, name: displayName(message.sender) } });
}

// 알림 + 포그라운드 소켓 + 푸시 (실패해도 응답을 막지 않음)
function notify(userId: string, title: string, message: string, link: string): void {
  createNotification(userId, 'chat', title, message, link).catch(() => {});
  emitToUser(userId, 'new_notification', { type: 'chat', title, message, link });
  sendPushToUser(userId, title, message, link).catch(() => {});
}

async function nameOf(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } });
  return u ? displayName(u) : '스노우판 회원';
}

// ───────── 응답 직렬화 — 이메일·전화 등 개인정보 없음, 날짜는 KST 'YYYY-MM-DD' ─────────
function serialize(r: ReservationRow) {
  return {
    id: r.id,
    shopType: r.shopType,
    shopId: r.shopId,
    shopName: r.shopName,
    date: kstYmd(r.date),
    endDate: r.endDate ? kstYmd(r.endDate) : null,
    time: r.time,
    adults: r.adults,
    children: r.children,
    details: parseDetails(r.details),
    note: r.note,
    status: r.status,
    ownerMessage: r.ownerMessage,
    roomId: r.roomId,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
  };
}

const publicUser = { id: true, name: true, nickname: true, profileImage: true } as const;
type PublicUser = { id: string; name: string; nickname: string | null; profileImage: string | null };
function serializeUser(u: PublicUser) {
  return { id: u.id, name: displayName(u), profileImage: u.profileImage };
}

// 정수 0~99 (문자열 숫자 허용)
function parseCount(v: unknown, fallback: number): number | null {
  if (v === undefined || v === null || v === '') return fallback;
  const n = typeof v === 'string' ? Number(v.trim()) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 99) return null;
  return n;
}

// ═════════ POST /reservations ═════════
export const createReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customerId = req.user!.id;
    const b = req.body || {};

    const shopType = String(b.shopType || '') as ShopType;
    if (!SHOP_TYPES.includes(shopType)) { res.status(400).json({ error: '예약할 수 있는 매장 종류가 아니에요' }); return; }
    const shopId = typeof b.shopId === 'string' ? b.shopId : '';
    if (!UUID_RE.test(shopId)) { res.status(400).json({ error: '매장 정보가 올바르지 않아요' }); return; }

    const { shop, exists } = await findManagedShop(shopType, shopId);
    if (!exists) { res.status(404).json({ error: '매장을 찾을 수 없어요' }); return; }
    if (!shop) { res.status(400).json({ error: NOT_ACCEPTING }); return; }
    if (shop.ownerId === customerId || (await isShopStaff(customerId, shopType, shop.id))) { res.status(400).json({ error: '내 매장에는 예약을 보낼 수 없어요' }); return; }

    const owner = await prisma.user.findUnique({ where: { id: shop.ownerId }, select: { id: true, role: true } });
    if (!owner || owner.role === 'deleted' || owner.role === 'banned') { res.status(400).json({ error: NOT_ACCEPTING }); return; }

    // 날짜: 'YYYY-MM-DD' (KST 자정), 오늘 이후
    const date = typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? parseKstDate(b.date) : null;
    if (!date) { res.status(400).json({ error: '방문일을 선택해 주세요' }); return; }
    if (date < kstDayStart()) { res.status(400).json({ error: '지난 날짜에는 예약할 수 없어요' }); return; }
    let endDate: Date | null = null;
    if (b.endDate !== undefined && b.endDate !== null && b.endDate !== '') {
      endDate = typeof b.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.endDate) ? parseKstDate(b.endDate) : null;
      if (!endDate) { res.status(400).json({ error: '종료일 형식이 올바르지 않아요' }); return; }
      if (endDate < date) { res.status(400).json({ error: '종료일은 방문일 이후여야 해요' }); return; }
    }
    let time: string | null = null;
    if (b.time !== undefined && b.time !== null && b.time !== '') {
      if (typeof b.time !== 'string' || !TIME_RE.test(b.time)) { res.status(400).json({ error: '방문 시각은 HH:mm 형식으로 적어 주세요' }); return; }
      time = b.time;
    }

    const adults = parseCount(b.adults, 1);
    const children = parseCount(b.children, 0);
    if (adults === null || children === null) { res.status(400).json({ error: '인원은 0~99명 사이로 적어 주세요' }); return; }
    if (adults + children < 1) { res.status(400).json({ error: '인원을 1명 이상 적어 주세요' }); return; }

    let note: string | null = null;
    if (b.note !== undefined && b.note !== null && b.note !== '') {
      if (typeof b.note !== 'string') { res.status(400).json({ error: '요청사항 형식이 올바르지 않아요' }); return; }
      if (b.note.length > NOTE_MAX) { res.status(400).json({ error: `요청사항은 ${NOTE_MAX}자까지 적을 수 있어요` }); return; }
      note = sanitizeText(b.note, NOTE_MAX) || null;
    }

    const picked = pickDetails(b.details);
    if (picked.error) { res.status(400).json({ error: picked.error }); return; }
    const details = picked.details ? JSON.stringify(picked.details) : null;

    // 차단 관계면 어느 방향이든 예약 불가 (방향은 노출하지 않음)
    if (await isBlockedEither(customerId, shop.ownerId)) { res.status(403).json({ error: BLOCKED_CHAT_MESSAGE }); return; }

    const room = await getOrCreateRoom(customerId, shop.ownerId);
    await linkRoomToShop(room.id, shopType, shop.id, shop.name, shop.ownerId); // 직원도 이 방을 보고 답할 수 있게 매장에 연결
    const reservation = await prisma.reservation.create({
      data: {
        shopType, shopId: shop.id, shopName: shop.name, ownerId: shop.ownerId, customerId, roomId: room.id,
        date, endDate, time, adults, children, details, note, status: 'requested',
      },
    });

    await sendCard(room.id, customerId, cardContent(reservation, 'requested'));

    const customerName = await nameOf(customerId);
    const body = `${whenLabel(shop.name, date, endDate, time)} · 성인 ${adults}${children ? `, 아동 ${children}` : ''}`;
    for (const mid of await shopManagerIds(shopType, shop.id, shop.ownerId)) notify(mid, `${customerName}님의 예약 요청`, body, `/chat/${room.id}`); // 사장님 + 직원
    // 앱이 없는 사장님도 놓치지 않게 문자·메일 (알림 번호 → 매장 전화 → 계정 번호 순)
    alertUser(shop.ownerId, { kind: 'reservation_request', title: `${customerName}님의 예약 요청`, text: `${body}\n채팅에서 확정하거나 거절해 주세요.`, link: `/chat/${room.id}`, fallbackPhone: shop.phone }).catch(() => {});

    res.status(201).json({ reservation: serialize(reservation), roomId: room.id });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: '예약 요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요' });
  }
};

// ═════════ GET /reservations/mine ═════════
export const getMyReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    if (status && !STATUSES.includes(status as ReservationStatus)) { res.status(400).json({ error: '상태 값이 올바르지 않아요' }); return; }
    const rows = await prisma.reservation.findMany({
      where: { customerId: req.user!.id, customerHidden: false, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ items: rows.map(serialize) });
  } catch (error) {
    console.error('Get my reservations error:', error);
    res.status(500).json({ error: '예약 목록을 불러오지 못했어요' });
  }
};

// ═════════ GET /reservations/shop — 내가 사장님인 매장에 들어온 예약 ═════════
const STATUS_ORDER: Record<string, number> = { requested: 0, confirmed: 1, declined: 2, cancelled: 3 };

export const getShopReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const shopType = typeof req.query.shopType === 'string' ? req.query.shopType : '';
    if (status && !STATUSES.includes(status as ReservationStatus)) { res.status(400).json({ error: '상태 값이 올바르지 않아요' }); return; }
    if (shopType && !SHOP_TYPES.includes(shopType as ShopType)) { res.status(400).json({ error: '매장 종류가 올바르지 않아요' }); return; }
    const rows = await prisma.reservation.findMany({
      where: { OR: [{ ownerId: req.user!.id }, ...(await staffShopsOf(req.user!.id)).map((s) => ({ shopType: s.shopType, shopId: s.shopId }))], ownerHidden: false, ...(status ? { status } : {}), ...(shopType ? { shopType } : {}) }, // 내 매장 + 직원으로 관리하는 매장
      include: { customer: { select: publicUser } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      take: 300,
    });
    // 요청 대기 먼저, 그 다음 방문일 순
    rows.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.date.getTime() - b.date.getTime());
    res.json({ items: rows.map((r) => ({ ...serialize(r), customer: serializeUser(r.customer) })) });
  } catch (error) {
    console.error('Get shop reservations error:', error);
    res.status(500).json({ error: '예약 목록을 불러오지 못했어요' });
  }
};

// ═════════ GET /reservations/:id — 당사자(손님·사장님) 또는 관리자 ═════════
export const getReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await prisma.reservation.findUnique({
      where: { id: String(req.params.id) },
      include: { customer: { select: publicUser }, owner: { select: publicUser } },
    });
    const me = req.user!;
    if (!r || (r.customerId !== me.id && r.ownerId !== me.id && me.role !== 'admin' && !(await isShopStaff(me.id, r.shopType, r.shopId)))) { res.status(404).json({ error: '예약을 찾을 수 없어요' }); return; }
    // viewerRole — 채팅 카드 버튼 결정용 (직원·관리자도 매장 쪽)
    res.json({ ...serialize(r), customer: serializeUser(r.customer), owner: serializeUser(r.owner), viewerRole: r.customerId === me.id ? 'customer' : 'shop' });
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ error: '예약을 불러오지 못했어요' });
  }
};

// 당사자 확인 — 남의 예약은 존재 여부를 숨긴다(404)
async function loadForParticipant(req: AuthRequest, res: Response): Promise<ReservationRow | null> {
  const r = await prisma.reservation.findUnique({ where: { id: String(req.params.id) } });
  const me = req.user!.id;
  if (!r || (r.customerId !== me && r.ownerId !== me && !(await isShopStaff(me, r.shopType, r.shopId)))) { res.status(404).json({ error: '예약을 찾을 수 없어요' }); return null; }
  return r;
}

// ═════════ PUT /reservations/:id/confirm — 사장님 확정 ═════════
export const confirmReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await loadForParticipant(req, res);
    if (!r) return;
    if (r.ownerId !== req.user!.id && !(await isShopStaff(req.user!.id, r.shopType, r.shopId))) { res.status(403).json({ error: '매장 사장님이나 직원만 확정할 수 있어요' }); return; }
    if (r.status !== 'requested') { res.status(400).json({ error: '이미 답한 예약이에요' }); return; }
    const raw = req.body?.message;
    if (raw !== undefined && raw !== null && typeof raw !== 'string') { res.status(400).json({ error: '메시지 형식이 올바르지 않아요' }); return; }
    if (typeof raw === 'string' && raw.length > OWNER_MESSAGE_MAX) { res.status(400).json({ error: `메시지는 ${OWNER_MESSAGE_MAX}자까지 적을 수 있어요` }); return; }
    const message = sanitizeText(raw, OWNER_MESSAGE_MAX) || null;

    // 원자적 상태 전이 — 확정/거절 동시 탭 레이스 차단
    const now = new Date();
    const upd = await prisma.reservation.updateMany({ where: { id: r.id, status: 'requested' }, data: { status: 'confirmed', ownerMessage: message, respondedAt: now } });
    if (upd.count === 0) { res.status(409).json({ error: '이미 처리된 예약이에요' }); return; }
    const updated = { ...r, status: 'confirmed', ownerMessage: message, respondedAt: now };

    const room = r.roomId ? { id: r.roomId } : await getOrCreateRoom(r.customerId, r.ownerId);
    if (!r.roomId) await prisma.reservation.update({ where: { id: r.id }, data: { roomId: room.id } });
    await sendCard(room.id, r.ownerId, cardContent(updated, 'confirmed', { message }));

    const body = `${whenLabel(r.shopName, r.date, r.endDate, r.time)}${message ? ` · ${message}` : ''}`;
    notify(r.customerId, '예약이 확정됐어요', body, `/chat/${room.id}`);
    alertUser(r.customerId, { kind: 'reservation_result', title: '예약이 확정됐어요', text: body, link: `/chat/${room.id}` }).catch(() => {});

    res.json({ reservation: serialize({ ...updated, roomId: room.id }) });
  } catch (error) {
    console.error('Confirm reservation error:', error);
    res.status(500).json({ error: '예약을 확정하지 못했어요' });
  }
};

// ═════════ PUT /reservations/:id/decline — 사장님 거절 ═════════
export const declineReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await loadForParticipant(req, res);
    if (!r) return;
    if (r.ownerId !== req.user!.id && !(await isShopStaff(req.user!.id, r.shopType, r.shopId))) { res.status(403).json({ error: '매장 사장님이나 직원만 답할 수 있어요' }); return; }
    if (r.status !== 'requested') { res.status(400).json({ error: '이미 답한 예약이에요' }); return; }
    const raw = req.body?.reason;
    if (raw !== undefined && raw !== null && typeof raw !== 'string') { res.status(400).json({ error: '사유 형식이 올바르지 않아요' }); return; }
    if (typeof raw === 'string' && raw.length > OWNER_MESSAGE_MAX) { res.status(400).json({ error: `사유는 ${OWNER_MESSAGE_MAX}자까지 적을 수 있어요` }); return; }
    const reason = sanitizeText(raw, OWNER_MESSAGE_MAX) || null;

    const now = new Date();
    const upd = await prisma.reservation.updateMany({ where: { id: r.id, status: 'requested' }, data: { status: 'declined', ownerMessage: reason, respondedAt: now } });
    if (upd.count === 0) { res.status(409).json({ error: '이미 처리된 예약이에요' }); return; }
    const updated = { ...r, status: 'declined', ownerMessage: reason, respondedAt: now };

    const room = r.roomId ? { id: r.roomId } : await getOrCreateRoom(r.customerId, r.ownerId);
    if (!r.roomId) await prisma.reservation.update({ where: { id: r.id }, data: { roomId: room.id } });
    await sendCard(room.id, r.ownerId, cardContent(updated, 'declined', { message: reason }));

    const body = `${whenLabel(r.shopName, r.date, r.endDate, r.time)}${reason ? ` · ${reason}` : ''}`;
    notify(r.customerId, '예약이 어려워요', body, `/chat/${room.id}`);
    alertUser(r.customerId, { kind: 'reservation_result', title: '예약이 어려워요', text: body, link: `/chat/${room.id}` }).catch(() => {});

    res.json({ reservation: serialize({ ...updated, roomId: room.id }) });
  } catch (error) {
    console.error('Decline reservation error:', error);
    res.status(500).json({ error: '예약 답변을 보내지 못했어요' });
  }
};

// ═════════ PUT /reservations/:id/cancel — 손님(요청·확정 상태) 또는 사장님(확정 상태) ═════════
export const cancelReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await loadForParticipant(req, res);
    if (!r) return;
    const me = req.user!.id;
    const isCustomer = r.customerId === me;
    const allowedFrom: string[] = isCustomer ? ['requested', 'confirmed'] : ['confirmed'];
    if (!allowedFrom.includes(r.status)) {
      const why = r.status === 'cancelled' ? '이미 취소된 예약이에요'
        : r.status === 'declined' ? '이미 거절된 예약이에요'
        : isCustomer ? '취소할 수 없는 예약이에요' : '아직 답하지 않은 예약은 거절로 답해 주세요';
      res.status(400).json({ error: why });
      return;
    }

    const now = new Date();
    const upd = await prisma.reservation.updateMany({ where: { id: r.id, status: { in: allowedFrom } }, data: { status: 'cancelled', respondedAt: now } });
    if (upd.count === 0) { res.status(409).json({ error: '이미 처리된 예약이에요' }); return; }
    const updated = { ...r, status: 'cancelled', respondedAt: now };

    const room = r.roomId ? { id: r.roomId } : await getOrCreateRoom(r.customerId, r.ownerId);
    if (!r.roomId) await prisma.reservation.update({ where: { id: r.id }, data: { roomId: room.id } });
    await sendCard(room.id, isCustomer ? me : r.ownerId, cardContent(updated, 'cancelled', { by: isCustomer ? 'customer' : 'owner' })); // 직원이 취소해도 카드는 사장님 명의로

    const otherId = isCustomer ? r.ownerId : r.customerId;
    const myName = await nameOf(me);
    const body = `${whenLabel(r.shopName, r.date, r.endDate, r.time)} · ${myName}님이 취소했어요`;
    notify(otherId, '예약이 취소됐어요', body, `/chat/${room.id}`);
    alertUser(otherId, { kind: 'reservation_result', title: '예약이 취소됐어요', text: body, link: `/chat/${room.id}` }).catch(() => {});

    res.json({ reservation: serialize({ ...updated, roomId: room.id }) });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ error: '예약을 취소하지 못했어요' });
  }
};

// 끝난 예약 기록 정리 — 손님·사장님 각자 자기 목록에서만 사라진다(상대 쪽 기록·채팅 카드는 유지). 사용자 요청 2026-09-22
// 끝난 예약 = 거절·취소, 또는 확정됐지만 이용일(숙소는 체크아웃일)이 지난 것. 요청 대기·다가오는 확정 예약은 지울 수 없다.
export const hideReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await prisma.reservation.findUnique({ where: { id: String(req.params.id) } });
    if (!r) { res.status(404).json({ error: '예약을 찾을 수 없어요.' }); return; }
    const uid = req.user!.id;
    const isCustomer = r.customerId === uid;
    const isOwner = r.ownerId === uid || (await isShopStaff(uid, r.shopType, r.shopId));
    if (!isCustomer && !isOwner) { res.status(403).json({ error: '내 예약만 정리할 수 있어요.' }); return; }
    const lastDay = (r.endDate || r.date).getTime() + 24 * 60 * 60 * 1000;
    const finished = r.status === 'declined' || r.status === 'cancelled' || (r.status === 'confirmed' && lastDay < Date.now());
    if (!finished) { res.status(400).json({ error: '진행 중인 예약은 지울 수 없어요. 취소하거나 이용이 끝난 뒤 정리해 주세요.' }); return; }
    await prisma.reservation.update({ where: { id: r.id }, data: isCustomer ? { customerHidden: true } : { ownerHidden: true } });
    res.json({ message: '예약 기록을 지웠어요.' });
  } catch (error) {
    console.error('Hide reservation error:', error);
    res.status(500).json({ error: '정리 중 오류가 발생했어요.' });
  }
};
