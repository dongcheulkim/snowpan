// 매장 찜 (2026-09-24) — 찜하면 매장 소식·이벤트 알림. GET /status(비로그인 가능)·/mine, POST·DELETE /:shopType/:shopId
import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authenticateToken, optionalAuth } from '../middleware/auth';
import { getShopBasic, isStaffShopType, type StaffShopType } from '../utils/shopAccess';

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseTarget(req: AuthRequest, res: Response): { shopType: StaffShopType; shopId: string } | null {
  const { shopType, shopId } = req.params;
  if (!isStaffShopType(shopType) || typeof shopId !== 'string' || !UUID_RE.test(shopId)) { res.status(400).json({ error: '매장 정보가 올바르지 않아요.' }); return null; }
  return { shopType, shopId };
}

// 찜 목록용 카드 정보 — 업종별 표에서 이름·사진·지역만
async function shopCard(shopType: StaffShopType, shopId: string): Promise<{ name: string; image: string | null; sub: string | null } | null> {
  const firstImage = (image: string | null | undefined, images: string | null | undefined): string | null => image || (images ? images.split(',').map((s) => s.trim()).filter(Boolean)[0] || null : null);
  switch (shopType) {
    case 'skishop': { const r = await prisma.skiShop.findUnique({ where: { id: shopId }, select: { name: true, image: true, images: true, area: true } }); return r ? { name: r.name, image: firstImage(r.image, r.images), sub: r.area } : null; }
    case 'repair': { const r = await prisma.repairShop.findUnique({ where: { id: shopId }, select: { name: true, image: true, images: true, area: true } }); return r ? { name: r.name, image: firstImage(r.image, r.images), sub: r.area } : null; }
    case 'rental': { const r = await prisma.rental.findUnique({ where: { id: shopId }, select: { name: true, image: true, images: true, area: true } }); return r ? { name: r.name, image: firstImage(r.image, r.images), sub: r.area } : null; }
    case 'lesson': { const r = await prisma.lesson.findUnique({ where: { id: shopId }, select: { name: true, image: true, images: true } }); return r ? { name: r.name, image: firstImage(r.image, r.images), sub: null } : null; }
    case 'accommodation': { const r = await prisma.accommodation.findUnique({ where: { id: shopId }, select: { name: true, image: true, images: true } }); return r ? { name: r.name, image: firstImage(r.image, r.images), sub: null } : null; }
  }
}

router.get('/status/:shopType/:shopId', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const t = parseTarget(req, res); if (!t) return;
    const [count, mine] = await Promise.all([
      prisma.shopFollow.count({ where: t }),
      req.user ? prisma.shopFollow.findUnique({ where: { shopType_shopId_userId: { ...t, userId: req.user.id } }, select: { id: true } }) : Promise.resolve(null),
    ]);
    res.json({ following: !!mine, count });
  } catch (e) { console.error('Shop follow status error:', e); res.status(500).json({ error: '찜 정보를 불러오지 못했어요.' }); }
});

router.get('/mine', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.shopFollow.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 200 });
    const items: unknown[] = [];
    for (const r of rows) {
      if (!isStaffShopType(r.shopType)) continue;
      const card = await shopCard(r.shopType, r.shopId);
      if (!card) continue; // 지워진 매장은 건너뜀
      items.push({ shopType: r.shopType, shopId: r.shopId, path: `/${r.shopType}/${r.shopId}`, followedAt: r.createdAt, ...card });
    }
    res.json(items);
  } catch (e) { console.error('Shop follow list error:', e); res.status(500).json({ error: '찜한 매장을 불러오지 못했어요.' }); }
});

router.post('/:shopType/:shopId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const t = parseTarget(req, res); if (!t) return;
    const shop = await getShopBasic(t.shopType, t.shopId);
    if (!shop || !shop.approved) { res.status(404).json({ error: '매장을 찾을 수 없어요.' }); return; }
    const userId = req.user!.id;
    const existing = await prisma.shopFollow.findUnique({ where: { shopType_shopId_userId: { ...t, userId } }, select: { id: true } });
    if (!existing) await prisma.shopFollow.create({ data: { ...t, userId } });
    const count = await prisma.shopFollow.count({ where: t });
    res.status(existing ? 200 : 201).json({ following: true, count });
  } catch (e) { console.error('Shop follow error:', e); res.status(500).json({ error: '찜하지 못했어요. 잠시 후 다시 시도해 주세요.' }); }
});

router.delete('/:shopType/:shopId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const t = parseTarget(req, res); if (!t) return;
    await prisma.shopFollow.deleteMany({ where: { ...t, userId: req.user!.id } });
    const count = await prisma.shopFollow.count({ where: t });
    res.json({ following: false, count });
  } catch (e) { console.error('Shop unfollow error:', e); res.status(500).json({ error: '찜을 해제하지 못했어요.' }); }
});

export default router;
