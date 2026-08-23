import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins, createNotification } from '../controllers/notificationController';
import { sanitizeText } from '../utils/sanitize';
import { sanitizeImages } from '../utils/images';
import { isAllowedImageUrl } from '../utils/validate';
import { pickVertical } from '../utils/vertical';

const router = Router();

// 승인된 정비샵 목록 (공개)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { area, vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const where: any = { approved: true, vertical: verticalSlug };
    if (area) where.area = area as string;

    // select 로 공개 필드만 — businessLicense 비공개 유지.
    const shops = await prisma.repairShop.findMany({
      where,
      select: {
        id: true, name: true, area: true, address: true, description: true, services: true,
        phone: true, instagram: true, website: true, naverMap: true, hours: true,
        image: true, images: true, isPremium: true, viewCount: true, createdAt: true,
        user: { select: { id: true, name: true, nickname: true } },
      },
      orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(shops);
  } catch (error) {
    console.error('Get repair shops error:', error);
    res.status(500).json({ error: '정비샵 조회 중 오류가 발생했습니다.' });
  }
});

// 정비샵 등록
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, area, address, description, services, phone, instagram, website, naverMap, hours, image, images, businessLicense, vertical } = req.body;

    if (!name || !area || !address || !description || !businessLicense) {
      res.status(400).json({ error: '상호명, 지역, 주소, 설명, 사업자등록증은 필수입니다.' });
      return;
    }
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    if (image && !isAllowedImageUrl(image)) { res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return; }
    const shop = await prisma.repairShop.create({
      data: {
        name: sanitizeText(name, 100) || name,
        area: sanitizeText(area, 40) || area,
        address: sanitizeText(address, 200) || address,
        description: sanitizeText(description, 2000) || description,
        services: sanitizeText(services, 500) || null,
        phone: sanitizeText(phone, 40) || null,
        instagram: sanitizeText(instagram, 60) || null,
        website: sanitizeText(website, 300) || null,
        naverMap: sanitizeText(naverMap, 300) || null,
        hours: sanitizeText(hours, 200) || null,
        image: image || null, images: sanitizeImages(images), businessLicense, userId, approved: false,
        vertical: verticalSlug,
      },
    });

    await notifyAdmins('system', '새 정비샵 등록 신청', `"${name}" 정비샵이 등록 신청되었습니다.`, '/admin-approval');
    res.status(201).json({ ...shop, message: '정비샵 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.' });
  } catch (error) {
    console.error('Create repair shop error:', error);
    res.status(500).json({ error: '정비샵 등록 중 오류가 발생했습니다.' });
  }
});

// 내 정비샵 목록
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shops = await prisma.repairShop.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    res.json(shops);
  } catch (error) { res.status(500).json({ error: '조회 실패' }); }
});

// 관리자: 승인 대기
router.get('/pending', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const shops = await prisma.repairShop.findMany({
      where: { approved: false },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(shops);
  } catch (error) { res.status(500).json({ error: '조회 실패' }); }
});

// 관리자: 승인
router.put('/:id/approve', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const shop = await prisma.repairShop.update({ where: { id: req.params.id }, data: { approved: true } });
    // 소유자에게 승인 알림 (렌탈/레슨과 동일한 UX)
    createNotification(shop.userId, 'approve', '정비샵 승인', `'${shop.name}' 정비샵이 승인되었습니다.`, '/repair').catch(() => {});
    res.json({ message: '승인 완료' });
  } catch (error) { res.status(500).json({ error: '승인 실패' }); }
});

// 단일 정비샵 조회 (공개, 승인된 것만) — 반드시 /my, /pending 뒤에
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const shop = await prisma.repairShop.findFirst({
      where: { id: req.params.id, approved: true },
      select: {
        id: true, name: true, area: true, address: true, description: true, services: true,
        phone: true, instagram: true, website: true, naverMap: true, hours: true,
        image: true, images: true, isPremium: true, viewCount: true, createdAt: true,
        user: { select: { id: true, name: true, nickname: true } },
      },
    });
    if (!shop) { res.status(404).json({ error: '정비샵을 찾을 수 없습니다.' }); return; }
    prisma.repairShop.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: '정비샵 조회 실패' });
  }
});

// 소유자 본인 또는 관리자: 매장 정보 수정
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shop = await prisma.repairShop.findUnique({ where: { id: req.params.id } });
    if (!shop) { res.status(404).json({ error: '정비샵을 찾을 수 없습니다.' }); return; }
    if (shop.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { name, area, address, description, services, phone, instagram, website, naverMap, hours, image, images } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = sanitizeText(name, 100) || name;
    if (area !== undefined) data.area = sanitizeText(area, 40) || area;
    if (address !== undefined) data.address = sanitizeText(address, 200) || address;
    if (description !== undefined) data.description = sanitizeText(description, 2000) || description;
    if (services !== undefined) data.services = services ? (sanitizeText(services, 500) || services) : null;
    if (phone !== undefined) data.phone = phone ? (sanitizeText(phone, 40) || phone) : null;
    if (instagram !== undefined) data.instagram = instagram ? (sanitizeText(instagram, 60) || instagram) : null;
    if (website !== undefined) data.website = website ? (sanitizeText(website, 300) || website) : null;
    if (naverMap !== undefined) data.naverMap = naverMap ? (sanitizeText(naverMap, 300) || naverMap) : null;
    if (hours !== undefined) data.hours = hours ? (sanitizeText(hours, 200) || hours) : null;
    if (image && !isAllowedImageUrl(image)) { res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return; }
    if (image !== undefined) data.image = image || null;
    if (images !== undefined) data.images = sanitizeImages(images);
    const ownerEdit = req.user!.role !== 'admin';
    if (ownerEdit) data.approved = false;

    const updated = await prisma.repairShop.update({ where: { id: req.params.id }, data });
    if (ownerEdit) notifyAdmins('system', '수리샵 수정 재심사 필요', `${updated.name} 이(가) 수정되어 재검토가 필요합니다.`, '/admin-approval').catch(() => {});
    res.json(updated);
  } catch (error) {
    console.error('Update repair shop error:', error);
    res.status(500).json({ error: '정비샵 수정 실패' });
  }
});

// 소유자 본인 또는 관리자: 삭제
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shop = await prisma.repairShop.findUnique({ where: { id: req.params.id } });
    if (!shop) { res.status(404).json({ error: '정비샵을 찾을 수 없습니다.' }); return; }
    if (shop.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }
    await prisma.repairShop.delete({ where: { id: req.params.id } });
    // 관리자가 남의 매장을 지운 경우 소유자에게 알림 (스키샵과 동일 UX)
    if (req.user!.role === 'admin' && shop.userId !== req.user!.id) {
      const msg = shop.approved ? `'${shop.name}' 정비샵이 관리자에 의해 삭제되었습니다.` : `'${shop.name}' 정비샵 등록이 거부되었습니다.`;
      createNotification(shop.userId, 'reject', shop.approved ? '정비샵 삭제' : '정비샵 거부', msg).catch(() => {});
    }
    res.json({ message: '삭제 완료' });
  } catch (error) { res.status(500).json({ error: '삭제 실패' }); }
});

export default router;
