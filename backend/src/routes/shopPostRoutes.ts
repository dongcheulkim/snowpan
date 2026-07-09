// 매장 소식(포스트) CRUD — 스키샵/정비/렌탈/레슨/숙소 매니저가 매장 상세에 올리는 글.
// polymorphic ref: shopType + shopId. 소유자만 create/update/delete, 조회는 공개.

import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

const VALID_SHOP_TYPES = ['skishop', 'repair', 'rental', 'lesson', 'accommodation'];
const VALID_POST_TYPES = ['general', 'promo', 'notice', 'event'];

// 각 shop 테이블에서 owner userId 조회 헬퍼.
async function getShopOwner(shopType: string, shopId: string): Promise<string | null> {
  const select = { userId: true } as const;
  try {
    switch (shopType) {
      case 'skishop': {
        const row = await prisma.skiShop.findUnique({ where: { id: shopId }, select });
        return row?.userId ?? null;
      }
      case 'repair': {
        const row = await prisma.repairShop.findUnique({ where: { id: shopId }, select });
        return row?.userId ?? null;
      }
      case 'rental': {
        const row = await prisma.rental.findUnique({ where: { id: shopId }, select });
        return row?.userId ?? null;
      }
      case 'lesson': {
        const row = await prisma.lesson.findUnique({ where: { id: shopId }, select });
        return row?.userId ?? null;
      }
      case 'accommodation': {
        const row = await prisma.accommodation.findUnique({ where: { id: shopId }, select });
        return row?.userId ?? null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// GET /api/shop-posts?shopType=&shopId=&limit=&cursor=  — 목록 (공개).
// pinned 우선, 그 다음 최신순.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const shopType = String(req.query.shopType || '');
    const shopId = String(req.query.shopId || '');
    if (!VALID_SHOP_TYPES.includes(shopType) || !shopId) {
      res.status(400).json({ error: 'shopType 과 shopId 가 필요합니다.' });
      return;
    }
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const posts = await prisma.shopPost.findMany({
      where: { shopType, shopId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        user: { select: { id: true, name: true, nickname: true, profileImage: true } },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    res.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error('List shop posts error:', err);
    res.status(500).json({ error: '매장 소식 조회 중 오류가 발생했습니다.' });
  }
});

// GET /api/shop-posts/:id  — 단건 (공개). 조회수 증가.
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await prisma.shopPost.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, nickname: true, profileImage: true } },
      },
    });
    if (!post) {
      res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });
      return;
    }
    // 조회수 +1 (실패해도 응답은 정상).
    prisma.shopPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => { /* noop */ });
    res.json(post);
  } catch (err) {
    console.error('Get shop post error:', err);
    res.status(500).json({ error: '포스트 조회 중 오류가 발생했습니다.' });
  }
});

// POST /api/shop-posts  — 생성 (auth + owner 검증).
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    const { shopType, shopId, title, content, images, postType, pinned } = req.body ?? {};

    if (!VALID_SHOP_TYPES.includes(shopType)) {
      res.status(400).json({ error: '유효하지 않은 shopType 입니다.' });
      return;
    }
    if (typeof shopId !== 'string' || !shopId) {
      res.status(400).json({ error: 'shopId 가 필요합니다.' });
      return;
    }
    const cleanTitle = sanitizeText(title, 100);
    const cleanContent = sanitizeText(content, 5000);
    if (!cleanTitle || !cleanContent) {
      res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
      return;
    }

    // 소유자 검증 — admin 은 어떤 shop 이든 가능.
    if (!isAdmin) {
      const ownerId = await getShopOwner(shopType, shopId);
      if (!ownerId) {
        res.status(404).json({ error: '매장을 찾을 수 없습니다.' });
        return;
      }
      if (ownerId !== userId) {
        res.status(403).json({ error: '해당 매장의 소유자만 소식을 올릴 수 있어요.' });
        return;
      }
    }

    // images 검증 — 콤마 구분 URL, 최대 5장.
    let imagesClean: string | null = null;
    if (typeof images === 'string' && images.trim()) {
      const list = images.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
      imagesClean = list.length ? list.join(',') : null;
    }

    const finalPostType = VALID_POST_TYPES.includes(postType) ? postType : 'general';
    const finalPinned = Boolean(pinned) && isAdmin; // pinned 는 admin 만.

    const post = await prisma.shopPost.create({
      data: {
        shopType,
        shopId,
        userId,
        title: cleanTitle,
        content: cleanContent,
        images: imagesClean,
        postType: finalPostType,
        pinned: finalPinned,
      },
      include: {
        user: { select: { id: true, name: true, nickname: true, profileImage: true } },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Create shop post error:', err);
    res.status(500).json({ error: '포스트 등록 중 오류가 발생했습니다.' });
  }
});

// PUT /api/shop-posts/:id  — 수정 (auth + owner).
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    const id = req.params.id;

    const post = await prisma.shopPost.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!post) {
      res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });
      return;
    }
    if (!isAdmin && post.userId !== userId) {
      res.status(403).json({ error: '작성자만 수정할 수 있어요.' });
      return;
    }

    const { title, content, images, postType, pinned } = req.body ?? {};
    const data: {
      title?: string;
      content?: string;
      images?: string | null;
      postType?: string;
      pinned?: boolean;
    } = {};

    if (title !== undefined) {
      const cleanTitle = sanitizeText(title, 100);
      if (!cleanTitle) { res.status(400).json({ error: '제목을 입력해주세요.' }); return; }
      data.title = cleanTitle;
    }
    if (content !== undefined) {
      const cleanContent = sanitizeText(content, 5000);
      if (!cleanContent) { res.status(400).json({ error: '내용을 입력해주세요.' }); return; }
      data.content = cleanContent;
    }
    if (images !== undefined) {
      if (typeof images === 'string' && images.trim()) {
        const list = images.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
        data.images = list.length ? list.join(',') : null;
      } else {
        data.images = null;
      }
    }
    if (postType !== undefined && VALID_POST_TYPES.includes(postType)) {
      data.postType = postType;
    }
    if (pinned !== undefined && isAdmin) {
      data.pinned = Boolean(pinned);
    }

    const updated = await prisma.shopPost.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, nickname: true, profileImage: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update shop post error:', err);
    res.status(500).json({ error: '포스트 수정 중 오류가 발생했습니다.' });
  }
});

// DELETE /api/shop-posts/:id  — 삭제 (auth + owner).
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    const id = req.params.id;

    const post = await prisma.shopPost.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!post) {
      res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });
      return;
    }
    if (!isAdmin && post.userId !== userId) {
      res.status(403).json({ error: '작성자만 삭제할 수 있어요.' });
      return;
    }
    await prisma.shopPost.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete shop post error:', err);
    res.status(500).json({ error: '포스트 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
