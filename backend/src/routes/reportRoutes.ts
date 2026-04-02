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
