import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';
import { reviewCreateLimiter } from '../middleware/rateLimit';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from '../utils/push';

const router = Router();

// 매장 리뷰 — 매장별 1인 1리뷰(조작 방지 핵심). 로그인 계정이면 작성 가능, 사장 본인 차단.
const SHOP_TYPES = ['skishop', 'repair', 'rental', 'lesson', 'accommodation'] as const;
type ShopType = (typeof SHOP_TYPES)[number];
// 매장 상세 경로 (알림 링크용)
const DETAIL_PATH: Record<ShopType, string> = { skishop: '/skishop', repair: '/repair', rental: '/rental', lesson: '/lesson', accommodation: '/accommodation' };

// 매장 존재·소유자 조회 (타입별 모델 매핑)
async function getShopOwner(shopType: ShopType, shopId: string): Promise<{ exists: boolean; ownerId: string | null; approved: boolean }> {
  const sel = { userId: true, approved: true } as const;
  let row: { userId: string | null; approved: boolean } | null = null;
  switch (shopType) {
    case 'skishop': row = await prisma.skiShop.findUnique({ where: { id: shopId }, select: sel }); break;
    case 'repair': row = await prisma.repairShop.findUnique({ where: { id: shopId }, select: sel }); break;
    case 'rental': row = await prisma.rental.findUnique({ where: { id: shopId }, select: sel }); break;
    case 'lesson': row = await prisma.lesson.findUnique({ where: { id: shopId }, select: sel }); break;
    case 'accommodation': row = await prisma.accommodation.findUnique({ where: { id: shopId }, select: sel }); break;
  }
  if (!row) return { exists: false, ownerId: null, approved: false };
  return { exists: true, ownerId: row.userId, approved: row.approved };
}

// 리뷰 목록 + 평균 (공개)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const shopType = String(req.query.shopType || '') as ShopType;
    const shopId = String(req.query.shopId || '');
    if (!SHOP_TYPES.includes(shopType) || !shopId) {
      res.status(400).json({ error: 'shopType 과 shopId 가 필요합니다.' });
      return;
    }
    // 미승인 매장 리뷰는 비노출 — 작성 게이트(approved)와 일관 (매장소식 조회 정책과 동일)
    const shopGate = await getShopOwner(shopType, shopId);
    if (!shopGate.exists || !shopGate.approved) {
      res.json({ reviews: [], averageRating: 0, totalCount: 0 });
      return;
    }
    const [reviews, agg] = await Promise.all([
      prisma.shopReview.findMany({
        where: { shopType, shopId },
        include: { user: { select: { id: true, name: true, nickname: true, profileImage: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.shopReview.aggregate({ where: { shopType, shopId }, _avg: { rating: true }, _count: true }),
    ]);
    // 실명 비노출 — 닉네임 우선, 없으면 익명 라벨 (커뮤니티·중고 정책 통일)
    const shaped = reviews.map((r) => ({
      ...r,
      user: r.user ? { ...r.user, name: r.user.nickname || '스노우판 회원' } : r.user,
    }));
    res.json({ reviews: shaped, averageRating: agg._avg.rating || 0, totalCount: agg._count });
  } catch (e) {
    console.error('Get shop reviews error:', e);
    res.status(500).json({ error: '리뷰 조회 중 오류가 발생했습니다.' });
  }
});

// 리뷰 작성 (auth) — 매장별 1인 1회, 휴대폰 인증 계정, 사장 본인 차단
router.post('/', authenticateToken, reviewCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { shopType, shopId, rating, content } = req.body;
    const noun = shopType === 'lesson' ? '레슨' : '매장'; // 레슨은 '매장'이 아니라 '레슨' 으로 안내 (2026-09-22)
    if (!SHOP_TYPES.includes(shopType) || !shopId) {
      res.status(400).json({ error: 'shopType 과 shopId 를 확인해주세요.' });
      return;
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ error: '별점은 1~5 사이 정수여야 합니다.' });
      return;
    }
    const cleanContent = sanitizeText(content, 1000);
    if (!cleanContent || cleanContent.trim().length < 5) {
      res.status(400).json({ error: '리뷰 내용을 5자 이상 입력해주세요.' });
      return;
    }

    // 로그인만 하면 작성 가능 — 2026-09-22 사용자 결정 (카카오·애플 로그인이라 휴대폰 인증 단계가 없음).
    // 조작 방지는 매장별 1인 1리뷰 + 사장 본인 차단 + 작성 속도 제한(reviewCreateLimiter)으로.

    const shop = await getShopOwner(shopType, shopId);
    if (!shop.exists || !shop.approved) {
      res.status(404).json({ error: `${noun}을 찾을 수 없습니다.` });
      return;
    }
    // 사장 본인은 자기 매장에 리뷰 불가 (자작 리뷰 차단)
    if (shop.ownerId && shop.ownerId === userId) {
      res.status(400).json({ error: `본인 ${noun}에는 리뷰를 작성할 수 없어요.` });
      return;
    }

    // 매장별 1인 1리뷰 — unique 제약(shopType,shopId,userId)이 최종 방어, 여기선 친절한 메시지
    const existing = await prisma.shopReview.findUnique({
      where: { shopType_shopId_userId: { shopType, shopId, userId } },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: `이미 이 ${noun}에 리뷰를 남기셨어요. 한 ${noun}에는 한 번만 작성할 수 있습니다.` });
      return;
    }

    const created = await prisma.shopReview.create({
      data: { shopType, shopId, userId, rating: ratingNum, content: cleanContent },
      include: { user: { select: { id: true, name: true, nickname: true, profileImage: true } } },
    });
    // 사장님에게 새 리뷰 알림 (앱 푸시 + 알림함) — 답글을 유도. 2026-09-22
    if (shop.ownerId) {
      const title = '새 리뷰가 달렸어요';
      const body = `${created.user?.nickname || '스노우판 회원'}님이 별점 ${ratingNum}점 리뷰를 남겼어요. 답글을 달아 보세요.`;
      const link = `${DETAIL_PATH[shopType as ShopType]}/${shopId}`;
      createNotification(shop.ownerId, 'system', title, body, link).catch(() => undefined);
      sendPushToUser(shop.ownerId, title, body, link).catch(() => undefined);
    }
    res.status(201).json({
      ...created,
      user: created.user ? { ...created.user, name: created.user.nickname || '스노우판 회원' } : created.user,
    });
  } catch (e) {
    // unique 제약 위반(동시 요청) — 중복으로 응답
    if ((e as { code?: string })?.code === 'P2002') {
      res.status(409).json({ error: `이미 이 ${req.body?.shopType === 'lesson' ? '레슨' : '매장'}에 리뷰를 남기셨어요.` });
      return;
    }
    console.error('Create shop review error:', e);
    res.status(500).json({ error: '리뷰 작성 중 오류가 발생했습니다.' });
  }
});

// 사장님 답글 (2026-09-22) — 매장·레슨 소유자(또는 관리자)만, 500자. 빈 내용이면 답글 삭제. 첫 답글 때 리뷰 작성자에게 알림.
router.put('/:id/reply', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await prisma.shopReview.findUnique({ where: { id: req.params.id }, select: { id: true, shopType: true, shopId: true, userId: true, ownerReply: true } });
    if (!review) { res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' }); return; }
    const shopType = review.shopType as ShopType;
    const shop = await getShopOwner(shopType, review.shopId);
    if (!shop.exists) { res.status(404).json({ error: '매장을 찾을 수 없습니다.' }); return; }
    const isOwner = !!shop.ownerId && shop.ownerId === req.user!.id;
    if (!isOwner && req.user!.role !== 'admin') {
      res.status(403).json({ error: shopType === 'lesson' ? '레슨 강사만 답글을 달 수 있어요.' : '매장 사장님만 답글을 달 수 있어요.' });
      return;
    }
    const text = (sanitizeText(req.body?.content, 500) || '').trim();
    if (!text) {
      const cleared = await prisma.shopReview.update({ where: { id: review.id }, data: { ownerReply: null, ownerRepliedAt: null } });
      res.json({ ...cleared, message: '답글을 지웠어요.' });
      return;
    }
    if (text.length < 2) { res.status(400).json({ error: '답글을 2자 이상 입력해 주세요.' }); return; }
    const updated = await prisma.shopReview.update({ where: { id: review.id }, data: { ownerReply: text, ownerRepliedAt: new Date() } });
    if (!review.ownerReply) {
      const title = shopType === 'lesson' ? '강사님이 내 리뷰에 답글을 남겼어요' : '사장님이 내 리뷰에 답글을 남겼어요';
      const link = `${DETAIL_PATH[shopType]}/${review.shopId}`;
      createNotification(review.userId, 'system', title, text.slice(0, 80), link).catch(() => undefined);
      sendPushToUser(review.userId, title, text.slice(0, 80), link).catch(() => undefined);
    }
    res.json({ ...updated, message: '답글을 남겼어요.' });
  } catch (e) {
    console.error('Reply shop review error:', e);
    res.status(500).json({ error: '답글 저장 중 오류가 발생했습니다.' });
  }
});

// 내 리뷰 삭제 (본인만)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await prisma.shopReview.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!review) { res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' }); return; }
    if (review.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: '본인 리뷰만 삭제할 수 있습니다.' });
      return;
    }
    await prisma.shopReview.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete shop review error:', e);
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
