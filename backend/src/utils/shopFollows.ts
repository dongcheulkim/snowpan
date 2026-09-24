// 매장 찜 알림 — 매장 소식·이벤트가 올라오면 찜한 손님에게 (사장님·직원 본인은 제외)
import prisma from '../config/database';
import { getShopBasic, isStaffShopType, shopManagerIds } from './shopAccess';
import { notifyUser } from './notifyUser';

export async function notifyShopFollowers(shopType: string, shopId: string, postTitle: string, link: string): Promise<number> {
  if (!isStaffShopType(shopType)) return 0;
  const rows = await prisma.shopFollow.findMany({ where: { shopType, shopId }, select: { userId: true } });
  if (!rows.length) return 0;
  const shop = await getShopBasic(shopType, shopId);
  if (!shop) return 0;
  const exclude = new Set(await shopManagerIds(shopType, shopId, shop.userId));
  let n = 0;
  for (const r of rows) {
    if (exclude.has(r.userId)) continue;
    notifyUser(r.userId, `${shop.name} 새 소식`, postTitle, link);
    n++;
  }
  return n;
}
