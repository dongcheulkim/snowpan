// 매장 직원(공동 관리) — 2026-09-23. 사장님이 초대 링크(7일·10명)를 만들어 직원에게 보내고, 직원이 자기 계정으로 링크를 열어 참여한다.
// 직원 권한 판단은 utils/shopAccess.ts. 여기서는 초대·참여·목록·해제만.
import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from '../utils/push';
import { displayName } from '../utils/displayName';
import { shopAccess, isStaffShopType, isShopStaff, getShopBasic, StaffShopType } from '../utils/shopAccess';

const router = Router();
const SITE = process.env.FRONTEND_URL || 'https://snowpan.kr';
const INVITE_DAYS = 7;
const INVITE_MAX_USES = 10;
const TYPE_LABEL: Record<StaffShopType, string> = { skishop: '스키·보드샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소' };
const DETAIL_PATH: Record<StaffShopType, string> = { skishop: '/skishop', repair: '/repair', rental: '/rental', lesson: '/lesson', accommodation: '/accommodation' };
const publicUser = { id: true, name: true, nickname: true, profileImage: true } as const;

function parseType(t: string, res: Response): StaffShopType | null {
  if (!isStaffShopType(t)) { res.status(400).json({ error: '매장 종류가 올바르지 않아요.' }); return null; }
  return t;
}
async function newCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8);
    const dup = await prisma.shopInvite.findUnique({ where: { code }, select: { id: true } });
    if (!dup) return code;
  }
  return crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x');
}
function notify(userId: string, title: string, message: string, link: string): void {
  createNotification(userId, 'system', title, message, link).catch(() => undefined);
  sendPushToUser(userId, title, message, link).catch(() => undefined);
}

// 내 권한 — 상세 페이지(리뷰 답글 버튼)·수정 페이지가 묻는다
router.get('/access/:shopType/:shopId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const t = parseType(req.params.shopType, res); if (!t) return;
    const a = await shopAccess(req.user!, t, req.params.shopId);
    res.json({ canManage: a.allowed, isOwner: a.isOwner, isStaff: a.isStaff, isAdmin: a.isAdmin });
  } catch (e) { console.error('Shop access error:', e); res.status(500).json({ error: '권한을 확인하지 못했어요.' }); }
});

// 내가 직원으로 관리하는 매장
router.get('/mine', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.shopStaff.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    const items: object[] = [];
    for (const r of rows) {
      if (!isStaffShopType(r.shopType)) continue;
      const shop = await getShopBasic(r.shopType, r.shopId);
      if (!shop) continue;
      items.push({ shopType: r.shopType, shopId: r.shopId, name: shop.name, approved: shop.approved, label: TYPE_LABEL[r.shopType], path: `${DETAIL_PATH[r.shopType]}/${r.shopId}`, since: r.createdAt });
    }
    res.json({ items });
  } catch (e) { console.error('Staff mine error:', e); res.status(500).json({ error: '목록을 불러오지 못했어요.' }); }
});

// 직원 목록 + 활성 초대 링크 (사장님·관리자)
router.get('/shops/:shopType/:shopId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const t = parseType(req.params.shopType, res); if (!t) return;
    const a = await shopAccess(req.user!, t, req.params.shopId);
    if (!a.shop) { res.status(404).json({ error: '매장을 찾을 수 없어요.' }); return; }
    if (!a.isOwner && !a.isAdmin) { res.status(403).json({ error: '사장님만 직원을 관리할 수 있어요.' }); return; }
    const staff = await prisma.shopStaff.findMany({ where: { shopType: t, shopId: a.shop.id }, include: { user: { select: publicUser } }, orderBy: { createdAt: 'asc' } });
    const inv = await prisma.shopInvite.findFirst({ where: { shopType: t, shopId: a.shop.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    res.json({
      staff: staff.map((s) => ({ userId: s.userId, name: displayName(s.user), profileImage: s.user.profileImage, since: s.createdAt })),
      invite: inv && inv.usedCount < inv.maxUses ? { code: inv.code, url: `${SITE}/invite/${inv.code}`, expiresAt: inv.expiresAt, usedCount: inv.usedCount, maxUses: inv.maxUses } : null,
    });
  } catch (e) { console.error('Staff list error:', e); res.status(500).json({ error: '직원 목록을 불러오지 못했어요.' }); }
});

// 초대 링크 만들기 (사장님·관리자) — 기존 링크는 없애고 새로. 승인된 매장만.
router.post('/shops/:shopType/:shopId/invites', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const t = parseType(req.params.shopType, res); if (!t) return;
    const a = await shopAccess(req.user!, t, req.params.shopId);
    if (!a.shop) { res.status(404).json({ error: '매장을 찾을 수 없어요.' }); return; }
    if (!a.isOwner && !a.isAdmin) { res.status(403).json({ error: '사장님만 직원을 초대할 수 있어요.' }); return; }
    if (!a.shop.approved) { res.status(400).json({ error: '매장 승인 후에 직원을 초대할 수 있어요.' }); return; }
    await prisma.shopInvite.deleteMany({ where: { shopType: t, shopId: a.shop.id } });
    const code = await newCode();
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    await prisma.shopInvite.create({ data: { shopType: t, shopId: a.shop.id, code, createdBy: req.user!.id, maxUses: INVITE_MAX_USES, expiresAt } });
    res.status(201).json({ code, url: `${SITE}/invite/${code}`, expiresAt, maxUses: INVITE_MAX_USES, usedCount: 0 });
  } catch (e) { console.error('Staff invite create error:', e); res.status(500).json({ error: '초대 링크를 만들지 못했어요.' }); }
});

// 초대 링크 없애기 (사장님·관리자)
router.delete('/shops/:shopType/:shopId/invites', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const t = parseType(req.params.shopType, res); if (!t) return;
    const a = await shopAccess(req.user!, t, req.params.shopId);
    if (!a.shop) { res.status(404).json({ error: '매장을 찾을 수 없어요.' }); return; }
    if (!a.isOwner && !a.isAdmin) { res.status(403).json({ error: '사장님만 초대 링크를 관리할 수 있어요.' }); return; }
    await prisma.shopInvite.deleteMany({ where: { shopType: t, shopId: a.shop.id } });
    res.json({ message: '초대 링크를 없앴어요.' });
  } catch (e) { console.error('Staff invite revoke error:', e); res.status(500).json({ error: '처리하지 못했어요.' }); }
});

// 초대 미리보기 (로그인 필요) — 참여 화면이 매장 이름·상태를 보여준다
router.get('/invites/:code', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inv = await prisma.shopInvite.findUnique({ where: { code: req.params.code } });
    if (!inv || !isStaffShopType(inv.shopType)) { res.status(404).json({ error: '초대 링크가 없거나 이미 사라졌어요. 사장님께 새 링크를 받아 주세요.' }); return; }
    const shop = await getShopBasic(inv.shopType, inv.shopId);
    if (!shop) { res.status(404).json({ error: '매장이 없어졌어요.' }); return; }
    const expired = inv.expiresAt.getTime() < Date.now();
    const full = inv.usedCount >= inv.maxUses;
    const owner = shop.userId ? await prisma.user.findUnique({ where: { id: shop.userId }, select: publicUser }) : null;
    res.json({
      shopType: inv.shopType, shopId: inv.shopId, shopName: shop.name, label: TYPE_LABEL[inv.shopType], ownerName: owner ? displayName(owner) : null,
      valid: !expired && !full,
      reason: expired ? '기간이 지난 링크예요. 사장님께 새 링크를 받아 주세요.' : full ? '이 링크는 더 쓸 수 없어요. 사장님께 새 링크를 받아 주세요.' : null,
      isOwner: !!shop.userId && shop.userId === req.user!.id,
      alreadyStaff: await isShopStaff(req.user!.id, inv.shopType, inv.shopId),
    });
  } catch (e) { console.error('Staff invite preview error:', e); res.status(500).json({ error: '초대 링크를 확인하지 못했어요.' }); }
});

// 참여 — 직원으로 등록. 사장님에게 알림.
router.post('/invites/:code/accept', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!;
    const inv = await prisma.shopInvite.findUnique({ where: { code: req.params.code } });
    if (!inv || !isStaffShopType(inv.shopType)) { res.status(404).json({ error: '초대 링크가 없거나 이미 사라졌어요. 사장님께 새 링크를 받아 주세요.' }); return; }
    if (inv.expiresAt.getTime() < Date.now()) { res.status(410).json({ error: '기간이 지난 링크예요. 사장님께 새 링크를 받아 주세요.' }); return; }
    if (inv.usedCount >= inv.maxUses) { res.status(410).json({ error: '이 링크는 더 쓸 수 없어요. 사장님께 새 링크를 받아 주세요.' }); return; }
    const shop = await getShopBasic(inv.shopType, inv.shopId);
    if (!shop) { res.status(404).json({ error: '매장이 없어졌어요.' }); return; }
    if (shop.userId === me.id) { res.status(400).json({ error: '사장님 본인은 직원으로 참여할 수 없어요.' }); return; }
    if (await isShopStaff(me.id, inv.shopType, inv.shopId)) { res.json({ message: '이미 이 매장의 직원이에요.', shopType: inv.shopType, shopId: inv.shopId, shopName: shop.name }); return; }
    await prisma.$transaction([
      prisma.shopStaff.create({ data: { shopType: inv.shopType, shopId: inv.shopId, userId: me.id, invitedBy: inv.createdBy } }),
      prisma.shopInvite.update({ where: { id: inv.id }, data: { usedCount: { increment: 1 } } }),
    ]);
    const meRow = await prisma.user.findUnique({ where: { id: me.id }, select: publicUser });
    if (shop.userId) notify(shop.userId, '직원이 참여했어요', `${meRow ? displayName(meRow) : '회원'}님이 '${shop.name}' 직원으로 참여했어요. 예약 관리·소식·리뷰 답글을 함께 할 수 있어요.`, '/mypage/shops');
    res.status(201).json({ message: `'${shop.name}' 직원으로 참여했어요.`, shopType: inv.shopType, shopId: inv.shopId, shopName: shop.name });
  } catch (e) { console.error('Staff invite accept error:', e); res.status(500).json({ error: '참여하지 못했어요. 잠시 후 다시 시도해 주세요.' }); }
});

// 직원 해제 — 사장님·관리자, 또는 본인(나가기)
router.delete('/shops/:shopType/:shopId/staff/:userId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const t = parseType(req.params.shopType, res); if (!t) return;
    const a = await shopAccess(req.user!, t, req.params.shopId);
    if (!a.shop) { res.status(404).json({ error: '매장을 찾을 수 없어요.' }); return; }
    const self = req.params.userId === req.user!.id;
    if (!self && !a.isOwner && !a.isAdmin) { res.status(403).json({ error: '사장님만 직원을 해제할 수 있어요.' }); return; }
    const del = await prisma.shopStaff.deleteMany({ where: { shopType: t, shopId: a.shop.id, userId: req.params.userId } });
    if (!del.count) { res.status(404).json({ error: '직원이 아니에요.' }); return; }
    if (!self) notify(req.params.userId, '매장 직원에서 해제됐어요', `'${a.shop.name}' 매장 관리 권한이 해제됐어요.`, '/mypage');
    res.json({ message: self ? '매장 관리에서 나왔어요.' : '직원을 해제했어요.' });
  } catch (e) { console.error('Staff remove error:', e); res.status(500).json({ error: '처리하지 못했어요.' }); }
});

export default router;
