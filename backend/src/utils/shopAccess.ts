// 매장 공동 관리(직원) 권한 — 2026-09-23 사용자 요청 "사장님이 한 명인데 직원이 관리하는 경우도 있잖아, 공동관리 못하나".
// 사장님(shop.userId)·관리자 외에 shop_staff 에 등록된 직원도 예약 관리·매장 수정·소식·리뷰 답글·광고 신청을 할 수 있다.
// 매장 삭제·직원 초대/해제·소유권 이전은 사장님(과 관리자)만. 손님 문의 채팅은 여전히 사장님 계정으로 간다.
import prisma from '../config/database';

export const STAFF_SHOP_TYPES = ['skishop', 'repair', 'rental', 'lesson', 'accommodation'] as const;
export type StaffShopType = (typeof STAFF_SHOP_TYPES)[number];
export const isStaffShopType = (t: unknown): t is StaffShopType => typeof t === 'string' && (STAFF_SHOP_TYPES as readonly string[]).includes(t);

export interface ShopBasic { id: string; name: string; userId: string | null; approved: boolean; claimable: boolean }

// 업종별 테이블에서 기본 정보만 (사장님 id·승인·시딩 여부)
export async function getShopBasic(shopType: StaffShopType, shopId: string): Promise<ShopBasic | null> {
  let row: { id: string; name: string; userId: string | null; approved: boolean; claimable?: boolean } | null = null;
  switch (shopType) {
    case 'skishop': row = await prisma.skiShop.findUnique({ where: { id: shopId }, select: { id: true, name: true, userId: true, approved: true, claimable: true } }); break;
    case 'repair': row = await prisma.repairShop.findUnique({ where: { id: shopId }, select: { id: true, name: true, userId: true, approved: true, claimable: true } }); break;
    case 'rental': row = await prisma.rental.findUnique({ where: { id: shopId }, select: { id: true, name: true, userId: true, approved: true, claimable: true } }); break;
    case 'lesson': row = await prisma.lesson.findUnique({ where: { id: shopId }, select: { id: true, name: true, userId: true, approved: true } }); break;
    case 'accommodation': row = await prisma.accommodation.findUnique({ where: { id: shopId }, select: { id: true, name: true, userId: true, approved: true, claimable: true } }); break;
  }
  if (!row) return null;
  return { id: row.id, name: row.name, userId: row.userId, approved: row.approved, claimable: row.claimable === true };
}

export async function isShopStaff(userId: string, shopType: string, shopId: string): Promise<boolean> {
  if (!isStaffShopType(shopType) || !userId || !shopId) return false;
  const row = await prisma.shopStaff.findUnique({ where: { shopType_shopId_userId: { shopType, shopId, userId } }, select: { id: true } });
  return !!row;
}

export interface ShopAccess { allowed: boolean; isOwner: boolean; isStaff: boolean; isAdmin: boolean; shop: ShopBasic | null }

export async function shopAccess(user: { id: string; role?: string } | null | undefined, shopType: string, shopId: string): Promise<ShopAccess> {
  const none: ShopAccess = { allowed: false, isOwner: false, isStaff: false, isAdmin: false, shop: null };
  if (!user || !isStaffShopType(shopType)) return none;
  const shop = await getShopBasic(shopType, shopId);
  if (!shop) return none;
  const isAdmin = user.role === 'admin';
  const isOwner = !!shop.userId && shop.userId === user.id;
  const isStaff = !isOwner && (await isShopStaff(user.id, shopType, shopId));
  return { allowed: isAdmin || isOwner || isStaff, isOwner, isStaff, isAdmin, shop };
}

export async function canManageShop(user: { id: string; role?: string } | null | undefined, shopType: string, shopId: string): Promise<boolean> {
  return (await shopAccess(user, shopType, shopId)).allowed;
}

// 이 업종에서 직원으로 등록된 매장 id 목록 (/my 목록에 합치기용)
export async function staffShopIds(userId: string, shopType: StaffShopType): Promise<string[]> {
  const rows = await prisma.shopStaff.findMany({ where: { userId, shopType }, select: { shopId: true } });
  return rows.map((r) => r.shopId);
}

export async function staffShopsOf(userId: string): Promise<{ shopType: StaffShopType; shopId: string }[]> {
  const rows = await prisma.shopStaff.findMany({ where: { userId }, select: { shopType: true, shopId: true } });
  return rows.filter((r) => isStaffShopType(r.shopType)).map((r) => ({ shopType: r.shopType as StaffShopType, shopId: r.shopId }));
}

// 알림 받을 관리자들: 사장님 + 직원 (중복 없이)
export async function shopManagerIds(shopType: string, shopId: string, ownerId?: string | null): Promise<string[]> {
  const ids = new Set<string>();
  if (ownerId) ids.add(ownerId);
  if (isStaffShopType(shopType)) {
    const rows = await prisma.shopStaff.findMany({ where: { shopType, shopId }, select: { userId: true } });
    rows.forEach((r) => ids.add(r.userId));
  }
  return [...ids];
}

// /my 목록: 내 소유가 아닌(=직원으로 붙은) 매장에 staffRole 표시 — 대시보드가 삭제·직원 관리 버튼을 숨긴다
export function withStaffRole<T extends { userId?: string | null }>(rows: T[], userId: string): (T & { staffRole?: 'staff' })[] {
  return rows.map((r) => (r.userId && r.userId !== userId ? { ...r, staffRole: 'staff' as const } : r));
}
