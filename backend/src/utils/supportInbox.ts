// 채팅방 접근·자리·수신자 규칙 — 두 가지 "공용 받은편지함"을 한 곳에서 다룬다.
//
// (1) 고객센터: 관리자 계정이 여럿이어도 손님↔관리자 방은 어느 관리자나 열고 답한다(사용자 요청 2026-09-09 "두 곳 다 가게").
//     손님이 보낸 메시지 알림은 관리자 전원에게, 관리자가 보낸 메시지는 손님에게만 간다.
// (2) 매장 직원 (2026-09-24): 매장 페이지 '채팅 문의'·방문 예약으로 생긴 방은 ChatRoomShop 으로 매장에 연결되고,
//     그 매장 직원은 사장님 자리에서 같이 보고 답한다. 사장님의 다른 대화는 안 보이고, 연결 시점 이전 메시지도 직원에겐 안 보인다.
//     손님이 보내면 사장님+직원 전원에게 알림, 매장 쪽(사장님·직원)이 보내면 손님에게만.
import prisma from '../config/database';
import { staffShopsOf, shopManagerIds, type StaffShopType } from './shopAccess';
import { cacheGet, cacheSet, cacheDel } from './cache';

// 캐시 없음 — 관리자는 몇 명 안 되고, 역할이 바뀐 직후(승격·정지) 바로 반영돼야 해서 매번 조회한다(작은 인덱스 없는 스캔이지만 users 가 작다).
export async function getAdminIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  return rows.map((r) => r.id);
}

export type ShopPair = { shopType: StaffShopType; shopId: string };
export type RoomShopLink = { shopType: string; shopId: string; shopName: string; ownerUserId: string; createdAt: Date };
type RoomLite = { user1Id: string; user2Id: string; shops?: RoomShopLink[] };
type RoomRead = RoomLite & { id: string; user1LastReadAt: Date | null; user2LastReadAt: Date | null };

// 직원으로 등록된 매장 목록 — 소켓 메시지·방 목록마다 조회하지 않게 30초 캐시. 참여/해제 때 invalidateStaffPairs.
export async function staffPairsOf(userId: string): Promise<ShopPair[]> {
  const key = `staffPairs:${userId}`;
  const hit = cacheGet<ShopPair[]>(key);
  if (hit) return hit;
  const pairs = await staffShopsOf(userId);
  cacheSet(key, pairs, 30);
  return pairs;
}
export function invalidateStaffPairs(userId: string): void { cacheDel(`staffPairs:${userId}`); }

// 요청자 정보 한 묶음 — 핸들러 시작에 한 번 만들어 sideOf/unreadByRoom 에 넘긴다
export interface Viewer { userId: string; role?: string; adminIds: string[]; staffPairs: ShopPair[] }
export async function viewerOf(userId: string, role?: string): Promise<Viewer> {
  const [adminIds, staffPairs] = await Promise.all([role === 'admin' ? getAdminIds() : Promise.resolve([] as string[]), staffPairsOf(userId)]);
  return { userId, role, adminIds, staffPairs };
}

// 관리자 참여자가 있는 방 = 고객센터 방. 어느 쪽(1|2)이 관리자인지 알려준다.
export function adminSideOf(room: RoomLite, adminIds: string[]): 1 | 2 | null {
  if (adminIds.includes(room.user1Id)) return 1;
  if (adminIds.includes(room.user2Id)) return 2;
  return null;
}

// 내가 직원인 매장에 연결된 링크 (참여자가 아닌 직원이 이 방을 보는 근거)
export function staffLinkOf(room: RoomLite, viewer: Pick<Viewer, 'staffPairs'>): RoomShopLink | null {
  if (!room.shops?.length || !viewer.staffPairs.length) return null;
  return room.shops.find((s) => viewer.staffPairs.some((p) => p.shopType === s.shopType && p.shopId === s.shopId)) || null;
}
export const isParticipant = (room: RoomLite, userId: string): boolean => room.user1Id === userId || room.user2Id === userId;

// 접근 가능한 방 where — 자기 방 + 직원인 매장에 연결된 방, 관리자는 + 모든 고객센터 방
export async function roomAccessWhere(userId: string, role?: string): Promise<Record<string, unknown>> {
  const own: Record<string, unknown>[] = [{ user1Id: userId }, { user2Id: userId }];
  const pairs = await staffPairsOf(userId);
  if (pairs.length) own.push({ shops: { some: { OR: pairs.map((p) => ({ shopType: p.shopType, shopId: p.shopId })) } } });
  if (role !== 'admin') return { OR: own };
  const ids = await getAdminIds();
  return { OR: [...own, { user1Id: { in: ids } }, { user2Id: { in: ids } }] };
}

// 이 방에서 viewer 가 "내 쪽"으로 볼 자리 — 참여자면 자기 자리, 관리자가 남의 고객센터 방이면 관리자 자리, 직원이면 사장님 자리
export function sideOf(room: RoomLite, viewer: Viewer): 1 | 2 | null {
  if (room.user1Id === viewer.userId) return 1;
  if (room.user2Id === viewer.userId) return 2;
  if (viewer.role === 'admin') { const s = adminSideOf(room, viewer.adminIds); if (s) return s; }
  const link = staffLinkOf(room, viewer);
  if (link) return link.ownerUserId === room.user1Id ? 1 : link.ownerUserId === room.user2Id ? 2 : null;
  return null;
}

// (구 API — 직원 정보 없이 호출하는 곳용) 참여자·관리자만 판별
export function mySideOf(room: RoomLite, userId: string, role: string | undefined, adminIds: string[]): 1 | 2 | null {
  if (room.user1Id === userId) return 1;
  if (room.user2Id === userId) return 2;
  if (role === 'admin') return adminSideOf(room, adminIds);
  return null;
}

// 내 자리가 매장 쪽인 링크들 (사장님 본인이든 직원이든) — 매장 쪽 사람들(사장님+직원)이 "내 쪽"
function shopLinksOnSide(room: RoomLite, side: 1 | 2 | null): RoomShopLink[] {
  if (!side || !room.shops?.length) return [];
  const sideUser = side === 1 ? room.user1Id : room.user2Id;
  return room.shops.filter((l) => l.ownerUserId === sideUser);
}

// 매장 쪽 사람 전원 (사장님 + 직원), 라벨 포함 — 방 상세 응답·안읽음 계산용
export async function shopSideOf(room: RoomLite): Promise<{ ids: string[]; labels: Record<string, string> }> {
  const labels: Record<string, string> = {};
  for (const l of room.shops || []) {
    for (const id of await shopManagerIds(l.shopType, l.shopId, l.ownerUserId)) labels[id] = id === l.ownerUserId ? '사장님' : '직원';
  }
  return { ids: Object.keys(labels), labels };
}

// 방별 안읽음 수 — 방마다 "내 쪽 사람들"과 읽음 시각이 달라 unnest 로 한 번에 센다.
// 내 쪽 = 나 / 고객센터 방의 관리자 전원 / 매장 방의 사장님+직원 전원. 직원은 연결 시점 이후 메시지만.
export async function unreadByRoom(rooms: RoomRead[], viewer: Viewer): Promise<Record<string, number>> {
  const ids: string[] = [], mines: string[] = [], sinces: string[] = [];
  const managerCache = new Map<string, string[]>();
  for (const room of rooms) {
    const side = sideOf(room, viewer);
    if (!side) continue;
    let mine: string[] = [viewer.userId];
    if (viewer.role === 'admin' && adminSideOf(room, viewer.adminIds) === side) mine = [...new Set([...mine, ...viewer.adminIds])];
    for (const l of shopLinksOnSide(room, side)) {
      const k = `${l.shopType}:${l.shopId}`;
      if (!managerCache.has(k)) managerCache.set(k, await shopManagerIds(l.shopType, l.shopId, l.ownerUserId));
      mine = [...new Set([...mine, ...managerCache.get(k)!])];
    }
    // createdAt 은 timestamp(시간대 없음, UTC 값) 컬럼 — timestamptz 로 비교하면 세션 시간대(Asia/Seoul)만큼 어긋나므로 시간대 없는 문자열로 맞춘다
    const naive = (d: Date): string => d.toISOString().slice(0, 23);
    let since = naive((side === 1 ? room.user1LastReadAt : room.user2LastReadAt) ?? new Date(0));
    const link = isParticipant(room, viewer.userId) ? null : staffLinkOf(room, viewer);
    if (link && naive(link.createdAt) > since) since = naive(link.createdAt);
    ids.push(room.id); mines.push(mine.join(',')); sinces.push(since);
  }
  const out: Record<string, number> = {};
  if (!ids.length) return out;
  const raw = await prisma.$queryRaw<{ roomId: string; cnt: bigint }[]>`
    SELECT m."roomId", COUNT(*) AS cnt
    FROM "messages" m
    JOIN unnest(${ids}::text[], ${mines}::text[], ${sinces}::text[]) AS t(rid, mine, since) ON t.rid = m."roomId"
    WHERE NOT (m."senderId" = ANY(string_to_array(t.mine, ',')))
      AND m."createdAt" > t.since::timestamp
    GROUP BY m."roomId"`;
  for (const row of raw) out[row.roomId] = Number(row.cnt);
  return out;
}

// 메시지 수신자 — 관리자가 보내면 손님에게, 손님이 고객센터 방에 보내면 관리자 전원에게
export function recipientsOf(room: RoomLite, senderId: string, adminIds: string[]): string[] {
  const side = adminSideOf(room, adminIds);
  const isSupportRoom = side !== null;
  const senderIsAdmin = adminIds.includes(senderId);
  if (isSupportRoom && senderIsAdmin) {
    const guest = side === 1 ? room.user2Id : room.user1Id;
    return adminIds.includes(guest) ? [guest] : [guest];
  }
  if (isSupportRoom && !senderIsAdmin) return adminIds.filter((id) => id !== senderId);
  return [room.user1Id === senderId ? room.user2Id : room.user1Id];
}

// 매장 연결 방까지 고려한 수신자 — 매장 쪽(사장님·직원)이 보내면 손님에게만, 손님이 보내면 사장님+직원 전원에게
export async function recipientsOfRoom(room: RoomLite, senderId: string, adminIds: string[]): Promise<string[]> {
  const links = room.shops || [];
  if (!links.length) return recipientsOf(room, senderId, adminIds);
  const { ids: shopSide } = await shopSideOf(room);
  const ownerIds = links.map((l) => l.ownerUserId);
  const customer = ownerIds.includes(room.user1Id) ? room.user2Id : room.user1Id;
  if (shopSide.includes(senderId)) return [customer];
  return shopSide.filter((id) => id !== senderId);
}
