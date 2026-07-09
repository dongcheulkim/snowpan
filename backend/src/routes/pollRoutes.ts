// 투표(Poll) — 서버화. 1인 1표 (PollVote unique) 강제, 집계 서버 계산.
// 이전엔 100% localStorage 라 유저 간 공유 안 되고 조작 가능했음.

import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';
import { pickVertical } from '../utils/vertical';

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

    // 로그인 사용자면 내 투표 옵션 조회 (Authorization 헤더 있을 때만 — 공개 라우트라 선택적).
    let myVote: string | null = null;
    const auth = req.headers.authorization;
    if (auth) {
      try {
        const token = auth.replace('Bearer ', '');
        const jwt = await import('jsonwebtoken');
        const payload = jwt.default.verify(token, process.env.JWT_SECRET!) as { id?: string };
        if (payload?.id) {
          const v = await prisma.pollVote.findUnique({
            where: { pollId_userId: { pollId: poll.id, userId: payload.id } },
            select: { optionId: true },
          });
          myVote = v?.optionId || null;
        }
      } catch { /* 비로그인/만료 무시 */ }
    }
    res.json({ ...shapePoll(poll), myVote });
  } catch (err) {
    console.error('Get poll error:', err);
    res.status(500).json({ error: '투표 조회 중 오류가 발생했습니다.' });
  }
});

// 투표 생성 (auth). 옵션 2~6개.
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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
router.post('/:id/vote', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
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

// 좋아요 (auth) — 단순 증가 (토글 아님, MVP).
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const poll = await prisma.poll.update({
      where: { id: req.params.id },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    });
    res.json({ likes: poll.likes });
  } catch (err) {
    res.status(500).json({ error: '좋아요 처리 실패' });
  }
});

// 삭제 (auth + 소유자/admin).
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
