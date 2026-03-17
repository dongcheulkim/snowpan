import { Request, Response } from 'express';
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

export const createAccommodation = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { name, type, price, originalPrice, guests, features, image, resortId } = req.body;

    const accommodation = await prisma.accommodation.create({
      data: {
        name,
        type,
        price: parseInt(price),
        originalPrice: originalPrice ? parseInt(originalPrice) : parseInt(price),
        guests,
        features,
        image,
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
