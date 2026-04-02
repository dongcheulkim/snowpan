import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins } from './notificationController';

export const getRentals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resortId, limit, offset } = req.query;

    const where: any = { approved: true };
    if (resortId) where.resortId = resortId as string;

    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const [rentals, totalCount] = await Promise.all([
      prisma.rental.findMany({
        where,
        include: {
          resort: true,
          user: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(skip !== undefined && { skip }),
      }),
      prisma.rental.count({ where }),
    ]);

    res.json({ items: rentals, totalCount });
  } catch (error) {
    console.error('Get rentals error:', error);
    res.status(500).json({ error: '렌탈 조회 중 오류가 발생했습니다.' });
  }
};

// 렌탈 등록 (로그인 필요, 관리자 승인 대기)
export const createRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, price, duration, equipment, image, resortId, businessLicense } = req.body;

    if (!name || !price || !duration || !equipment || !image || !resortId) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }

    const rental = await prisma.rental.create({
      data: {
        name,
        price: Number(price) || 0,
        duration,
        equipment,
        image,
        businessLicense: businessLicense || null,
        resortId,
        userId,
        approved: false, // 관리자 승인 대기
      },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
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

export const getRentalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        resort: true,
        user: { select: { name: true, phone: true } },
      },
    });

    if (!rental) {
      res.status(404).json({ error: '렌탈 정보를 찾을 수 없습니다.' });
      return;
    }

    res.json(rental);
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

    const { name, price, duration, equipment, image } = req.body;
    const updated = await prisma.rental.update({
      where: { id },
      data: { ...(name && { name }), ...(price && !isNaN(Number(price)) && { price: Number(price) }), ...(duration && { duration }), ...(equipment && { equipment }), ...(image && { image }) },
    });
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
