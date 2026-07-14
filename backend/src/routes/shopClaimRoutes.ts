import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins, createNotification } from '../controllers/notificationController';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

async function getShop(shopType: string, shopId: string) {
  if (shopType === 'skishop') return prisma.skiShop.findUnique({ where: { id: shopId }, select: { id: true, name: true, userId: true } });
  if (shopType === 'repair') return prisma.repairShop.findUnique({ where: { id: shopId }, select: { id: true, name: true, userId: true } });
  return null;
}

// 소유권 이전 요청 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { shopType, shopId, businessLicense, message } = req.body;
    if (!['skishop', 'repair'].includes(shopType) || !shopId || !businessLicense) {
      res.status(400).json({ error: '매장 정보와 사업자등록증은 필수입니다.' });
      return;
    }
    const shop = await getShop(shopType, shopId);
    if (!shop) { res.status(404).json({ error: '매장을 찾을 수 없습니다.' }); return; }
    if (shop.userId === userId) { res.status(400).json({ error: '이미 내 매장입니다.' }); return; }

    // 동일 매장 대기중 요청 중복 방지
    const dupe = await prisma.shopClaim.findFirst({ where: { shopType, shopId, userId, status: 'pending' } });
    if (dupe) { res.status(409).json({ error: '이미 요청이 접수되었습니다. 관리자 확인을 기다려주세요.' }); return; }

    const claim = await prisma.shopClaim.create({
      data: {
        shopType, shopId, userId,
        businessLicense,
        message: sanitizeText(message, 500) || null,
      },
    });
    await notifyAdmins('system', '매장 소유권 이전 요청', `"${shop.name}" 매장 관리 요청이 접수되었습니다.`, '/admin-approval');
    res.status(201).json(claim);
  } catch (error) {
    console.error('Create shop claim error:', error);
    res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다.' });
  }
});

// 관리자: 대기중 요청 목록 (매장명·요청자 정보 조인)
router.get('/pending', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const claims = await prisma.shopClaim.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } });

    // shopType 이 관계가 아니라 수동으로 매장명·요청자 이름 채움.
    const enriched = await Promise.all(claims.map(async (c) => {
      const shop = await getShop(c.shopType, c.shopId);
      const user = await prisma.user.findUnique({ where: { id: c.userId }, select: { name: true, email: true } });
      return { ...c, shopName: shop?.name || '(삭제됨)', requesterName: user?.name || '', requesterEmail: user?.email || '' };
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: '요청 목록 조회 실패' });
  }
});

// 관리자: 승인 → 매장 소유권을 요청자에게 이전
router.put('/:id/approve', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const claim = await prisma.shopClaim.findUnique({ where: { id: req.params.id } });
    if (!claim || claim.status !== 'pending') { res.status(404).json({ error: '요청을 찾을 수 없습니다.' }); return; }

    const shop = await getShop(claim.shopType, claim.shopId);
    if (!shop) { res.status(404).json({ error: '매장을 찾을 수 없습니다.' }); return; }

    // 소유권 이전 + 승인 상태로 (사장이 직접 수정 가능해짐).
    if (claim.shopType === 'skishop') {
      await prisma.skiShop.update({ where: { id: claim.shopId }, data: { userId: claim.userId, approved: true } });
    } else {
      await prisma.repairShop.update({ where: { id: claim.shopId }, data: { userId: claim.userId, approved: true } });
    }
    await prisma.shopClaim.update({ where: { id: claim.id }, data: { status: 'approved' } });
    await createNotification(claim.userId, 'system', '매장 소유권 이전 완료', `"${shop.name}" 매장을 이제 직접 관리할 수 있어요.`, '/mypage/shops').catch(() => {});
    res.json({ message: '승인 및 소유권 이전 완료' });
  } catch (error) {
    console.error('Approve shop claim error:', error);
    res.status(500).json({ error: '승인 처리 실패' });
  }
});

// 관리자: 거절
router.put('/:id/reject', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const claim = await prisma.shopClaim.findUnique({ where: { id: req.params.id } });
    if (!claim || claim.status !== 'pending') { res.status(404).json({ error: '요청을 찾을 수 없습니다.' }); return; }
    await prisma.shopClaim.update({ where: { id: claim.id }, data: { status: 'rejected' } });
    await createNotification(claim.userId, 'system', '매장 이전 요청 반려', '매장 소유권 이전 요청이 반려되었습니다. 문의가 필요하면 고객센터로 연락주세요.', '/mypage/support').catch(() => {});
    res.json({ message: '거절 완료' });
  } catch (error) {
    res.status(500).json({ error: '거절 처리 실패' });
  }
});

export default router;
