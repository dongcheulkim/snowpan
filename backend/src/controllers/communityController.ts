import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { createNotification } from './notificationController';
import { cacheGet, cacheSet } from '../utils/cache';
import { sendPushToUser } from '../utils/push';
import { sanitizeText } from '../utils/sanitize';
import jwt from 'jsonwebtoken';

// UUID v4 검증 — 'categories', 'votes' 같은 단어가 :id 자리에 들어와도
// Prisma 가 던지는 500 대신 즉시 404 반환.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 조회수 어뷰징 방지 — (게시글, 사용자|IP) 쌍 기준 30분 dedup.
// LRU 흉내 — 5000건 넘으면 오래된 항목 정리. 인스턴스 메모리만 사용 (재시작 시 초기화).
const recentViews = new Map<string, number>();
const VIEW_DEDUP_MS = 30 * 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of recentViews) {
    if (now - ts > VIEW_DEDUP_MS) recentViews.delete(k);
  }
  if (recentViews.size > 5000) {
    // 너무 많이 쌓이면 절반 제거 (가장 먼저 등록된 것).
    const keysToDelete = Array.from(recentViews.keys()).slice(0, recentViews.size - 2500);
    for (const k of keysToDelete) recentViews.delete(k);
  }
}, 5 * 60_000);

const resolveDisplayName = (user: { name: string; nickname?: string | null }) =>
  user.nickname || user.name;

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sport, category, userId, search, limit, offset } = req.query;

    // Cache key based on query params
    const cacheKey = `posts:${JSON.stringify({ sport, category, userId, search, limit, offset })}`;
    const cached = cacheGet<{ posts: unknown[]; totalCount: number }>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const where: any = {};
    if (sport) where.sport = sport as string;
    if (category && category !== 'all') where.category = category as string;
    if (userId) where.userId = userId as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        take,
        ...(skip && { skip }),
        include: {
          user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved' }, select: { badgeType: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.post.count({ where }),
    ]);

    const result = {
      posts: posts.map(p => ({
        ...p,
        user: { ...p.user, name: resolveDisplayName(p.user), badges: (p.user as any).activeBadge ? [( p.user as any).activeBadge] : [], badgeRequests: undefined },
        commentCount: p._count.comments,
        _count: undefined,
      })),
      totalCount,
    };
    cacheSet(cacheKey, result, 10); // Cache for 10 seconds
    res.json(result);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: '게시글 조회 중 오류가 발생했습니다.' });
  }
};

// 인기 게시글 (최근 7일, 좋아요+조회수 기준 상위 10개)
export const getPopularPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sport } = req.query;

    const cacheKey = `posts:popular:${sport || 'all'}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) { res.json(cached); return; }

    const where: any = {};
    if (sport) where.sport = sport as string;

    // 최근 7일 인기글 먼저, 부족하면 전체에서 채움
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let posts = await prisma.post.findMany({
      where: { ...where, createdAt: { gte: oneWeekAgo } },
      take: 10,
      include: {
        user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved' }, select: { badgeType: true } } } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ likes: 'desc' }, { views: 'desc' }],
    });

    if (posts.length < 10) {
      const existingIds = posts.map(p => p.id);
      const more = await prisma.post.findMany({
        where: { ...where, id: { notIn: existingIds } },
        take: 10 - posts.length,
        include: {
          user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved' }, select: { badgeType: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ likes: 'desc' }, { views: 'desc' }],
      });
      posts = [...posts, ...more];
    }

    const result = posts.map(p => ({
      ...p,
      user: { ...p.user, name: resolveDisplayName(p.user), badges: (p.user as any).activeBadge ? [( p.user as any).activeBadge] : [], badgeRequests: undefined },
      commentCount: p._count.comments,
      _count: undefined,
    }));

    cacheSet(cacheKey, result, 60);
    res.json(result);
  } catch (error) {
    console.error('Get popular posts error:', error);
    res.status(500).json({ error: '인기 게시글 조회 중 오류가 발생했습니다.' });
  }
};

export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      return;
    }

    // 토큰에서 userId 추출 (선택적)
    let currentUserId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!, {
          algorithms: ['HS256'],
          ignoreExpiration: false,
        }) as { userId: string; type?: string };
        // refresh 토큰을 access 자리에 넣는 공격 방어.
        if (!decoded.type || decoded.type === 'access') currentUserId = decoded.userId;
      } catch { /* 만료/위조 토큰은 비로그인 처리 */ }
    }

    // 조회수 어뷰징 방지 — 같은 (userId|IP) 가 같은 글을 30분 내 재조회 시 카운트 X.
    // 본인 새로고침 도배 / 봇 자동조회 차단. 메모리 캐시 (재시작 시 초기화 OK).
    // 존재하지 않는 글이면 update 가 P2025 throw 하므로 catch 해서 무시 (findUnique 에서 404 처리).
    const viewerKey = currentUserId || req.header('cf-connecting-ip') || req.header('x-real-ip') || req.ip || 'anon';
    const dedupKey = `view:${id}:${viewerKey}`;
    if (!recentViews.has(dedupKey)) {
      recentViews.set(dedupKey, Date.now());
      try {
        await prisma.post.update({ where: { id }, data: { views: { increment: 1 } } });
      } catch { /* 글 없음 → 아래 findUnique 에서 404 처리 */ }
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved' }, select: { badgeType: true } } } },
        comments: {
          include: { user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved' }, select: { badgeType: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) {
      res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      return;
    }

    let liked = false;
    if (currentUserId) {
      const existing = await prisma.postLike.findUnique({
        where: { postId_userId: { postId: id, userId: currentUserId } },
      });
      liked = !!existing;
    }

    const postWithBadges = {
      ...post,
      user: { ...post.user, name: resolveDisplayName(post.user), badges: post.user.badgeRequests.map((b: any) => b.badgeType), badgeRequests: undefined },
      comments: post.comments.map((c: any) => ({
        ...c,
        user: { ...c.user, name: resolveDisplayName(c.user), badges: c.user.badgeRequests.map((b: any) => b.badgeType), badgeRequests: undefined },
      })),
      liked,
    };
    res.json(postWithBadges);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: '게시글 조회 중 오류가 발생했습니다.' });
  }
};

export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, content, category, sport, images } = req.body;

    if (!title || !content || !category || !sport) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }

    // 카테고리 화이트리스트 — 'poll' 은 PollCreate 라우트에서만 허용.
    const allowedCategories = ['free', 'review', 'gear', 'resort', 'tip', 'carpool', 'meetup'];
    if (!allowedCategories.includes(category)) {
      res.status(400).json({ error: '유효하지 않은 카테고리입니다.' });
      return;
    }
    if (!['ski', 'board'].includes(sport)) {
      res.status(400).json({ error: '유효하지 않은 종목입니다.' });
      return;
    }

    // 클라이언트와 한도 일치: 제목 50자, 본문 5000자.
    // sanitize 전 원본 길이 검증 — 사용자가 의도적으로 큰 입력 보낸 경우 truncate 대신 거절.
    if (typeof title !== 'string' || typeof content !== 'string') {
      res.status(400).json({ error: '제목과 내용은 문자열이어야 합니다.' });
      return;
    }
    if (title.length > 50) {
      res.status(400).json({ error: `제목은 50자 이내여야 합니다. (현재 ${title.length}자)` });
      return;
    }
    if (content.length > 5000) {
      res.status(400).json({ error: `내용은 5000자 이내여야 합니다. (현재 ${content.length}자)` });
      return;
    }

    const cleanTitle = sanitizeText(title, 50);
    const cleanContent = sanitizeText(content, 5000);
    if (!cleanTitle || !cleanContent) {
      res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
      return;
    }
    if (cleanTitle.length < 2) {
      res.status(400).json({ error: '제목은 2자 이상이어야 합니다.' });
      return;
    }

    // 중복 게시글 차단 — 같은 사용자가 같은 제목+내용을 5분 내 재등록 시 도배로 간주.
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
    const dupe = await prisma.post.findFirst({
      where: {
        userId,
        title: cleanTitle,
        content: cleanContent,
        createdAt: { gte: fiveMinAgo },
      },
      select: { id: true },
    });
    if (dupe) {
      res.status(409).json({ error: '같은 내용의 글이 방금 등록되었습니다. 잠시 후 다시 시도해주세요.' });
      return;
    }

    const post = await prisma.post.create({
      data: { title: cleanTitle, content: cleanContent, category, sport, userId, images: images || null },
      include: { user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved' }, select: { badgeType: true } } } } },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: '게시글 등록 중 오류가 발생했습니다.' });
  }
};

export const likePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    if (!UUID_RE.test(id)) {
      res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      return;
    }

    // 셀프 좋아요 차단 — 본인 글 좋아요로 인기 조작 방지.
    const post = await prisma.post.findUnique({ where: { id }, select: { userId: true } });
    if (!post) { res.status(404).json({ error: '게시글을 찾을 수 없습니다.' }); return; }
    if (post.userId === userId) {
      res.status(400).json({ error: '본인 글에는 좋아요를 누를 수 없습니다.' });
      return;
    }

    // race condition 방지 — find→create/delete 분리 시 동시 요청이 양쪽 분기 동시 실행해
    // likes 카운터가 ±2 되거나 unique 위반 발생.
    // 해결: postLike 의 unique 제약 (postId_userId) 을 락처럼 사용해서
    //   1) create 먼저 시도 → 성공이면 좋아요 추가
    //   2) 실패 (unique violation) 면 delete → 좋아요 취소
    // 같은 트랜잭션 안에서 likes 카운터도 같이 증감 → 원자성 보장.
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.postLike.create({ data: { postId: id, userId } });
        const post = await tx.post.update({
          where: { id },
          data: { likes: { increment: 1 } },
        });
        return { likes: post.likes, liked: true };
      });
      res.json(result);
      return;
    } catch (e: any) {
      // P2002 = Prisma unique constraint violation → 이미 좋아요 누른 상태 → 취소.
      if (e?.code !== 'P2002') throw e;
    }

    const result = await prisma.$transaction(async (tx) => {
      // deleteMany 는 0 행 삭제도 throw 안 함 → 동시 cancel 두 번 들어와도 안전.
      const del = await tx.postLike.deleteMany({ where: { postId: id, userId } });
      if (del.count === 0) {
        // 그 사이 다른 요청이 먼저 취소함 — 카운터 건드리지 않고 현재값 반환.
        const post = await tx.post.findUnique({ where: { id }, select: { likes: true } });
        return { likes: post?.likes ?? 0, liked: false };
      }
      const post = await tx.post.update({
        where: { id },
        data: { likes: { decrement: 1 } },
      });
      return { likes: post.likes, liked: false };
    });
    res.json(result);
    return;
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다.' });
  }
};

export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: postId } = req.params;
    const { content } = req.body;

    if (!UUID_RE.test(postId)) {
      res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      return;
    }

    if (typeof content !== 'string') {
      res.status(400).json({ error: '댓글은 문자열이어야 합니다.' });
      return;
    }
    if (content.length > 2000) {
      res.status(400).json({ error: `댓글은 2000자 이내여야 합니다. (현재 ${content.length}자)` });
      return;
    }
    const cleanContent = sanitizeText(content, 2000);
    if (!cleanContent) {
      res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
      return;
    }
    if (cleanContent.length < 1) {
      res.status(400).json({ error: '댓글은 1자 이상이어야 합니다.' });
      return;
    }

    // 게시글 존재 확인 — 없는 postId 로 댓글 생성 차단.
    const targetPost = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true, title: true } });
    if (!targetPost) {
      res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      return;
    }

    // 중복 댓글 차단 — 같은 글에 같은 내용을 1분 내 반복 시 도배로 간주.
    const oneMinAgo = new Date(Date.now() - 60_000);
    const dupe = await prisma.comment.findFirst({
      where: { userId, postId, content: cleanContent, createdAt: { gte: oneMinAgo } },
      select: { id: true },
    });
    if (dupe) {
      res.status(409).json({ error: '같은 댓글이 방금 등록되었습니다.' });
      return;
    }

    const comment = await prisma.comment.create({
      data: { content: cleanContent, postId, userId },
      include: { user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved' }, select: { badgeType: true } } } } },
    });

    // 글 작성자에게 알림 (본인 댓글은 제외) — targetPost 재사용.
    if (targetPost.userId !== userId) {
      const title = '새 댓글';
      const body = `'${targetPost.title}' 글에 댓글이 달렸습니다: "${cleanContent.slice(0, 30)}"`;
      const link = `/community/post/${postId}`;
      await createNotification(targetPost.userId, 'community', title, body, link);
      sendPushToUser(targetPost.userId, title, body, link);
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: '댓글 등록 중 오류가 발생했습니다.' });
  }
};

export const updatePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) { res.status(404).json({ error: '게시글을 찾을 수 없습니다.' }); return; }
    if (post.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { title, content, category } = req.body;
    const updated = await prisma.post.update({
      where: { id },
      data: { ...(title && { title }), ...(content && { content }), ...(category && { category }) },
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: '수정 중 오류가 발생했습니다.' }); }
};

export const deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) { res.status(404).json({ error: '게시글을 찾을 수 없습니다.' }); return; }
    if (post.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.post.delete({ where: { id } });
    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' }); }
};

// 댓글 삭제 (작성자 또는 관리자)
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) { res.status(404).json({ error: '댓글을 찾을 수 없습니다.' }); return; }
    if (comment.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.comment.delete({ where: { id } });
    res.json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' }); }
};
