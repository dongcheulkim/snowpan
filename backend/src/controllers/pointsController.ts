// 포인트 잔액/이력 조회 + 일일 출석체크. 적립/사용은 utils/points.ts 헬퍼가 담당.

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { awardPoints } from '../utils/points';

const DAILY_CHECKIN_POINTS = 500;

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

// 일일 출석체크 — 하루 1회 500pt 적립. 같은 날 두 번째 호출은 409.
// 멀티 클라이언트 동시 호출 가드: PointTransaction (userId, source, createdAt>=오늘) 존재 확인 후 awardPoints.
// 트랜잭션 안에서 처리해 race 차단.
export const checkin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.pointTransaction.findFirst({
        where: { userId, source: 'daily_checkin', createdAt: { gte: todayStart } },
        select: { id: true },
      });
      if (existing) {
        return { alreadyChecked: true as const };
      }
      const awarded = await awardPoints(tx, {
        userId,
        amount: DAILY_CHECKIN_POINTS,
        source: 'daily_checkin',
        description: '일일 출석',
      });
      return { alreadyChecked: false as const, ...awarded };
    });

    if (result.alreadyChecked) {
      res.status(409).json({ error: '오늘은 이미 출석체크 했어요.', alreadyChecked: true });
      return;
    }
    res.json({
      message: `+${DAILY_CHECKIN_POINTS}P 적립됐어요!`,
      amount: DAILY_CHECKIN_POINTS,
      balance: result.balance,
    });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: '출석체크 중 오류가 발생했습니다.' });
  }
};

// 오늘 출석 했는지 조회 — UI 에서 버튼 비활성화용.
export const getCheckinStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existing = await prisma.pointTransaction.findFirst({
      where: { userId, source: 'daily_checkin', createdAt: { gte: todayStart } },
      select: { id: true, createdAt: true },
    });
    res.json({ checkedToday: !!existing, dailyPoints: DAILY_CHECKIN_POINTS });
  } catch (err) {
    console.error('Get checkin status error:', err);
    res.status(500).json({ error: '출석체크 상태 조회 실패' });
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
