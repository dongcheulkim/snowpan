import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { maskRowUser, maskRowUserAll } from '../utils/displayName';
import { notifyAdmins, createNotification } from '../controllers/notificationController';
import { sendPushToUser } from '../utils/push';
import { sanitizeText } from '../utils/sanitize';
import { sanitizeImages } from '../utils/images';
import { isHttpUrl, isAllowedImageUrl } from '../utils/validate';
import { pickVertical } from '../utils/vertical';

const router = Router();

// 승인된 스키샵 목록 (공개)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { area, resort, vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const where: any = { approved: true, vertical: verticalSlug };
    if (area) where.area = area as string;
    if (resort) where.resort = resort as string;

    // select 로 공개 필드만 — businessLicense(사업자등록증 이미지) 등 비공개 유지.
    const shops = await prisma.skiShop.findMany({
      where,
      select: {
        id: true, name: true, area: true, resort: true, address: true, description: true,
        brands: true, phone: true, instagram: true, website: true, naverMap: true, hours: true,
        image: true, images: true, isPremium: true, viewCount: true, createdAt: true,
        user: { select: { id: true, name: true, nickname: true } },
      },
      orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(maskRowUserAll(shops));
  } catch (error) {
    console.error('Get ski shops error:', error);
    res.status(500).json({ error: '스키샵 조회 중 오류가 발생했습니다.' });
  }
});

// 스키샵 등록 (로그인 필요, 관리자 승인 대기)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, area, resort, address, description, brands, phone, instagram, website, naverMap, hours, image, images, businessLicense, vertical } = req.body;

    if (!name || !area || !address || !description || !businessLicense) {
      res.status(400).json({ error: '상호명, 지역, 주소, 설명, 사업자등록증은 필수입니다.' });
      return;
    }
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    if (image && !isAllowedImageUrl(image)) { res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return; }
    const shop = await prisma.skiShop.create({
      data: {
        name: sanitizeText(name, 100) || name,
        area: sanitizeText(area, 40) || area,
        resort: sanitizeText(resort, 60) || null,
        address: sanitizeText(address, 200) || address,
        description: sanitizeText(description, 2000) || description,
        brands: sanitizeText(brands, 500) || null,
        phone: sanitizeText(phone, 40) || null,
        instagram: sanitizeText(instagram, 60) || null,
        website: isHttpUrl(website) ? sanitizeText(website, 300) || null : null,
        naverMap: isHttpUrl(naverMap) ? sanitizeText(naverMap, 300) || null : null,
        hours: sanitizeText(hours, 200) || null,
        image: image || null, images: sanitizeImages(images), businessLicense, userId, approved: false,
        vertical: verticalSlug,
      },
    });

    await notifyAdmins('system', '새 스키샵 등록 신청', `"${name}" 스키샵이 등록 신청되었습니다.`, '/admin-approval');
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
      include: { user: { select: { id: true, name: true, email: true } } },
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
    const shop = await prisma.skiShop.update({ where: { id: req.params.id }, data: { approved: true } });
    // 소유자에게 승인 알림 (렌탈/레슨과 동일한 UX)
    createNotification(shop.userId, 'approve', '스키샵 승인', `'${shop.name}' 스키샵이 승인되었습니다.`, '/new-equipment').catch(() => {});
    sendPushToUser(shop.userId, '스키샵 승인', `'${shop.name}' 스키샵이 승인되었습니다.`, '/new-equipment').catch(() => {});
    res.json({ message: '승인 완료' });
  } catch (error) {
    res.status(500).json({ error: '승인 실패' });
  }
});

// 단일 스키샵 조회 (공개, 승인된 것만) — 반드시 /my, /pending 뒤에 와야 함
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const shop = await prisma.skiShop.findFirst({
      where: { id: req.params.id, approved: true },
      select: {
        id: true, name: true, area: true, resort: true, address: true, description: true,
        brands: true, phone: true, instagram: true, website: true, naverMap: true, hours: true,
        image: true, images: true, isPremium: true, viewCount: true, createdAt: true,
        user: { select: { id: true, name: true, nickname: true } },
      },
    });
    if (!shop) { res.status(404).json({ error: '스키샵을 찾을 수 없습니다.' }); return; }
    // 조회수 증가 (fire-and-forget) — 응답 지연 없이.
    prisma.skiShop.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    res.json(maskRowUser(shop));
  } catch (error) {
    res.status(500).json({ error: '스키샵 조회 실패' });
  }
});

// 소유자 본인 또는 관리자: 매장 정보 수정 (중고매물과 동일한 권한 모델)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shop = await prisma.skiShop.findUnique({ where: { id: req.params.id } });
    if (!shop) { res.status(404).json({ error: '스키샵을 찾을 수 없습니다.' }); return; }
    if (shop.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { name, area, resort, address, description, brands, phone, instagram, website, naverMap, hours, image, images } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = sanitizeText(name, 100) || name;
    if (area !== undefined) data.area = sanitizeText(area, 40) || area;
    if (resort !== undefined) data.resort = resort ? (sanitizeText(resort, 60) || resort) : null;
    if (address !== undefined) data.address = sanitizeText(address, 200) || address;
    if (description !== undefined) data.description = sanitizeText(description, 2000) || description;
    if (brands !== undefined) data.brands = brands ? (sanitizeText(brands, 500) || brands) : null;
    if (phone !== undefined) data.phone = phone ? (sanitizeText(phone, 40) || phone) : null;
    if (instagram !== undefined) data.instagram = instagram ? (sanitizeText(instagram, 60) || instagram) : null;
    if (website !== undefined) data.website = isHttpUrl(website) ? (sanitizeText(website, 300) || null) : null;
    if (naverMap !== undefined) data.naverMap = isHttpUrl(naverMap) ? (sanitizeText(naverMap, 300) || null) : null;
    if (hours !== undefined) data.hours = hours ? (sanitizeText(hours, 200) || hours) : null;
    if (image && !isAllowedImageUrl(image)) { res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return; }
    if (image !== undefined) data.image = image || null;
    if (images !== undefined) data.images = sanitizeImages(images);
    // 소유자 수정은 재심사 — 승인 후 콘텐츠 바꿔치기 차단. 관리자 수정은 승인 유지.
    const ownerEdit = req.user!.role !== 'admin';
    if (ownerEdit) data.approved = false;

    const updated = await prisma.skiShop.update({ where: { id: req.params.id }, data });
    if (ownerEdit) notifyAdmins('system', '스키샵 수정 재심사 필요', `${updated.name} 이(가) 수정되어 재검토가 필요합니다.`, '/admin-approval').catch(() => {});
    res.json(updated);
  } catch (error) {
    console.error('Update ski shop error:', error);
    res.status(500).json({ error: '스키샵 수정 실패' });
  }
});

// 소유자 본인 또는 관리자: 삭제
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shop = await prisma.skiShop.findUnique({ where: { id: req.params.id } });
    if (!shop) { res.status(404).json({ error: '스키샵을 찾을 수 없습니다.' }); return; }
    if (shop.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }
    await prisma.skiShop.delete({ where: { id: req.params.id } });
    // 관리자가 남의 매장을 지운 경우 소유자에게 알림 — 미승인이면 거부, 승인 후면 삭제 안내 (렌탈/레슨과 동일 UX)
    if (req.user!.role === 'admin' && shop.userId !== req.user!.id) {
      const msg = shop.approved ? `'${shop.name}' 스키샵이 관리자에 의해 삭제되었습니다.` : `'${shop.name}' 스키샵 등록이 거부되었습니다.`;
      createNotification(shop.userId, 'reject', shop.approved ? '스키샵 삭제' : '스키샵 거부', msg).catch(() => {});
      sendPushToUser(shop.userId, shop.approved ? '스키샵 삭제' : '스키샵 거부', msg).catch(() => {});
    }
    res.json({ message: '삭제 완료' });
  } catch (error) {
    res.status(500).json({ error: '삭제 실패' });
  }
});

export default router;
