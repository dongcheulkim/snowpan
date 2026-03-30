import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

// 리뷰 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyerId = req.user!.id;
    const { sellerId, rating, content, productId } = req.body;

    if (!sellerId || !rating || !content) {
      res.status(400).json({ error: '필수 항목을 입력해주세요.' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: '별점은 1~5 사이여야 합니다.' });
      return;
    }

    if (buyerId === sellerId) {
      res.status(400).json({ error: '본인에게 리뷰를 남길 수 없습니다.' });
      return;
    }

    const review = await prisma.review.create({
      data: {
        rating: parseInt(String(rating)),
        content,
        sellerId,
        buyerId,
        productId: productId || null,
      },
      include: {
        buyer: { select: { id: true, name: true, profileImage: true } },
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: '리뷰 등록 중 오류가 발생했습니다.' });
  }
});

// 판매자 리뷰 조회
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sellerId } = req.query;
    if (!sellerId) {
      res.status(400).json({ error: 'sellerId가 필요합니다.' });
      return;
    }

    const { limit, offset } = req.query;
    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;
    const where = { sellerId: sellerId as string };

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, profileImage: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(skip !== undefined && { skip }),
      }),
      prisma.review.count({ where }),
    ]);

    // 평균 별점 (전체 기준)
    const agg = await prisma.review.aggregate({ where, _avg: { rating: true } });
    const averageRating = agg._avg.rating || 0;

    res.json({ reviews, averageRating, totalCount });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: '리뷰 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
