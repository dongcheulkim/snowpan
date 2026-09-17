import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';
import { reviewCreateLimiter } from '../middleware/rateLimit';
import { maskRowUser } from '../utils/displayName';

const router = Router();

// 스키장 후기·별점 (2026-09-17) — 리조트별 1인 1후기 (unique resortId+userId), 다시 쓰면 덮어쓴다.
// 공개 응답에는 닉네임·프로필 사진만 — 실명·이메일·전화번호는 절대 내보내지 않는다 (maskRowUser).
const USER_SELECT = { id: true, name: true, nickname: true, profileImage: true } as const;
const CONTENT_MIN = 5;
const CONTENT_MAX = 500;

type ReviewRow = {
  id: string;
  rating: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; nickname: string | null; profileImage: string | null } | null;
};

function shapeReview(r: ReviewRow) {
  const masked = maskRowUser(r);
  const u = masked.user;
  return {
    id: r.id,
    rating: r.rating,
    content: r.content,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: u ? { id: u.id, name: u.name, profileImage: u.profileImage } : null,
  };
}

async function summarize(resortId: string): Promise<{ avg: number; count: number }> {
  const agg = await prisma.resortReview.aggregate({ where: { resortId }, _avg: { rating: true }, _count: true });
  return { avg: Math.round((agg._avg.rating || 0) * 10) / 10, count: agg._count };
}

async function resortExists(resortId: string): Promise<boolean> {
  if (!resortId) return false;
  const row = await prisma.skiResort.findUnique({ where: { id: resortId }, select: { id: true } });
  return !!row;
}

// 후기 목록 + 평균 (공개). 토큰이 있으면 myReview 도 같이.
router.get('/:resortId', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resortId = String(req.params.resortId || '');
    if (!(await resortExists(resortId))) {
      res.status(404).json({ error: '스키장을 찾을 수 없습니다.' });
      return;
    }
    const limitRaw = parseInt(String(req.query.limit ?? '20'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const [rows, summary, mine] = await Promise.all([
      prisma.resortReview.findMany({
        where: { resortId },
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      summarize(resortId),
      req.user
        ? prisma.resortReview.findUnique({
            where: { resortId_userId: { resortId, userId: req.user.id } },
            select: { id: true, rating: true, content: true, createdAt: true, updatedAt: true },
          })
        : Promise.resolve(null),
    ]);

    res.json({
      avg: summary.avg,
      count: summary.count,
      items: rows.map(shapeReview),
      myReview: mine,
    });
  } catch (e) {
    console.error('Get resort reviews error:', e);
    res.status(500).json({ error: '후기 조회 중 오류가 발생했습니다.' });
  }
});

// 후기 작성·수정 (auth) — 있으면 덮어쓰기(200), 없으면 생성(201)
router.post('/:resortId', authenticateToken, reviewCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const resortId = String(req.params.resortId || '');
    const { rating, content } = (req.body ?? {}) as { rating?: unknown; content?: unknown };

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ error: '별점은 1~5 사이로 골라주세요.' });
      return;
    }
    if (typeof content !== 'string' || content.length > CONTENT_MAX) {
      res.status(400).json({ error: `후기는 ${CONTENT_MAX}자까지 쓸 수 있어요.` });
      return;
    }
    const cleanContent = sanitizeText(content, CONTENT_MAX) || '';
    if (cleanContent.length < CONTENT_MIN) {
      res.status(400).json({ error: `후기를 ${CONTENT_MIN}자 이상 써주세요.` });
      return;
    }

    if (!(await resortExists(resortId))) {
      res.status(404).json({ error: '스키장을 찾을 수 없습니다.' });
      return;
    }

    const existing = await prisma.resortReview.findUnique({
      where: { resortId_userId: { resortId, userId } },
      select: { id: true },
    });

    const review = existing
      ? await prisma.resortReview.update({
          where: { id: existing.id },
          data: { rating: ratingNum, content: cleanContent },
          include: { user: { select: USER_SELECT } },
        })
      : await prisma.resortReview.create({
          data: { resortId, userId, rating: ratingNum, content: cleanContent },
          include: { user: { select: USER_SELECT } },
        });

    const summary = await summarize(resortId);
    res.status(existing ? 200 : 201).json({ ...shapeReview(review), ...summary });
  } catch (e) {
    // 동시 요청으로 unique 충돌 — 한 번 더 시도하라고 안내
    if ((e as { code?: string })?.code === 'P2002') {
      res.status(409).json({ error: '방금 남긴 후기가 있어요. 다시 시도해주세요.' });
      return;
    }
    console.error('Create resort review error:', e);
    res.status(500).json({ error: '후기 저장 중 오류가 발생했습니다.' });
  }
});

// 내 후기 삭제 (auth)
router.delete('/:resortId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const resortId = String(req.params.resortId || '');
    const existing = await prisma.resortReview.findUnique({
      where: { resortId_userId: { resortId, userId } },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: '남긴 후기가 없어요.' });
      return;
    }
    await prisma.resortReview.delete({ where: { id: existing.id } });
    const summary = await summarize(resortId);
    res.json({ success: true, ...summary });
  } catch (e) {
    console.error('Delete resort review error:', e);
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

// 관리자 — 특정 회원의 후기 삭제 (운영·신고 처리)
router.delete('/:resortId/:userId', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resortId = String(req.params.resortId || '');
    const userId = String(req.params.userId || '');
    const existing = await prisma.resortReview.findUnique({
      where: { resortId_userId: { resortId, userId } },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: '후기를 찾을 수 없습니다.' });
      return;
    }
    await prisma.resortReview.delete({ where: { id: existing.id } });
    const summary = await summarize(resortId);
    res.json({ success: true, ...summary });
  } catch (e) {
    console.error('Admin delete resort review error:', e);
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
