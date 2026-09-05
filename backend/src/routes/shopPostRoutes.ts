// 매장 소식(포스트) CRUD — 스키샵/정비/렌탈/레슨/숙소 매니저가 매장 상세에 올리는 글.
// polymorphic ref: shopType + shopId. 소유자만 create/update/delete, 조회는 공개.

import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { maskRowUser, maskRowUserAll } from '../utils/displayName';
import { sanitizeText } from '../utils/sanitize';
import { isAllowedImageUrl } from '../utils/validate';

const router = Router();

const VALID_SHOP_TYPES = ['skishop', 'repair', 'rental', 'lesson', 'accommodation'];
const VALID_POST_TYPES = ['general', 'promo', 'notice', 'event'];

// 각 shop 테이블에서 owner userId 조회 헬퍼.
async function getShopOwner(shopType: string, shopId: string): Promise<string | null> {
  const info = await getShopInfo(shopType, shopId);
  return info?.userId ?? null;
}

// 소유자 + 승인 여부 — 미승인 매장의 소식 작성·공개 차단용
async function getShopInfo(shopType: string, shopId: string): Promise<{ userId: string; approved: boolean } | null> {
  const select = { userId: true, approved: true } as const;
  try {
    switch (shopType) {
      case 'skishop': {
        const row = await prisma.skiShop.findUnique({ where: { id: shopId }, select });
        return row ?? null;
      }
      case 'repair': {
        const row = await prisma.repairShop.findUnique({ where: { id: shopId }, select });
        return row ?? null;
      }
      case 'rental': {
        const row = await prisma.rental.findUnique({ where: { id: shopId }, select });
        return row ?? null;
      }
      case 'lesson': {
        const row = await prisma.lesson.findUnique({ where: { id: shopId }, select });
        return row ?? null;
      }
      case 'accommodation': {
        const row = await prisma.accommodation.findUnique({ where: { id: shopId }, select });
        return row ?? null;
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

    // 미승인(심사 대기·재심사) 매장의 소식은 비공개 — 홈 피드(/recent)와 정책 통일
    const shopInfo = await getShopInfo(shopType, shopId);
    if (!shopInfo?.approved) {
      res.json({ items: [], nextCursor: null });
      return;
    }

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
      items: maskRowUserAll(items),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error('List shop posts error:', err);
    res.status(500).json({ error: '매장 소식 조회 중 오류가 발생했습니다.' });
  }
});

// GET /api/shop-posts/recent — 홈 "매장 소식·이벤트" 피드. 전 매장 최신 소식 (승인 매장만, 매장명 포함).
// 기본: 매장당 최신 1개만 (한 매장이 하루에 여러 개 올려도 다른 매장 소식이 안 밀리게).
// ?all=1: 중복 제거 없이 전체 시간순 — "매장 소식 전체" 페이지용.
router.get('/recent', async (req: Request, res: Response): Promise<void> => {
  try {
    const showAll = req.query.all === '1';
    const limit = Math.min(parseInt(String(req.query.limit || '6'), 10) || 6, 50);
    let posts = await prisma.shopPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: showAll ? limit * 2 : limit * 8, // 매장당 1개 압축·미승인 필터 후에도 limit 를 채우도록 여유
      select: { id: true, title: true, content: true, images: true, postType: true, createdAt: true, shopType: true, shopId: true },
    });
    // 매장당 최신 1개로 압축 (홈 전용 공정 노출)
    if (!showAll) {
      const seen = new Set<string>();
      posts = posts.filter((p) => {
        const k = `${p.shopType}:${p.shopId}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    // 매장명 일괄 해석 — 승인된 매장의 소식만 노출.
    const idsBy: Record<string, string[]> = {};
    for (const p of posts) (idsBy[p.shopType] ||= []).push(p.shopId);
    const names = new Map<string, string>();
    const put = (type: string, rows: { id: string; name: string }[]) => rows.forEach((r) => names.set(`${type}:${r.id}`, r.name));
    if (idsBy.skishop) put('skishop', await prisma.skiShop.findMany({ where: { id: { in: idsBy.skishop }, approved: true }, select: { id: true, name: true } }));
    if (idsBy.repair) put('repair', await prisma.repairShop.findMany({ where: { id: { in: idsBy.repair }, approved: true }, select: { id: true, name: true } }));
    if (idsBy.rental) put('rental', await prisma.rental.findMany({ where: { id: { in: idsBy.rental }, approved: true }, select: { id: true, name: true } }));
    if (idsBy.lesson) put('lesson', await prisma.lesson.findMany({ where: { id: { in: idsBy.lesson }, approved: true }, select: { id: true, name: true } }));
    if (idsBy.accommodation) put('accommodation', await prisma.accommodation.findMany({ where: { id: { in: idsBy.accommodation }, approved: true }, select: { id: true, name: true } }));
    const items = posts
      .filter((p) => names.has(`${p.shopType}:${p.shopId}`))
      .slice(0, limit)
      .map((p) => ({ ...p, shopName: names.get(`${p.shopType}:${p.shopId}`) }));
    res.json({ items });
  } catch (err) {
    console.error('Recent shop posts error:', err);
    res.status(500).json({ error: '소식 조회 중 오류가 발생했습니다.' });
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
    const shopInfo = await getShopInfo(post.shopType, post.shopId);
    if (!shopInfo?.approved) {
      res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });
      return;
    }
    // 조회수 +1 (실패해도 응답은 정상).
    prisma.shopPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => { /* noop */ });
    res.json(maskRowUser(post));
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
      const info = await getShopInfo(shopType, shopId);
      if (!info) {
        res.status(404).json({ error: '매장을 찾을 수 없습니다.' });
        return;
      }
      if (info.userId !== userId) {
        res.status(403).json({ error: '해당 매장의 소유자만 소식을 올릴 수 있어요.' });
        return;
      }
      if (!info.approved) {
        res.status(403).json({ error: '매장 승인 후에 소식을 올릴 수 있어요. 심사 중이라면 조금만 기다려주세요.' });
        return;
      }
      // 매장당 하루 5개 제한 — 소식 도배로 홈 피드 독점하는 것 방지. (admin 은 제한 없음)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const todayCount = await prisma.shopPost.count({
        where: { shopType, shopId, createdAt: { gte: dayAgo } },
      });
      if (todayCount >= 5) {
        res.status(429).json({ error: '매장 소식은 하루 5개까지 올릴 수 있어요. 내일 다시 올려주세요.' });
        return;
      }
    }

    // images 검증 — 콤마 구분 URL, 최대 5장, 허용 호스트만 (외부 추적픽셀·오프사이트 URL 차단)
    let imagesClean: string | null = null;
    if (typeof images === 'string' && images.trim()) {
      const list = images.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
      if (list.some((u) => !isAllowedImageUrl(u))) {
        res.status(400).json({ error: '허용되지 않은 이미지입니다.' });
        return;
      }
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
        if (list.some((u) => !isAllowedImageUrl(u))) {
          res.status(400).json({ error: '허용되지 않은 이미지입니다.' });
          return;
        }
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
