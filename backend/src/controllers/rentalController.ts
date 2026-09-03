import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins } from './notificationController';
import { isHttpUrl, isAllowedImageUrl } from '../utils/validate';
import { pickVertical } from '../utils/vertical';
import { stripPrivate, stripPrivateAll } from '../utils/publicFields';
import { sanitizeText } from '../utils/sanitize';
import { sanitizeImages } from '../utils/images';

export const getRentals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resortId, limit, offset, vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    const where: any = { approved: true, vertical: verticalSlug };
    if (resortId) where.resortId = resortId as string;

    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const [rentals, totalCount] = await Promise.all([
      prisma.rental.findMany({
        where,
        include: {
          resort: true,
          user: { select: { id: true, name: true, nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(skip !== undefined && { skip }),
      }),
      prisma.rental.count({ where }),
    ]);

    res.json({ items: stripPrivateAll(rentals as any), totalCount });
  } catch (error) {
    console.error('Get rentals error:', error);
    res.status(500).json({ error: '렌탈 조회 중 오류가 발생했습니다.' });
  }
};

// 렌탈샵 등록 (매장형) — 로그인 필요, 관리자 승인 대기.
export const createRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const b = req.body;
    const verticalSlug = pickVertical(b.vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    if (!b.name || !b.area || !b.businessLicense) {
      res.status(400).json({ error: '상호명, 지역, 사업자등록증은 필수입니다.' });
      return;
    }
    if (b.image && !isAllowedImageUrl(b.image)) { res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return; }

    const rental = await prisma.rental.create({
      data: {
        name: sanitizeText(b.name, 100) || b.name,
        area: sanitizeText(b.area, 40) || b.area,
        address: sanitizeText(b.address, 200) || null,
        description: sanitizeText(b.description, 2000) || null,
        brands: sanitizeText(b.brands, 500) || null,
        phone: sanitizeText(b.phone, 40) || null,
        instagram: sanitizeText(b.instagram, 60) || null,
        website: isHttpUrl(b.website) ? sanitizeText(b.website, 300) || null : null,
        naverMap: isHttpUrl(b.naverMap) ? sanitizeText(b.naverMap, 300) || null : null,
        hours: sanitizeText(b.hours, 200) || null,
        image: b.image || null,
        images: sanitizeImages(b.images),
        businessLicense: b.businessLicense || null,
        resortId: b.resortId || null,
        userId,
        vertical: verticalSlug,
        approved: false,
      },
      include: { resort: true, user: { select: { name: true } } },
    });

    await notifyAdmins('system', '새 렌탈샵 등록', `"${rental.name}" 렌탈샵이 등록 신청되었습니다.`, '/admin-approval');
    res.status(201).json({ ...rental, message: '렌탈샵 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.' });
  } catch (error) {
    console.error('Create rental error:', error);
    res.status(500).json({ error: '렌탈샵 등록 중 오류가 발생했습니다.' });
  }
};

export const getRentalById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        resort: true,
        user: { select: { id: true, name: true, nickname: true } },
      },
    });

    if (!rental) {
      res.status(404).json({ error: '렌탈 정보를 찾을 수 없습니다.' });
      return;
    }
    // 미승인(심사대기·재심사 중)은 소유자/관리자만 조회 — 편집용 로드 허용 + 공개 게이트 유지.
    if (!rental.approved && rental.userId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(404).json({ error: '렌탈 정보를 찾을 수 없습니다.' });
      return;
    }

    res.json(stripPrivate(rental as any));
  } catch (error) {
    console.error('Get rental error:', error);
    res.status(500).json({ error: '렌탈 조회 중 오류가 발생했습니다.' });
  }
};

export const updateRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.rental.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ error: '렌탈을 찾을 수 없습니다.' }); return; }
    if (item.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const b = req.body;
    if (b.image !== undefined && b.image !== null && b.image !== '' && !isAllowedImageUrl(b.image)) {
      res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return;
    }
    // 소유자가 수정하면 재심사(approved=false) — 승인 후 콘텐츠 바꿔치기 차단. 관리자 수정은 승인 유지.
    const ownerEdit = req.user!.role !== 'admin';
    const data: Record<string, unknown> = {};
    if (b.name !== undefined) data.name = sanitizeText(b.name, 100) || b.name;
    if (b.area !== undefined) data.area = b.area ? (sanitizeText(b.area, 40) || b.area) : null;
    if (b.address !== undefined) data.address = b.address ? (sanitizeText(b.address, 200) || b.address) : null;
    if (b.description !== undefined) data.description = b.description ? (sanitizeText(b.description, 2000) || b.description) : null;
    if (b.brands !== undefined) data.brands = b.brands ? (sanitizeText(b.brands, 500) || b.brands) : null;
    if (b.phone !== undefined) data.phone = b.phone ? (sanitizeText(b.phone, 40) || b.phone) : null;
    if (b.instagram !== undefined) data.instagram = b.instagram ? (sanitizeText(b.instagram, 60) || b.instagram) : null;
    if (b.website !== undefined) data.website = b.website && isHttpUrl(b.website) ? (sanitizeText(b.website, 300) || null) : null;
    if (b.naverMap !== undefined) data.naverMap = b.naverMap && isHttpUrl(b.naverMap) ? (sanitizeText(b.naverMap, 300) || null) : null;
    if (b.hours !== undefined) data.hours = b.hours ? (sanitizeText(b.hours, 200) || b.hours) : null;
    if (b.image !== undefined) data.image = b.image || null;
    if (b.images !== undefined) data.images = sanitizeImages(b.images);
    if (b.resortId !== undefined) data.resortId = b.resortId || null;
    if (ownerEdit) data.approved = false;
    const updated = await prisma.rental.update({ where: { id }, data });
    if (ownerEdit) notifyAdmins('system', '렌탈 수정 재심사 필요', `${updated.name} 이(가) 수정되어 재검토가 필요합니다.`, '/admin-approval').catch(() => {});
    res.json(updated);
  } catch (error) { res.status(500).json({ error: '수정 중 오류가 발생했습니다.' }); }
};

export const deleteRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.rental.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ error: '렌탈을 찾을 수 없습니다.' }); return; }
    if (item.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.rental.delete({ where: { id } });
    res.json({ message: '렌탈이 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' }); }
};

// 내 렌탈 목록 (사장님 대시보드) — 승인 여부 무관 전체.
export const getMyRentals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rentals = await prisma.rental.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rentals);
  } catch (error) { res.status(500).json({ error: '내 렌탈 조회 실패' }); }
};
