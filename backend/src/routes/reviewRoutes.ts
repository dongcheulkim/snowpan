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

    const reviews = await prisma.review.findMany({
      where: { sellerId: sellerId as string },
      include: {
        buyer: { select: { id: true, name: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 평균 별점 계산
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    res.json({ reviews, averageRating, totalCount: reviews.length });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: '리뷰 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
