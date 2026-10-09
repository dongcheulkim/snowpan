// 중고 거래 약속 (2026-10-09) — 결제 없음. 매물 채팅방에서 판매자·구매자 어느 쪽이든 날짜·시간·장소를 제안하고,
// 상대가 수락하면 확정되면서 매물이 자동으로 '예약중'이 된다. 판매자가 '거래 확정'을 누르면 '판매완료'(구매자 지정),
// 누구든 '약속 취소'를 누르면 매물이 '판매중'으로 돌아온다(약속이 깨지는 경우 대비 — 사장님 요청).
// 카드 메시지(type 'trade_meeting')는 여기서만 만든다 — 소켓 send_message 는 text/image 만 받으므로 클라이언트가 위조할 수 없다.
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { isBlockedEither, BLOCKED_CHAT_MESSAGE } from '../utils/blocks';
import { displayName } from '../utils/displayName';
import { parseKstDate, kstDayStart } from '../utils/kst';
import { sanitizeText } from '../utils/sanitize';
import { cacheDelPrefix } from '../utils/cache';
import { createNotification } from './notificationController';
import { sendPushToUser } from '../utils/push';
import { emitToRoom, emitToUser } from '../realtime';

const STATUSES = ['proposed', 'confirmed', 'done', 'cancelled', 'declined'] as const;
type Status = (typeof STATUSES)[number];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PLACE_MAX = 60;
const NOTE_MAX = 200;
const REASON_MAX = 200;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
function kstYmd(d: Date): string {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')}`;
}
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
// "10/12(토) 14:00 · 곤지암리조트 정문"
export function whenLabel(date: Date, time: string | null, place: string): string {
  const k = new Date(date.getTime() + KST_OFFSET_MS);
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()}(${DOW[k.getUTCDay()]})${time ? ' ' + time : ''} · ${place}`;
}

type Row = {
  id: string; productId: string; roomId: string; sellerId: string; buyerId: string; proposerId: string;
  date: Date; time: string | null; place: string; note: string | null; status: string; reason: string | null;
  reservedProduct: boolean; respondedAt: Date | null; createdAt: Date; updatedAt: Date;
};

// 카드 content(JSON) — 프론트가 채팅방에서 약속 카드로 그린다. 개인정보 없음.
function cardContent(m: Row, productName: string, event: Status, by: 'seller' | 'buyer'): string {
  return JSON.stringify({
    meetingId: m.id, event, productId: m.productId, productName,
    date: kstYmd(m.date), time: m.time, place: m.place, note: m.note, reason: m.reason, by,
  });
}

async function sendCard(roomId: string, senderId: string, content: string): Promise<void> {
  const message = await prisma.message.create({
    data: { roomId, senderId, content, type: 'trade_meeting' },
    include: { sender: { select: { id: true, name: true, nickname: true, profileImage: true } } },
  });
  await prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
  emitToRoom(roomId, 'new_message', { ...message, sender: { ...message.sender, name: displayName(message.sender) } });
}

function notify(userId: string, title: string, message: string, link: string): void {
  createNotification(userId, 'chat', title, message, link).catch(() => {});
  emitToUser(userId, 'new_notification', { type: 'chat', title, message, link });
  sendPushToUser(userId, title, message, link).catch(() => {});
}

async function nameOf(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } });
  return u ? displayName(u) : '스노우판 회원';
}

const publicUser = { id: true, name: true, nickname: true, profileImage: true } as const;

function serialize(m: Row, extra: Record<string, unknown> = {}) {
  return {
    id: m.id, productId: m.productId, roomId: m.roomId, sellerId: m.sellerId, buyerId: m.buyerId, proposerId: m.proposerId,
    date: kstYmd(m.date), time: m.time, place: m.place, note: m.note, status: m.status, reason: m.reason,
    respondedAt: m.respondedAt, createdAt: m.createdAt, ...extra,
  };
}

async function loadForParticipant(req: AuthRequest, res: Response): Promise<Row | null> {
  const m = await prisma.tradeMeeting.findUnique({ where: { id: String(req.params.id) } });
  const me = req.user!.id;
  if (!m || (m.sellerId !== me && m.buyerId !== me)) { res.status(404).json({ error: '약속을 찾을 수 없어요' }); return null; }
  return m;
}

function roleOf(m: Row, userId: string): 'seller' | 'buyer' { return m.sellerId === userId ? 'seller' : 'buyer'; }

// ═════════ POST /trade-meetings — 약속 제안 (판매자·구매자 모두) ═════════
export const proposeMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const b = req.body || {};
    const roomId = typeof b.roomId === 'string' ? b.roomId : '';
    const productId = typeof b.productId === 'string' ? b.productId : '';
    if (!UUID_RE.test(roomId) || !UUID_RE.test(productId)) { res.status(400).json({ error: '채팅방·매물 정보가 올바르지 않아요' }); return; }

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { id: true, user1Id: true, user2Id: true, status: true } });
    if (!room || (room.user1Id !== me && room.user2Id !== me)) { res.status(404).json({ error: '채팅방을 찾을 수 없어요' }); return; }
    if (room.status !== 'accepted') { res.status(400).json({ error: '상대가 채팅 요청을 수락한 뒤에 약속을 잡을 수 있어요' }); return; }
    const otherId = room.user1Id === me ? room.user2Id : room.user1Id;

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, userId: true, status: true, category: true } });
    if (!product || product.category !== 'used') { res.status(404).json({ error: '매물을 찾을 수 없어요' }); return; }
    if (!product.userId || (product.userId !== me && product.userId !== otherId)) { res.status(400).json({ error: '이 대화의 매물이 아니에요' }); return; }
    if (product.status === 'sold') { res.status(400).json({ error: '이미 판매완료된 매물이에요' }); return; }
    const sellerId = product.userId;
    const buyerId = sellerId === me ? otherId : me;

    const other = await prisma.user.findUnique({ where: { id: otherId }, select: { role: true } });
    if (!other || other.role === 'deleted' || other.role === 'banned') { res.status(400).json({ error: '대화할 수 없는 사용자예요' }); return; }
    if (await isBlockedEither(me, otherId)) { res.status(403).json({ error: BLOCKED_CHAT_MESSAGE }); return; }

    const date = typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? parseKstDate(b.date) : null;
    if (!date) { res.status(400).json({ error: '만날 날짜를 골라 주세요' }); return; }
    if (date < kstDayStart()) { res.status(400).json({ error: '지난 날짜로는 약속을 잡을 수 없어요' }); return; }
    let time: string | null = null;
    if (b.time !== undefined && b.time !== null && b.time !== '') {
      if (typeof b.time !== 'string' || !TIME_RE.test(b.time)) { res.status(400).json({ error: '시간은 HH:mm 형식으로 적어 주세요' }); return; }
      time = b.time;
    }
    if (typeof b.place !== 'string' || !b.place.trim()) { res.status(400).json({ error: '만날 장소를 적어 주세요' }); return; }
    if (b.place.length > PLACE_MAX) { res.status(400).json({ error: `장소는 ${PLACE_MAX}자까지 적을 수 있어요` }); return; }
    const place = sanitizeText(b.place, PLACE_MAX);
    if (!place) { res.status(400).json({ error: '만날 장소를 적어 주세요' }); return; }
    let note: string | null = null;
    if (b.note !== undefined && b.note !== null && b.note !== '') {
      if (typeof b.note !== 'string') { res.status(400).json({ error: '한마디 형식이 올바르지 않아요' }); return; }
      if (b.note.length > NOTE_MAX) { res.status(400).json({ error: `한마디는 ${NOTE_MAX}자까지 적을 수 있어요` }); return; }
      note = sanitizeText(b.note, NOTE_MAX) || null;
    }

    // 확정된 약속이 있으면 먼저 취소해야 새로 잡을 수 있다. 제안 중인 약속은 새 제안이 대체한다(= 다른 시간 제안).
    const active = await prisma.tradeMeeting.findFirst({ where: { roomId, productId, status: { in: ['proposed', 'confirmed'] } }, orderBy: { createdAt: 'desc' } });
    if (active?.status === 'confirmed') { res.status(400).json({ error: '이미 확정된 약속이 있어요. 바꾸려면 먼저 약속을 취소해 주세요' }); return; }
    const now = new Date();
    if (active) await prisma.tradeMeeting.update({ where: { id: active.id }, data: { status: active.proposerId === me ? 'cancelled' : 'declined', reason: '새 제안으로 바뀜', respondedAt: now } });

    const meeting = await prisma.tradeMeeting.create({ data: { productId, roomId, sellerId, buyerId, proposerId: me, date, time, place, note, status: 'proposed' } });
    await sendCard(roomId, me, cardContent(meeting, product.name, 'proposed', roleOf(meeting, me)));
    const myName = await nameOf(me);
    notify(otherId, `${myName}님의 거래 약속 제안`, `${whenLabel(date, time, place)} · "${product.name}"`, `/chat/${roomId}`);
    res.status(201).json({ meeting: serialize(meeting, { productName: product.name, viewerRole: roleOf(meeting, me), replaced: active ? active.id : null }) });
  } catch (error) {
    console.error('Propose trade meeting error:', error);
    res.status(500).json({ error: '약속을 제안하지 못했어요. 잠시 후 다시 시도해 주세요' });
  }
};

// ═════════ GET /trade-meetings/:id ═════════
export const getMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const m = await loadForParticipant(req, res);
    if (!m) return;
    const [product, seller, buyer] = await Promise.all([
      prisma.product.findUnique({ where: { id: m.productId }, select: { id: true, name: true, image: true, status: true, buyerId: true } }),
      prisma.user.findUnique({ where: { id: m.sellerId }, select: publicUser }),
      prisma.user.findUnique({ where: { id: m.buyerId }, select: publicUser }),
    ]);
    res.json(serialize(m, {
      productName: product?.name || '매물', productImage: product?.image || null, productStatus: product?.status || null,
      seller: seller ? { id: seller.id, name: displayName(seller), profileImage: seller.profileImage } : null,
      buyer: buyer ? { id: buyer.id, name: displayName(buyer), profileImage: buyer.profileImage } : null,
      viewerRole: roleOf(m, req.user!.id),
    }));
  } catch (error) {
    console.error('Get trade meeting error:', error);
    res.status(500).json({ error: '약속을 불러오지 못했어요' });
  }
};

// ═════════ GET /trade-meetings/mine — 내 약속(판매자·구매자 모두), 다가오는 순 ═════════
export const getMyMeetings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const rows = await prisma.tradeMeeting.findMany({
      where: { OR: [{ sellerId: me }, { buyerId: me }] },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: { product: { select: { id: true, name: true, image: true, status: true } } },
    });
    const otherIds = Array.from(new Set(rows.map((r) => (r.sellerId === me ? r.buyerId : r.sellerId))));
    const users = otherIds.length ? await prisma.user.findMany({ where: { id: { in: otherIds } }, select: publicUser }) : [];
    const byId = new Map(users.map((u) => [u.id, { id: u.id, name: displayName(u), profileImage: u.profileImage }]));
    res.json({
      items: rows.map((r) => serialize(r, {
        productName: r.product.name, productImage: r.product.image, productStatus: r.product.status,
        other: byId.get(r.sellerId === me ? r.buyerId : r.sellerId) || null, viewerRole: roleOf(r, me),
      })),
    });
  } catch (error) {
    console.error('Get my trade meetings error:', error);
    res.status(500).json({ error: '약속 목록을 불러오지 못했어요' });
  }
};

// 공통: 사유(선택) 읽기
function readReason(req: AuthRequest, res: Response): string | null | undefined {
  const raw = req.body?.reason;
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') { res.status(400).json({ error: '사유 형식이 올바르지 않아요' }); return undefined; }
  if (raw.length > REASON_MAX) { res.status(400).json({ error: `사유는 ${REASON_MAX}자까지 적을 수 있어요` }); return undefined; }
  return sanitizeText(raw, REASON_MAX) || null;
}

async function productNameOf(id: string): Promise<string> {
  const p = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  return p?.name || '매물';
}

// ═════════ PUT /trade-meetings/:id/accept — 제안받은 쪽이 수락 → 확정 + 매물 '예약중' ═════════
export const acceptMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const m = await loadForParticipant(req, res);
    if (!m) return;
    const me = req.user!.id;
    if (m.proposerId === me) { res.status(400).json({ error: '내가 제안한 약속은 상대가 수락해야 해요' }); return; }
    if (m.status !== 'proposed') { res.status(400).json({ error: '이미 답한 약속이에요' }); return; }
    const now = new Date();
    // 매물이 '판매중'이면 '예약중'으로 — 되돌릴 때를 위해 기록
    const product = await prisma.product.findUnique({ where: { id: m.productId }, select: { status: true, name: true } });
    if (!product) { res.status(404).json({ error: '매물을 찾을 수 없어요' }); return; }
    if (product.status === 'sold') { res.status(400).json({ error: '이미 판매완료된 매물이에요' }); return; }
    const reserve = product.status !== 'reserved';
    const upd = await prisma.tradeMeeting.updateMany({ where: { id: m.id, status: 'proposed' }, data: { status: 'confirmed', respondedAt: now, reservedProduct: reserve } });
    if (upd.count === 0) { res.status(409).json({ error: '이미 처리된 약속이에요' }); return; }
    if (reserve) {
      await prisma.product.update({ where: { id: m.productId }, data: { status: 'reserved', buyerId: null, soldAt: null } });
      cacheDelPrefix('products:'); cacheDelPrefix('market:'); cacheDelPrefix('home:hotdeals');
    }
    const updated = { ...m, status: 'confirmed', respondedAt: now, reservedProduct: reserve };
    await sendCard(m.roomId, me, cardContent(updated, product.name, 'confirmed', roleOf(m, me)));
    const myName = await nameOf(me);
    const otherId = m.proposerId;
    notify(otherId, '거래 약속이 확정됐어요', `${whenLabel(m.date, m.time, m.place)} · ${myName}님이 수락했어요`, `/chat/${m.roomId}`);
    res.json({ meeting: serialize(updated, { productName: product.name, productStatus: reserve ? 'reserved' : product.status, viewerRole: roleOf(m, me) }) });
  } catch (error) {
    console.error('Accept trade meeting error:', error);
    res.status(500).json({ error: '약속을 수락하지 못했어요' });
  }
};

// ═════════ PUT /trade-meetings/:id/decline — 제안받은 쪽이 거절 ═════════
export const declineMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const m = await loadForParticipant(req, res);
    if (!m) return;
    const me = req.user!.id;
    if (m.proposerId === me) { res.status(400).json({ error: '내가 제안한 약속은 취소로 거둬 주세요' }); return; }
    if (m.status !== 'proposed') { res.status(400).json({ error: '이미 답한 약속이에요' }); return; }
    const reason = readReason(req, res); if (reason === undefined) return;
    const now = new Date();
    const upd = await prisma.tradeMeeting.updateMany({ where: { id: m.id, status: 'proposed' }, data: { status: 'declined', reason, respondedAt: now } });
    if (upd.count === 0) { res.status(409).json({ error: '이미 처리된 약속이에요' }); return; }
    const updated = { ...m, status: 'declined', reason, respondedAt: now };
    const productName = await productNameOf(m.productId);
    await sendCard(m.roomId, me, cardContent(updated, productName, 'declined', roleOf(m, me)));
    const myName = await nameOf(me);
    notify(m.proposerId, '거래 약속 제안이 거절됐어요', `${whenLabel(m.date, m.time, m.place)} · ${myName}님${reason ? ` · ${reason}` : ''}`, `/chat/${m.roomId}`);
    res.json({ meeting: serialize(updated, { productName, viewerRole: roleOf(m, me) }) });
  } catch (error) {
    console.error('Decline trade meeting error:', error);
    res.status(500).json({ error: '약속을 거절하지 못했어요' });
  }
};

// ═════════ PUT /trade-meetings/:id/cancel — 누구든 취소(파기). 제안 중이면 제안한 쪽만, 확정이면 양쪽 모두. 매물은 '판매중'으로 ═════════
export const cancelMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const m = await loadForParticipant(req, res);
    if (!m) return;
    const me = req.user!.id;
    if (m.status === 'proposed' && m.proposerId !== me) { res.status(400).json({ error: '제안받은 약속은 거절로 답해 주세요' }); return; }
    if (m.status !== 'proposed' && m.status !== 'confirmed') {
      res.status(400).json({ error: m.status === 'done' ? '이미 거래가 끝난 약속이에요' : '이미 끝난 약속이에요' });
      return;
    }
    const reason = readReason(req, res); if (reason === undefined) return;
    const now = new Date();
    const upd = await prisma.tradeMeeting.updateMany({ where: { id: m.id, status: { in: ['proposed', 'confirmed'] } }, data: { status: 'cancelled', reason, respondedAt: now } });
    if (upd.count === 0) { res.status(409).json({ error: '이미 처리된 약속이에요' }); return; }
    // 확정 때 이 약속이 예약중으로 바꿨던 매물이면 판매중으로 되돌린다 (다른 약속으로 이미 바뀌었으면 손대지 않음)
    const product = await prisma.product.findUnique({ where: { id: m.productId }, select: { status: true, name: true } });
    let productStatus = product?.status || null;
    if (m.status === 'confirmed' && m.reservedProduct && product?.status === 'reserved') {
      await prisma.product.update({ where: { id: m.productId }, data: { status: 'selling', buyerId: null, soldAt: null } });
      productStatus = 'selling';
      cacheDelPrefix('products:'); cacheDelPrefix('market:'); cacheDelPrefix('home:hotdeals');
    }
    const updated = { ...m, status: 'cancelled', reason, respondedAt: now };
    const productName = product?.name || '매물';
    await sendCard(m.roomId, me, cardContent(updated, productName, 'cancelled', roleOf(m, me)));
    const myName = await nameOf(me);
    const otherId = m.sellerId === me ? m.buyerId : m.sellerId;
    notify(otherId, '거래 약속이 취소됐어요', `${whenLabel(m.date, m.time, m.place)} · ${myName}님이 취소했어요${reason ? ` · ${reason}` : ''}`, `/chat/${m.roomId}`);
    res.json({ meeting: serialize(updated, { productName, productStatus, viewerRole: roleOf(m, me) }) });
  } catch (error) {
    console.error('Cancel trade meeting error:', error);
    res.status(500).json({ error: '약속을 취소하지 못했어요' });
  }
};

// ═════════ PUT /trade-meetings/:id/complete — 판매자가 거래 확정 → 매물 '판매완료' + 구매자 지정 + 후기 요청 ═════════
export const completeMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const m = await loadForParticipant(req, res);
    if (!m) return;
    const me = req.user!.id;
    if (m.sellerId !== me) { res.status(403).json({ error: '거래 확정은 판매자만 누를 수 있어요' }); return; }
    if (m.status !== 'confirmed') { res.status(400).json({ error: m.status === 'done' ? '이미 거래를 확정했어요' : '확정된 약속만 거래 확정할 수 있어요' }); return; }
    const now = new Date();
    const upd = await prisma.tradeMeeting.updateMany({ where: { id: m.id, status: 'confirmed' }, data: { status: 'done', respondedAt: now } });
    if (upd.count === 0) { res.status(409).json({ error: '이미 처리된 약속이에요' }); return; }
    const product = await prisma.product.update({ where: { id: m.productId }, data: { status: 'sold', buyerId: m.buyerId, soldAt: now }, select: { name: true } });
    cacheDelPrefix('products:'); cacheDelPrefix('market:'); cacheDelPrefix('home:hotdeals');
    const updated = { ...m, status: 'done', respondedAt: now };
    await sendCard(m.roomId, me, cardContent(updated, product.name, 'done', 'seller'));
    // 구매자에게 후기 요청 — 판매완료(구매자 지정)와 같은 문구·링크
    notify(m.buyerId, '거래 완료 — 판매자 평가해주세요', `"${product.name}" 거래가 완료됐어요. 판매자에게 후기를 남겨보세요.`, `/seller/${m.sellerId}`);
    res.json({ meeting: serialize(updated, { productName: product.name, productStatus: 'sold', viewerRole: 'seller' }) });
  } catch (error) {
    console.error('Complete trade meeting error:', error);
    res.status(500).json({ error: '거래를 확정하지 못했어요' });
  }
};
