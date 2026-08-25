import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { createNotification } from './notificationController';
import { cacheGet, cacheSet } from '../utils/cache';
import { sendPushToUser } from '../utils/push';
import { sanitizeText } from '../utils/sanitize';
import { pickVertical } from '../utils/vertical';
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
    const { sport, category, userId, search, limit, offset, vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    const cacheKey = `posts:${verticalSlug}:${JSON.stringify({ sport, category, userId, search, limit, offset })}`;
    const cached = cacheGet<{ posts: unknown[]; totalCount: number }>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // userId 조회(내 게시글)는 버티컬 무관 전체 — 다른 버티컬에서 쓴 글도 관리 가능하게.
    const where: any = typeof userId === 'string' && userId ? {} : { vertical: verticalSlug };
    // 배열 파라미터(?sport=a&sport=b) 는 문자열만 통과 — Prisma 예외로 500 나는 것 방지.
    const sportStr = typeof sport === 'string' ? sport : undefined;
    const categoryStr = typeof category === 'string' ? category : undefined;
    const userIdStr = typeof userId === 'string' ? userId : undefined;
    const searchStr = typeof search === 'string' ? search : undefined;
    // sport 필터 시 공용(sport='all', 공지) 글도 함께 노출 — 스키·보드 양쪽에 뜨게.
    if (sportStr) where.sport = { in: [sportStr, 'all'] };
    if (categoryStr && categoryStr !== 'all') {
      // 콤마 목록 지원 — 구인구직 통합 탭(job,jobseek) 등
      const cats = categoryStr.split(',').filter(Boolean);
      where.category = cats.length > 1 ? { in: cats } : cats[0];
    }
    if (userIdStr) where.userId = userIdStr;
    if (searchStr) {
      where.OR = [
        { title: { contains: searchStr, mode: 'insensitive' } },
        { content: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    const takeParsed = parseInt(limit as string, 10);
    const take = Number.isFinite(takeParsed) && takeParsed > 0 ? Math.min(takeParsed, 100) : 50;
    const skipParsed = parseInt(offset as string, 10);
    const skip = Number.isFinite(skipParsed) && skipParsed > 0 ? skipParsed : undefined;

    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        take,
        ...(skip && { skip }),
        include: {
          user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved', vertical: 'snow' }, select: { badgeType: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], // 공지(pinned) 상단 고정
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
    const { sport, vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    // 배열 파라미터는 문자열만 통과 — ?sport=a&sport=b 가 Prisma 예외로 500 나는 것 방지 (getPosts 와 동일)
    const sportStr = typeof sport === 'string' ? sport : undefined;
    const cacheKey = `posts:popular:${verticalSlug}:${sportStr || 'all'}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) { res.json(cached); return; }

    const where: any = { vertical: verticalSlug };
    // getPosts 와 동일하게 공용(sport='all') 글 포함 — 공지가 핫 랭킹에서 빠지던 비일관 해소
    if (sportStr) where.sport = { in: [sportStr, 'all'] };

    // 최근 7일 인기글 먼저, 부족하면 전체에서 채움
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let posts = await prisma.post.findMany({
      where: { ...where, createdAt: { gte: oneWeekAgo } },
      take: 10,
      include: {
        user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved', vertical: 'snow' }, select: { badgeType: true } } } },
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
          user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved', vertical: 'snow' }, select: { badgeType: true } } } },
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
    const viewerKey = currentUserId || req.ip || 'anon'; // 위조 가능한 IP 헤더 대신 req.ip 만 사용
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
        user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved', vertical: 'snow' }, select: { badgeType: true } } } },
        comments: {
          include: { user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved', vertical: 'snow' }, select: { badgeType: true } } } } },
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

    // 노출은 사용자가 선택한 뱃지(activeBadge) 하나만 — 게시글·댓글 동일 규칙.
    const postWithBadges = {
      ...post,
      user: { ...post.user, name: resolveDisplayName(post.user), badges: post.user.activeBadge ? [post.user.activeBadge] : [], badgeRequests: undefined },
      comments: post.comments.map((c: any) => ({
        ...c,
        user: { ...c.user, name: resolveDisplayName(c.user), badges: c.user.activeBadge ? [c.user.activeBadge] : [], badgeRequests: undefined },
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
    const { title, content, category, sport, images, vertical } = req.body;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    if (!title || !content || !category || !sport) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }

    // 카테고리 화이트리스트. 'notice'(공지)는 관리자 전용.
    const allowedCategories = ['free', 'review', 'gear', 'resort', 'tip', 'carpool', 'meetup', 'job', 'jobseek', 'notice'];
    if (!allowedCategories.includes(category)) {
      res.status(400).json({ error: '유효하지 않은 카테고리입니다.' });
      return;
    }
    const isNotice = category === 'notice';
    if (isNotice && req.user!.role !== 'admin') {
      res.status(403).json({ error: '공지사항은 관리자만 작성할 수 있습니다.' });
      return;
    }
    // sport: snow=ski/board, bike=road/mtb, run=road/trail, etc. — vertical 안에서 자유롭게 (검증 약화)
    if (typeof sport !== 'string' || sport.length > 20) {
      res.status(400).json({ error: '유효하지 않은 종목입니다.' });
      return;
    }
    // 'all'(모든 필터에 노출)은 관리자 공지 전용 — 일반 유저가 sport='all'로 전 필터 도배하는 것 차단.
    if (!isNotice && sport === 'all') {
      res.status(400).json({ error: '종목을 선택해주세요.' });
      return;
    }
    // 공지는 스키·보드 공용(sport='all')으로 저장하고 상단 고정.
    const finalSport = isNotice ? 'all' : sport;
    const finalPinned = isNotice;

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
    // images 는 콤마 구분 URL 문자열만 허용 — 배열/객체/과대 입력은 거절 (미검증 시 Prisma 500).
    if (images !== undefined && images !== null && (typeof images !== 'string' || images.length > 2000)) {
      res.status(400).json({ error: '이미지 형식이 올바르지 않습니다.' });
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
      data: { title: cleanTitle, content: cleanContent, category, sport: finalSport, pinned: finalPinned, vertical: verticalSlug, userId, images: images || null },
      include: { user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved', vertical: verticalSlug }, select: { badgeType: true } } } } },
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

    // 본인 글 좋아요 허용 — 어차피 1인 1개라 조작 여지 없음 (인스타 등 통상 UX). 존재 확인만 한다.
    const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
    if (!post) { res.status(404).json({ error: '게시글을 찾을 수 없습니다.' }); return; }

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

    // 대댓글 — 부모 댓글 검증. 답글의 답글은 같은 부모에 붙여 2단계로 평탄화 (유튜브/당근 방식).
    const { parentId: rawParentId } = req.body as { parentId?: unknown };
    let parentId: string | null = null;
    let replyTargetUserId: string | null = null; // 답글 대상(부모 댓글 작성자) 알림용
    if (rawParentId) {
      if (typeof rawParentId !== 'string' || !UUID_RE.test(rawParentId)) {
        res.status(400).json({ error: '답글 대상 댓글이 올바르지 않습니다.' });
        return;
      }
      const parent = await prisma.comment.findUnique({
        where: { id: rawParentId },
        select: { id: true, postId: true, parentId: true, userId: true },
      });
      if (!parent || parent.postId !== postId) {
        res.status(404).json({ error: '답글 대상 댓글을 찾을 수 없습니다.' });
        return;
      }
      parentId = parent.parentId || parent.id; // 2단계 평탄화
      replyTargetUserId = parent.userId;
    }

    const comment = await prisma.comment.create({
      data: { content: cleanContent, postId, userId, parentId },
      include: { user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true, badgeRequests: { where: { status: 'approved', vertical: 'snow' }, select: { badgeType: true } } } } },
    });

    // 알림 — 글 작성자 + (대댓글이면) 부모 댓글 작성자. 본인 제외·중복 제거.
    const link = `/community/post/${postId}`;
    const io = req.app.get('io');
    const notifyTargets = new Map<string, { title: string; body: string }>();
    if (targetPost.userId !== userId) {
      notifyTargets.set(targetPost.userId, {
        title: '새 댓글',
        body: `'${targetPost.title}' 글에 댓글이 달렸습니다: "${cleanContent.slice(0, 30)}"`,
      });
    }
    if (replyTargetUserId && replyTargetUserId !== userId) {
      // 부모 댓글 작성자가 글 작성자와 같으면 답글 알림 하나로 대체 (중복 방지)
      notifyTargets.set(replyTargetUserId, {
        title: '내 댓글에 답글',
        body: `내 댓글에 답글이 달렸습니다: "${cleanContent.slice(0, 30)}"`,
      });
    }
    for (const [uid, n] of notifyTargets) {
      await createNotification(uid, 'community', n.title, n.body, link);
      sendPushToUser(uid, n.title, n.body, link);
      // 접속 중이면 벨 카운트 실시간 갱신 (채팅과 동일 패턴 — 기존엔 emit 누락으로 새로고침 전까지 안 떴음)
      if (io) io.to(`user:${uid}`).emit('new_notification', { type: 'community', title: n.title, message: n.body, link });
    }

    // 응답도 목록·상세와 동일 형태로 — 닉네임 표시명 + 선택 뱃지(activeBadge)만.
    // (매핑 없이 raw 로 주면 방금 단 댓글엔 뱃지/닉네임이 안 떠 새로고침 필요했음)
    const shaped = {
      ...comment,
      user: {
        ...comment.user,
        name: resolveDisplayName(comment.user),
        badges: comment.user.activeBadge ? [comment.user.activeBadge] : [],
        badgeRequests: undefined,
      },
    };
    res.status(201).json(shaped);
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

    const { title, content, category, images } = req.body;
    // create 와 동일한 검증 — sanitize + 길이 제한 + 카테고리 화이트리스트.
    // (이전엔 update 만 검증 누락되어 저장형 XSS/남용 경로였음)
    const data: { title?: string; content?: string; category?: string; images?: string | null } = {};
    // images — create 와 동일 규칙 (콤마 구분 URL 문자열, 과대 입력 거절). null/'' = 전체 삭제.
    if (images !== undefined) {
      if (images === null || images === '') data.images = null;
      else if (typeof images === 'string' && images.length <= 2000) data.images = images;
      else { res.status(400).json({ error: '이미지 형식이 올바르지 않습니다.' }); return; }
    }
    if (title !== undefined) {
      const clean = sanitizeText(title, 50);
      if (!clean) { res.status(400).json({ error: '제목을 입력해주세요.' }); return; }
      data.title = clean;
    }
    if (content !== undefined) {
      const clean = sanitizeText(content, 5000);
      if (!clean) { res.status(400).json({ error: '내용을 입력해주세요.' }); return; }
      data.content = clean;
    }
    if (category !== undefined) {
      const allowedCategories = ['free', 'review', 'gear', 'resort', 'tip', 'carpool', 'meetup', 'job', 'jobseek', 'notice'];
      if (!allowedCategories.includes(category)) { res.status(400).json({ error: '유효하지 않은 카테고리입니다.' }); return; }
      if (category === 'notice' && req.user!.role !== 'admin') { res.status(403).json({ error: '공지사항은 관리자만 지정할 수 있습니다.' }); return; }
      data.category = category;
      // 공지 지정/해제 시 고정·공용 상태 동기화 (공지 해제됐는데 상단 고정 남는 것 방지).
      if (category === 'notice') { (data as any).pinned = true; (data as any).sport = 'all'; }
      else if (post.category === 'notice') { (data as any).pinned = false; }
    }
    const updated = await prisma.post.update({ where: { id }, data });
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
