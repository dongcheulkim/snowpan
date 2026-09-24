// 매장에 딸린 부속 행 정리 (2026-09-24) — 매장은 업종별 표에 있고 직원·찜·답장 문구·답장 속도·채팅방 연결은 (shopType, shopId) 문자열로만
// 매장을 가리켜서 DB 가 알아서 지워 주지 않는다. 매장을 지울 때 여기서 같이 지우고, 부팅·관리자 작업으로 고아 행도 정리한다.
// (지우지 않으면 채팅 목록에 사라진 매장 이름 칩이 남고, 옛 직원 권한이 남는다 — 2026-09-24 운영 실전 검사에서 발견)
import prisma from '../config/database';
import { getShopBasic, isStaffShopType, STAFF_SHOP_TYPES } from './shopAccess';

export async function cleanupShopRows(shopType: string, shopId: string): Promise<void> {
  if (!isStaffShopType(shopType) || !shopId) return;
  const where = { shopType, shopId };
  await Promise.all([
    prisma.chatRoomShop.deleteMany({ where }),
    prisma.shopStaff.deleteMany({ where }),
    prisma.shopInvite.deleteMany({ where }),
    prisma.shopFollow.deleteMany({ where }),
    prisma.shopReplyTemplate.deleteMany({ where }),
    prisma.shopResponseStat.deleteMany({ where }),
  ]);
}

// 사라진 매장을 가리키는 행 전부 정리 — 부팅 때 한 번 + 관리자 즉시 실행
export async function cleanupOrphanShopRows(): Promise<number> {
  const pairs = new Set<string>();
  const add = (rows: { shopType: string; shopId: string }[]) => rows.forEach((r) => pairs.add(`${r.shopType}:${r.shopId}`));
  add(await prisma.chatRoomShop.findMany({ distinct: ['shopType', 'shopId'], select: { shopType: true, shopId: true } }));
  add(await prisma.shopStaff.findMany({ distinct: ['shopType', 'shopId'], select: { shopType: true, shopId: true } }));
  add(await prisma.shopInvite.findMany({ distinct: ['shopType', 'shopId'], select: { shopType: true, shopId: true } }));
  add(await prisma.shopFollow.findMany({ distinct: ['shopType', 'shopId'], select: { shopType: true, shopId: true } }));
  add(await prisma.shopReplyTemplate.findMany({ distinct: ['shopType', 'shopId'], select: { shopType: true, shopId: true } }));
  add(await prisma.shopResponseStat.findMany({ distinct: ['shopType', 'shopId'], select: { shopType: true, shopId: true } }));
  let removed = 0;
  for (const key of pairs) {
    const [shopType, shopId] = key.split(':');
    if (!(STAFF_SHOP_TYPES as readonly string[]).includes(shopType)) continue;
    const shop = await getShopBasic(shopType as (typeof STAFF_SHOP_TYPES)[number], shopId);
    if (shop) continue;
    await cleanupShopRows(shopType, shopId);
    removed++;
  }
  return removed;
}
