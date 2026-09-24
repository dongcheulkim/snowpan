// 채팅방 ↔ 매장 연결 (ChatRoomShop) — 직원 공동 응대의 근거. 매장 페이지 '채팅 문의'(product_inquiry 카드의 productPath)와
// 방문 예약(Reservation.roomId)에서 연결한다. 연결은 방+매장당 한 번(unique), 시각은 처음 연결된 때를 유지한다.
import prisma from '../config/database';
import { getShopBasic, isStaffShopType, type StaffShopType } from './shopAccess';

// 매장 상세 경로 → (업종, id). 프론트 라우트와 동일: /skishop/:id, /repair/:id, /rental/:id, /lesson/:id, /accommodation/:id
const SHOP_PATH_RE = /^\/(skishop|repair|rental|lesson|accommodation)\/([0-9a-f-]{36})(?:[/?#].*)?$/;
function parseShopPath(path: unknown): { shopType: StaffShopType; shopId: string } | null {
  if (typeof path !== 'string') return null;
  const m = SHOP_PATH_RE.exec(path);
  if (!m || !isStaffShopType(m[1])) return null;
  return { shopType: m[1], shopId: m[2] };
}

export async function linkRoomToShop(roomId: string, shopType: string, shopId: string, shopName: string, ownerUserId: string, createdAt?: Date): Promise<void> {
  if (!isStaffShopType(shopType)) return;
  await prisma.chatRoomShop.upsert({
    where: { roomId_shopType_shopId: { roomId, shopType, shopId } },
    create: { roomId, shopType, shopId, shopName, ownerUserId, ...(createdAt ? { createdAt } : {}) },
    update: {},
  });
}

// 방 상대가 그 매장 사장님일 때만 연결 (손님이 아무 방에나 매장 경로를 붙여 남의 대화를 직원에게 열어 주는 것 방지)
export async function linkRoomIfShopInquiry(roomId: string, productPath: unknown, participants: [string, string]): Promise<void> {
  const parsed = parseShopPath(productPath);
  if (!parsed) return;
  const shop = await getShopBasic(parsed.shopType, parsed.shopId);
  if (!shop?.userId || !participants.includes(shop.userId)) return;
  await linkRoomToShop(roomId, parsed.shopType, parsed.shopId, shop.name, shop.userId);
}

// 기존 방 백필 — 표가 비어 있을 때 한 번만. 예약이 올라간 방 + 매장 문의 카드가 있는 방을 연결한다.
export async function backfillChatRoomShops(): Promise<number> {
  if ((await prisma.chatRoomShop.count()) > 0) return 0;
  const seen = new Set<string>();
  const data: { roomId: string; shopType: string; shopId: string; shopName: string; ownerUserId: string; createdAt: Date }[] = [];
  const reservations = await prisma.reservation.findMany({ where: { roomId: { not: null } }, select: { roomId: true, shopType: true, shopId: true, shopName: true, ownerId: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
  for (const r of reservations) {
    if (!r.roomId || !isStaffShopType(r.shopType)) continue;
    const k = `${r.roomId}:${r.shopType}:${r.shopId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    data.push({ roomId: r.roomId, shopType: r.shopType, shopId: r.shopId, shopName: r.shopName, ownerUserId: r.ownerId, createdAt: r.createdAt });
  }
  const inquiries = await prisma.message.findMany({ where: { type: 'product_inquiry' }, select: { roomId: true, content: true, createdAt: true, room: { select: { user1Id: true, user2Id: true } } }, orderBy: { createdAt: 'asc' } });
  const shopCache = new Map<string, { name: string; userId: string | null } | null>();
  for (const m of inquiries) {
    let parsed: { productPath?: unknown } = {};
    try { parsed = JSON.parse(m.content); } catch { continue; }
    const p = parseShopPath(parsed.productPath);
    if (!p) continue;
    const k = `${m.roomId}:${p.shopType}:${p.shopId}`;
    if (seen.has(k)) continue;
    const ck = `${p.shopType}:${p.shopId}`;
    if (!shopCache.has(ck)) shopCache.set(ck, await getShopBasic(p.shopType, p.shopId));
    const shop = shopCache.get(ck);
    if (!shop?.userId || (shop.userId !== m.room.user1Id && shop.userId !== m.room.user2Id)) continue;
    seen.add(k);
    // 카드 자체가 직원에게 보이도록 카드 시각보다 1초 앞선 시각으로 연결
    data.push({ roomId: m.roomId, shopType: p.shopType, shopId: p.shopId, shopName: shop.name, ownerUserId: shop.userId, createdAt: new Date(m.createdAt.getTime() - 1000) });
  }
  if (data.length) await prisma.chatRoomShop.createMany({ data, skipDuplicates: true });
  return data.length;
}
