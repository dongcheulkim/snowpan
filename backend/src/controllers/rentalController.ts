import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins } from './notificationController';
import { parsePrice, isAllowedImageUrl } from '../utils/validate';
import { pickVertical } from '../utils/vertical';
import { stripPrivate, stripPrivateAll } from '../utils/publicFields';

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

// 렌탈 등록 (로그인 필요, 관리자 승인 대기)
export const createRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, price, duration, equipment, description, image, resortId, businessLicense, vertical } = req.body;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    if (!name || !duration || !equipment || !image || !resortId) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }
    if (!isAllowedImageUrl(image)) {
      res.status(400).json({ error: '허용되지 않은 이미지입니다.' });
      return;
    }
    const priceResult = parsePrice(price);
    if (!priceResult.ok) {
      res.status(400).json({ error: priceResult.error });
      return;
    }

    const rental = await prisma.rental.create({
      data: {
        name,
        price: priceResult.value,
        duration,
        equipment,
        description: typeof description === 'string' ? description.slice(0, 2000) : null,
        image,
        businessLicense: businessLicense || null,
        resortId,
        userId,
        vertical: verticalSlug,
        approved: false,
      },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    await notifyAdmins('system', '새 렌탈 등록', `"${name}" 렌탈이 등록 신청되었습니다.`, '/admin-approval');
    res.status(201).json({
      ...rental,
      message: '렌탈 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.'
    });
  } catch (error) {
    console.error('Create rental error:', error);
    res.status(500).json({ error: '렌탈 등록 중 오류가 발생했습니다.' });
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

    const { name, price, duration, equipment, description, image } = req.body;
    let priceUpdate: number | undefined;
    if (price !== undefined && price !== null && price !== '') {
      const r = parsePrice(price);
      if (!r.ok) { res.status(400).json({ error: r.error }); return; }
      priceUpdate = r.value;
    }
    if (image !== undefined && image !== null && image !== '' && !isAllowedImageUrl(image)) {
      res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return;
    }
    // 소유자가 수정하면 재심사(approved=false) — 승인 후 콘텐츠 바꿔치기 차단. 관리자 수정은 승인 유지.
    const ownerEdit = req.user!.role !== 'admin';
    const updated = await prisma.rental.update({
      where: { id },
      data: {
        ...(name && { name }), ...(priceUpdate !== undefined && { price: priceUpdate }), ...(duration && { duration }),
        ...(equipment && { equipment }), ...(description !== undefined && { description: typeof description === 'string' ? description.slice(0, 2000) : null }),
        ...(image && { image }), ...(ownerEdit && { approved: false }),
      },
    });
    if (ownerEdit) notifyAdmins('system', '렌탈 수정 재심사 필요', `${updated.name} 이(가) 수정되어 재검토가 필요합니다.`, '/admin').catch(() => {});
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
