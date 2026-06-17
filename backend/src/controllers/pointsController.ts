// 포인트 잔액/이력 조회. 적립/사용은 utils/points.ts 헬퍼가 담당.

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }
    res.json({ balance: user.points });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ error: '포인트 조회 중 오류가 발생했습니다.' });
  }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(String(req.query.limit || '30'), 10) || 30, 100);
    const cursor = req.query.cursor as string | undefined;

    const transactions = await prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        amount: true,
        balanceAfter: true,
        source: true,
        description: true,
        createdAt: true,
      },
    });

    const hasMore = transactions.length > limit;
    const items = hasMore ? transactions.slice(0, limit) : transactions;
    res.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error('Get points history error:', err);
    res.status(500).json({ error: '포인트 이력 조회 중 오류가 발생했습니다.' });
  }
};
