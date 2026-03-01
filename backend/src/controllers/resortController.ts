import { Request, Response } from 'express';
import prisma from '../config/database';

export const getResorts = async (req: Request, res: Response): Promise<void> => {
  try {
    const resorts = await prisma.skiResort.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(resorts);
  } catch (error) {
    console.error('Get resorts error:', error);
    res.status(500).json({ error: '스키장 조회 중 오류가 발생했습니다.' });
  }
};

export const getResortById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resort = await prisma.skiResort.findUnique({
      where: { id },
      include: {
        rentals: true,
        lessons: true,
      },
    });

    if (!resort) {
      res.status(404).json({ error: '스키장을 찾을 수 없습니다.' });
      return;
    }

    res.json(resort);
  } catch (error) {
    console.error('Get resort error:', error);
    res.status(500).json({ error: '스키장 조회 중 오류가 발생했습니다.' });
  }
};
