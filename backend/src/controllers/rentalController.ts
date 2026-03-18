import { Request, Response } from 'express';
import prisma from '../config/database';

export const getRentals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resortId } = req.query;

    const rentals = await prisma.rental.findMany({
      where: {
        ...(resortId ? { resortId: resortId as string } : {}),
        approved: true, // 승인된 렌탈만 조회
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

    res.json(rentals);
  } catch (error) {
    console.error('Get rentals error:', error);
    res.status(500).json({ error: '렌탈 조회 중 오류가 발생했습니다.' });
  }
};

// 렌탈 등록 (로그인 필요, 관리자 승인 대기)
export const createRental = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { name, price, duration, equipment, image, resortId } = req.body;

    const rental = await prisma.rental.create({
      data: {
        name,
        price: parseInt(price),
        duration,
        equipment,
        image,
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
