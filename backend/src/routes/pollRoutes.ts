// 투표(Poll) — 서버화. 1인 1표 (PollVote unique) 강제, 집계 서버 계산.
// 이전엔 100% localStorage 라 유저 간 공유 안 되고 조작 가능했음.

import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';
import { pickVertical } from '../utils/vertical';
import { pollCreateLimiter, pollActionLimiter, commentCreateLimiter } from '../middleware/rateLimit';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from '../utils/push';

const router = Router();

// 투표 목록 (공개). vertical 필터, 최신순.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const vertical = pickVertical(req.query.vertical) || 'snow';
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);
    const polls = await prisma.poll.findMany({
      where: { vertical },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, nickname: true } },
        options: { orderBy: { order: 'asc' }, include: { _count: { select: { votes: true } } } },
        _count: { select: { votes: true } },
      },
    });
    res.json({ items: polls.map(shapePoll) });
  } catch (err) {
    console.error('List polls error:', err);
    res.status(500).json({ error: '투표 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 투표 단건 (공개) + 조회수 증가 + 내 투표 여부.
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, nickname: true } },
        options: { orderBy: { order: 'asc' }, include: { _count: { select: { votes: true } } } },
        _count: { select: { votes: true } },
      },
    });
    if (!poll) { res.status(404).json({ error: '투표를 찾을 수 없습니다.' }); return; }
    prisma.poll.update({ where: { id: poll.id }, data: { views: { increment: 1 } } }).catch(() => {});

    // 로그인 사용자면 내 투표 옵션 + 내 좋아요 여부 조회 (Authorization 헤더 있을 때만 — 공개 라우트라 선택적).
    let myVote: string | null = null;
    let myLike = false;
    const auth = req.headers.authorization;
    if (auth) {
      try {
        const token = auth.replace('Bearer ', '');
        const jwt = await import('jsonwebtoken');
        // 토큰 클레임은 userId (id 아님) + HS256 고정. 이전엔 payload.id 를 읽어 myVote 가 항상 null 이었음.
        const payload = jwt.default.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as { userId?: string; type?: string };
        if (payload?.userId && (!payload.type || payload.type === 'access')) {
          const [v, l] = await Promise.all([
            prisma.pollVote.findUnique({
              where: { pollId_userId: { pollId: poll.id, userId: payload.userId } },
              select: { optionId: true },
            }),
            prisma.pollLike.findUnique({
              where: { pollId_userId: { pollId: poll.id, userId: payload.userId } },
              select: { id: true },
            }),
          ]);
          myVote = v?.optionId || null;
          myLike = !!l; // 기존엔 안 내려줘서 새로고침 후 하트가 항상 빈 상태였음
        }
      } catch { /* 비로그인/만료 무시 */ }
    }
    // 댓글 — 닉네임 표시명 + 노출 뱃지 (커뮤니티와 동일 규칙)
    const rawComments = await prisma.pollComment.findMany({
      where: { pollId: poll.id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true } } },
    });
    const comments = rawComments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      user: { id: c.user.id, name: c.user.nickname || c.user.name, badges: c.user.activeBadge ? [c.user.activeBadge] : [], profileImage: c.user.profileImage },
    }));
    res.json({ ...shapePoll(poll), myVote, myLike, comments });
  } catch (err) {
    console.error('Get poll error:', err);
    res.status(500).json({ error: '투표 조회 중 오류가 발생했습니다.' });
  }
});

// 투표 생성 (auth). 옵션 2~6개.
router.post('/', authenticateToken, pollCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, options, vertical } = req.body ?? {};
    const cleanTitle = sanitizeText(title, 100);
    if (!cleanTitle) { res.status(400).json({ error: '제목을 입력해주세요.' }); return; }
    if (!Array.isArray(options)) { res.status(400).json({ error: '옵션이 필요합니다.' }); return; }
    const labels = options
      .map((o: unknown) => sanitizeText(o, 50))
      .filter((s): s is string => !!s)
      .slice(0, 6);
    if (labels.length < 2) { res.status(400).json({ error: '옵션은 2개 이상이어야 합니다.' }); return; }

    const poll = await prisma.poll.create({
      data: {
        title: cleanTitle,
        userId,
        vertical: pickVertical(vertical) || 'snow',
        options: { create: labels.map((label, i) => ({ label, order: i })) },
      },
      include: {
        user: { select: { id: true, name: true, nickname: true } },
        options: { orderBy: { order: 'asc' }, include: { _count: { select: { votes: true } } } },
        _count: { select: { votes: true } },
      },
    });
    res.status(201).json(shapePoll(poll));
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: '투표 생성 중 오류가 발생했습니다.' });
  }
});

// 투표하기 (auth). 1인 1표 — 이미 투표했으면 409. optionId 는 해당 poll 소속이어야 함.
router.post('/:id/vote', authenticateToken, pollActionLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const pollId = req.params.id;
    const { optionId } = req.body ?? {};
    if (typeof optionId !== 'string' || !optionId) { res.status(400).json({ error: '선택지를 골라주세요.' }); return; }

    const option = await prisma.pollOption.findUnique({ where: { id: optionId }, select: { pollId: true } });
    if (!option || option.pollId !== pollId) { res.status(400).json({ error: '유효하지 않은 선택지입니다.' }); return; }

    try {
      await prisma.pollVote.create({ data: { pollId, optionId, userId } });
    } catch (e) {
      // unique 위반 = 이미 투표함.
      if ((e as { code?: string })?.code === 'P2002') {
        res.status(409).json({ error: '이미 투표하셨어요.' });
        return;
      }
      throw e;
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        user: { select: { id: true, name: true, nickname: true } },
        options: { orderBy: { order: 'asc' }, include: { _count: { select: { votes: true } } } },
        _count: { select: { votes: true } },
      },
    });
    res.json({ ...shapePoll(poll!), myVote: optionId });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: '투표 처리 중 오류가 발생했습니다.' });
  }
});

// 좋아요 (auth) — 1인 1회 토글. PollLike 유니크 제약으로 무한 증가 차단.
router.post('/:id/like', authenticateToken, pollActionLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const pollId = req.params.id;
  const userId = req.user!.id;
  try {
    const poll = await prisma.poll.findUnique({ where: { id: pollId }, select: { userId: true } });
    if (!poll) { res.status(404).json({ error: '존재하지 않는 투표입니다.' }); return; }
    if (poll.userId === userId) { res.status(400).json({ error: '본인 투표에는 좋아요를 누를 수 없어요.' }); return; }

    // create 성공 = 새 좋아요(+1), P2002 = 이미 눌렀음 → 토글 오프(-1). 카운터는 원자 증감.
    try {
      await prisma.pollLike.create({ data: { pollId, userId } });
      const updated = await prisma.poll.update({ where: { id: pollId }, data: { likes: { increment: 1 } }, select: { likes: true } });
      res.json({ likes: updated.likes, liked: true });
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2002') {
        await prisma.pollLike.delete({ where: { pollId_userId: { pollId, userId } } });
        const updated = await prisma.poll.update({ where: { id: pollId }, data: { likes: { decrement: 1 } }, select: { likes: true } });
        res.json({ likes: updated.likes, liked: false });
        return;
      }
      throw e;
    }
  } catch (err) {
    res.status(500).json({ error: '좋아요 처리 실패' });
  }
});

// 삭제 (auth + 소유자/admin).
// 댓글 작성 (auth) — 알림: 투표 작성자에게 (본인 제외).
router.post('/:id/comments', authenticateToken, commentCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const pollId = req.params.id;
    const content = sanitizeText(req.body?.content, 1000);
    if (!content) { res.status(400).json({ error: '댓글 내용을 입력해주세요.' }); return; }
    const poll = await prisma.poll.findUnique({ where: { id: pollId }, select: { id: true, userId: true, title: true } });
    if (!poll) { res.status(404).json({ error: '투표를 찾을 수 없습니다.' }); return; }
    // 같은 내용 1분 내 반복 차단 (도배 방지 — 커뮤니티와 동일)
    const oneMinAgo = new Date(Date.now() - 60_000);
    const dupe = await prisma.pollComment.findFirst({ where: { userId, pollId, content, createdAt: { gte: oneMinAgo } }, select: { id: true } });
    if (dupe) { res.status(409).json({ error: '같은 댓글이 방금 등록되었습니다.' }); return; }
    const comment = await prisma.pollComment.create({
      data: { pollId, userId, content },
      include: { user: { select: { id: true, name: true, nickname: true, activeBadge: true, profileImage: true } } },
    });
    if (poll.userId !== userId) {
      const link = `/poll/${pollId}`;
      const body = `'${poll.title}' 투표에 댓글이 달렸습니다: "${content.slice(0, 30)}"`;
      createNotification(poll.userId, 'community', '투표에 새 댓글', body, link).catch(() => {});
      sendPushToUser(poll.userId, '투표에 새 댓글', body, link).catch(() => {});
      const io = req.app.get('io');
      if (io) io.to(`user:${poll.userId}`).emit('new_notification', { type: 'community', title: '투표에 새 댓글', message: body, link });
    }
    res.status(201).json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: { id: comment.user.id, name: comment.user.nickname || comment.user.name, badges: comment.user.activeBadge ? [comment.user.activeBadge] : [], profileImage: comment.user.profileImage },
    });
  } catch (err) {
    console.error('Create poll comment error:', err);
    res.status(500).json({ error: '댓글 등록 중 오류가 발생했습니다.' });
  }
});

// 댓글 삭제 (작성자/관리자)
router.delete('/comments/:commentId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const c = await prisma.pollComment.findUnique({ where: { id: req.params.commentId }, select: { userId: true } });
    if (!c) { res.status(404).json({ error: '댓글을 찾을 수 없습니다.' }); return; }
    if (c.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '작성자만 삭제할 수 있어요.' }); return; }
    await prisma.pollComment.delete({ where: { id: req.params.commentId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '삭제 실패' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const poll = await prisma.poll.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!poll) { res.status(404).json({ error: '투표를 찾을 수 없습니다.' }); return; }
    if (poll.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: '작성자만 삭제할 수 있어요.' });
      return;
    }
    await prisma.poll.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '삭제 실패' });
  }
});

// 응답 정형화 — 프론트가 기대하는 { options: [{id,label,votes,pct}], totalVotes, ... }.
type PollWithCounts = {
  id: string; title: string; likes: number; views: number; createdAt: Date;
  user: { id: string; name: string; nickname: string | null };
  options: { id: string; label: string; _count: { votes: number } }[];
  _count: { votes: number };
};
function shapePoll(poll: PollWithCounts) {
  const total = poll._count.votes;
  return {
    id: poll.id,
    title: poll.title,
    author: poll.user.nickname || poll.user.name,
    authorId: poll.user.id,
    likes: poll.likes,
    views: poll.views,
    totalVotes: total,
    createdAt: poll.createdAt,
    options: poll.options.map((o) => ({
      id: o.id,
      label: o.label,
      votes: o._count.votes,
      pct: total > 0 ? Math.round((o._count.votes / total) * 100) : 0,
    })),
  };
}

export default router;
