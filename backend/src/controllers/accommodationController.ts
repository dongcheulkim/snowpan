import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getAccommodations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resortId, type } = req.query;

    const accommodations = await prisma.accommodation.findMany({
      where: {
        ...(resortId ? { resortId: resortId as string } : {}),
        ...(type ? { type: { contains: type as string } } : {}),
        approved: true,
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
      orderBy: { createdAt: 'desc' },
    });

    res.json(accommodations);
  } catch (error) {
    console.error('Get accommodations error:', error);
    res.status(500).json({ error: '숙소 조회 중 오류가 발생했습니다.' });
  }
};

export const getAccommodationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const accommodation = await prisma.accommodation.findUnique({
      where: { id },
      include: {
        resort: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!accommodation) {
      res.status(404).json({ error: '숙소를 찾을 수 없습니다.' });
      return;
    }

    res.json(accommodation);
  } catch (error) {
    console.error('Get accommodation error:', error);
    res.status(500).json({ error: '숙소 조회 중 오류가 발생했습니다.' });
  }
};

export const createAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, type, price, originalPrice, guests, features, image, resortId, businessLicense, accommodationPermit } = req.body;

    if (!businessLicense) {
      res.status(400).json({ error: '숙소 등록 시 사업자등록증은 필수입니다.' });
      return;
    }

    const accommodation = await prisma.accommodation.create({
      data: {
        name,
        type,
        price: Number(price) || 0,
        originalPrice: originalPrice ? (Number(originalPrice) || 0) : (Number(price) || 0),
        guests,
        features,
        image,
        businessLicense,
        accommodationPermit: accommodationPermit || null,
        resortId,
        userId,
        approved: false,
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

    res.status(201).json({
      ...accommodation,
      message: '숙소 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.',
    });
  } catch (error) {
    console.error('Create accommodation error:', error);
    res.status(500).json({ error: '숙소 등록 중 오류가 발생했습니다.' });
  }
};

export const updateAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.accommodation.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ error: '숙소를 찾을 수 없습니다.' }); return; }
    if (item.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { name, type, price, originalPrice, guests, features, image } = req.body;
    const updated = await prisma.accommodation.update({
      where: { id },
      data: { ...(name && { name }), ...(type && { type }), ...(price && !isNaN(Number(price)) && { price: Number(price) }), ...(originalPrice && !isNaN(Number(originalPrice)) && { originalPrice: Number(originalPrice) }), ...(guests && { guests }), ...(features && { features }), ...(image && { image }) },
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: '수정 중 오류가 발생했습니다.' }); }
};

export const deleteAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.accommodation.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ error: '숙소를 찾을 수 없습니다.' }); return; }
    if (item.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.accommodation.delete({ where: { id } });
    res.json({ message: '숙소가 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' }); }
};
