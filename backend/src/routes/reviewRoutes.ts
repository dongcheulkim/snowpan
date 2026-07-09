import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from '../utils/push';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

// 리뷰 작성에 대한 포인트 보상은 정책 변경으로 제거 (가입 1000P, 일일 출석 500P 만 유지).

// 리뷰 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyerId = req.user!.id;
    const { sellerId, rating, content, productId } = req.body;

    if (!sellerId || !rating || !content) {
      res.status(400).json({ error: '필수 항목을 입력해주세요.' });
      return;
    }

    // 정수 타입 가드 — "abc" 같은 값이 NaN 비교 (NaN<1 false) 로 검증을 우회해
    // Prisma Int 저장 시 500 나는 것 방지.
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ error: '별점은 1~5 사이 정수여야 합니다.' });
      return;
    }

    if (buyerId === sellerId) {
      res.status(400).json({ error: '본인에게 리뷰를 남길 수 없습니다.' });
      return;
    }

    // 거래 검증: productId 필수 + 상품 판매완료 + 채팅 이력 필수
    if (!productId) {
      res.status(400).json({ error: '거래 상품을 지정해야 리뷰를 작성할 수 있습니다.' });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) { res.status(404).json({ error: '상품을 찾을 수 없습니다.' }); return; }
    if (product.userId !== sellerId) {
      res.status(400).json({ error: '판매자 정보가 일치하지 않습니다.' });
      return;
    }
    if (product.status !== 'sold') {
      res.status(400).json({ error: '거래 완료된 상품만 리뷰를 작성할 수 있습니다.' });
      return;
    }

    // 구매자와 판매자 간 채팅 이력 확인
    const [u1, u2] = [buyerId, sellerId].sort();
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    });
    if (!chatRoom) {
      res.status(403).json({ error: '거래 상대와 채팅한 이력이 있어야 리뷰를 작성할 수 있습니다.' });
      return;
    }

    // 중복 리뷰 방지 (같은 상품에 대해 같은 구매자가 여러 번 쓰는 것 방지)
    const existing = await prisma.review.findFirst({ where: { buyerId, sellerId, productId } });
    if (existing) {
      res.status(400).json({ error: '이 거래에 대한 리뷰를 이미 작성하셨습니다.' });
      return;
    }

    const cleanContent = sanitizeText(content, 2000);
    if (!cleanContent) { res.status(400).json({ error: '리뷰 내용을 입력해주세요.' }); return; }

    const review = await prisma.review.create({
      data: {
        rating: ratingNum,
        content: cleanContent,
        sellerId,
        buyerId,
        productId: productId || null,
      },
      include: {
        buyer: { select: { id: true, name: true, profileImage: true } },
      },
    });

    const title = '새 리뷰';
    const body = `${review.buyer.name}님이 별점 ${review.rating}점 리뷰를 남겼습니다.`;
    const link = `/profile/${sellerId}`;
    await createNotification(sellerId, 'system', title, body, link);
    sendPushToUser(sellerId, title, body, link);

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

// 내가 거래 후 리뷰 안 쓴 건 모두 조회 — 거래 후 리뷰 강제 모달용.
// 내가 채팅한 모든 상대 중, sold 매물이 있고, 그 매물에 내가 리뷰 안 쓴 것.
router.get('/pending-for-me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const rooms = await prisma.chatRoom.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { user1Id: true, user2Id: true },
      take: 200,
    });
    const partnerIds = Array.from(new Set(
      rooms.map((r) => (r.user1Id === userId ? r.user2Id : r.user1Id)).filter((id) => id !== userId),
    ));
    if (partnerIds.length === 0) { res.json({ pending: [] }); return; }

    const soldProducts = await prisma.product.findMany({
      where: { userId: { in: partnerIds }, status: 'sold' },
      select: { id: true, name: true, price: true, image: true, userId: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    if (soldProducts.length === 0) { res.json({ pending: [] }); return; }

    const reviewed = await prisma.review.findMany({
      where: { buyerId: userId, productId: { in: soldProducts.map((p) => p.id) } },
      select: { productId: true },
    });
    const reviewedIds = new Set(reviewed.map((r) => r.productId));
    const eligible = soldProducts.filter((p) => !reviewedIds.has(p.id));

    const sellerIds = Array.from(new Set(eligible.map((p) => p.userId).filter(Boolean) as string[]));
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true, nickname: true, profileImage: true, role: true },
    });
    const sellerById = new Map(sellers.map((s) => [s.id, s]));

    const pending = eligible.slice(0, 5).map((p) => ({
      productId: p.id,
      productName: p.name,
      productPrice: p.price,
      productImage: p.image,
      sellerId: p.userId,
      seller: p.userId ? sellerById.get(p.userId) || null : null,
      soldAt: p.updatedAt,
    })).filter((x) => x.seller && x.seller.role !== 'deleted');

    res.json({ pending });
  } catch (error) {
    console.error('Pending reviews error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
});

// 리뷰 작성 가능한 상품 목록 조회 (sold + 채팅이력 + 미작성)
router.get('/eligible', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyerId = req.user!.id;
    const { sellerId } = req.query;
    if (!sellerId) { res.status(400).json({ error: 'sellerId가 필요합니다.' }); return; }
    if (buyerId === sellerId) { res.json({ products: [] }); return; }

    const [u1, u2] = [buyerId, sellerId as string].sort();
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    });
    if (!chatRoom) { res.json({ products: [] }); return; }

    const soldProducts = await prisma.product.findMany({
      where: { userId: sellerId as string, status: 'sold' },
      select: { id: true, name: true, price: true, image: true },
      orderBy: { updatedAt: 'desc' },
    });
    const reviewed = await prisma.review.findMany({
      where: { buyerId, sellerId: sellerId as string, productId: { in: soldProducts.map(p => p.id) } },
      select: { productId: true },
    });
    const reviewedIds = new Set(reviewed.map(r => r.productId));
    const eligible = soldProducts.filter(p => !reviewedIds.has(p.id));
    res.json({ products: eligible });
  } catch (error) {
    console.error('Eligible review products error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
});

export default router;
