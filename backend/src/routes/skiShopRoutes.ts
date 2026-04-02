import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

// 승인된 스키샵 목록 (공개)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { area, resort } = req.query;
    const where: any = { approved: true };
    if (area) where.area = area as string;
    if (resort) where.resort = resort as string;

    const shops = await prisma.skiShop.findMany({
      where,
      include: { user: { select: { name: true, phone: true } } },
      orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(shops);
  } catch (error) {
    console.error('Get ski shops error:', error);
    res.status(500).json({ error: '스키샵 조회 중 오류가 발생했습니다.' });
  }
});

// 스키샵 등록 (로그인 필요, 관리자 승인 대기)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, area, resort, address, description, brands, phone, instagram, website, naverMap, hours, image, businessLicense } = req.body;

    if (!name || !area || !address || !description || !businessLicense) {
      res.status(400).json({ error: '상호명, 지역, 주소, 설명, 사업자등록증은 필수입니다.' });
      return;
    }

    const shop = await prisma.skiShop.create({
      data: {
        name, area, resort: resort || null, address, description,
        brands: brands || null, phone: phone || null, instagram: instagram || null,
        website: website || null, naverMap: naverMap || null, hours: hours || null,
        image: image || null, businessLicense, userId, approved: false,
      },
    });

    res.status(201).json({ ...shop, message: '스키샵 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.' });
  } catch (error) {
    console.error('Create ski shop error:', error);
    res.status(500).json({ error: '스키샵 등록 중 오류가 발생했습니다.' });
  }
});

// 내 스키샵 목록
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shops = await prisma.skiShop.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: '내 스키샵 조회 실패' });
  }
});

// 관리자: 승인 대기 스키샵 목록
router.get('/pending', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const shops = await prisma.skiShop.findMany({
      where: { approved: false },
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: '대기 목록 조회 실패' });
  }
});

// 관리자: 승인
router.put('/:id/approve', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    await prisma.skiShop.update({ where: { id: req.params.id }, data: { approved: true } });
    res.json({ message: '승인 완료' });
  } catch (error) {
    res.status(500).json({ error: '승인 실패' });
  }
});

// 관리자: 거절 (삭제)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    await prisma.skiShop.delete({ where: { id: req.params.id } });
    res.json({ message: '삭제 완료' });
  } catch (error) {
    res.status(500).json({ error: '삭제 실패' });
  }
});

export default router;
