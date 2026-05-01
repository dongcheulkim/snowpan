import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins } from '../controllers/notificationController';

const router = Router();

// 신고 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reporterId = req.user!.id;
    const { type, targetId, reason, description } = req.body;

    if (!type || !targetId || !reason) {
      res.status(400).json({ error: '필수 항목을 입력해주세요.' });
      return;
    }

    if (!['product', 'post', 'user'].includes(type)) {
      res.status(400).json({ error: '잘못된 신고 유형입니다.' });
      return;
    }

    // 셀프 신고 차단 — 본인을 신고하거나 본인의 글/상품을 신고하는 행위.
    if (type === 'user' && targetId === reporterId) {
      res.status(400).json({ error: '본인은 신고할 수 없습니다.' });
      return;
    }
    if (type === 'post') {
      const post = await prisma.post.findUnique({ where: { id: targetId }, select: { userId: true } });
      if (post?.userId === reporterId) {
        res.status(400).json({ error: '본인 게시글은 신고할 수 없습니다.' });
        return;
      }
    }
    if (type === 'product') {
      const product = await prisma.product.findUnique({ where: { id: targetId }, select: { userId: true } });
      if (product?.userId === reporterId) {
        res.status(400).json({ error: '본인 상품은 신고할 수 없습니다.' });
        return;
      }
    }

    // 같은 사용자가 같은 대상을 24시간 내 중복 신고 시 차단 — 도배 방지.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000);
    const dupe = await prisma.report.findFirst({
      where: { reporterId, type, targetId, createdAt: { gte: oneDayAgo } },
      select: { id: true },
    });
    if (dupe) {
      res.status(409).json({ error: '이미 신고한 대상입니다. 24시간 내 중복 신고는 불가능합니다.' });
      return;
    }

    const report = await prisma.report.create({
      data: {
        type,
        targetId,
        reason,
        description: description || null,
        reporterId,
      },
    });

    const typeLabel: Record<string, string> = { product: '상품', post: '게시글', user: '유저' };
    await notifyAdmins('system', '새 신고 접수', `${typeLabel[type] || type} 신고: ${reason}`, '/admin');
    res.status(201).json(report);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: '신고 처리 중 오류가 발생했습니다.' });
  }
});

export default router;
