import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

const MAX_KEYWORDS = 20;

// 내 키워드 목록
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.savedSearch.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: '키워드 조회 실패' });
  }
});

// 키워드 등록
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const keyword = String(req.body.keyword || '').trim().toLowerCase();
    if (keyword.length < 2) { res.status(400).json({ error: '키워드는 2글자 이상 입력해주세요.' }); return; }
    if (keyword.length > 40) { res.status(400).json({ error: '키워드가 너무 깁니다.' }); return; }

    const count = await prisma.savedSearch.count({ where: { userId } });
    if (count >= MAX_KEYWORDS) { res.status(400).json({ error: `키워드는 최대 ${MAX_KEYWORDS}개까지 등록할 수 있어요.` }); return; }

    // 중복이면 기존 것 반환 (unique userId+keyword).
    const existing = await prisma.savedSearch.findUnique({ where: { userId_keyword: { userId, keyword } } });
    if (existing) { res.status(200).json(existing); return; }

    const created = await prisma.savedSearch.create({ data: { userId, keyword } });
    res.status(201).json(created);
  } catch (error) {
    console.error('Create saved search error:', error);
    res.status(500).json({ error: '키워드 등록 실패' });
  }
});

// 키워드 삭제
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await prisma.savedSearch.findUnique({ where: { id: req.params.id } });
    if (!item || item.userId !== req.user!.id) { res.status(404).json({ error: '키워드를 찾을 수 없습니다.' }); return; }
    await prisma.savedSearch.delete({ where: { id: req.params.id } });
    res.json({ message: '삭제 완료' });
  } catch (error) {
    res.status(500).json({ error: '삭제 실패' });
  }
});

export default router;
