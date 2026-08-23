import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins } from '../controllers/notificationController';
import { reportCreateLimiter } from '../middleware/rateLimit';

const router = Router();

// 신고 생성
router.post('/', authenticateToken, reportCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reporterId = req.user!.id;
    const { type, targetId, reason, description } = req.body;

    if (!type || !targetId || !reason) {
      res.status(400).json({ error: '필수 항목을 입력해주세요.' });
      return;
    }

    // 매장 신고 포함 — 폐업/잘못된 정보/부적절 콘텐츠 제보용.
    if (!['product', 'post', 'user', 'skishop', 'repair', 'rental', 'lesson', 'accommodation'].includes(type)) {
      res.status(400).json({ error: '잘못된 신고 유형입니다.' });
      return;
    }
    // 길이 제한 — 무의미한 대용량 신고로 관리자 큐 오염 방지.
    if (typeof reason !== 'string' || reason.length > 100 || (description && (typeof description !== 'string' || description.length > 1000))) {
      res.status(400).json({ error: '신고 사유는 100자, 상세 내용은 1000자 이내여야 합니다.' });
      return;
    }

    // 대상 존재 확인 + 셀프 신고 차단. 존재하지 않는 대상 신고는 관리자 큐 오염이라 404.
    // (targetId 형식이 uuid 가 아니면 하위 findUnique 가 던지고 바깥 catch 에서 처리)
    if (type === 'user') {
      if (targetId === reporterId) {
        res.status(400).json({ error: '본인은 신고할 수 없습니다.' });
        return;
      }
      const u = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!u) { res.status(404).json({ error: '신고 대상을 찾을 수 없습니다.' }); return; }
    }
    if (type === 'post') {
      const post = await prisma.post.findUnique({ where: { id: targetId }, select: { userId: true } });
      if (!post) { res.status(404).json({ error: '신고 대상을 찾을 수 없습니다.' }); return; }
      if (post.userId === reporterId) {
        res.status(400).json({ error: '본인 게시글은 신고할 수 없습니다.' });
        return;
      }
    }
    if (type === 'product') {
      const product = await prisma.product.findUnique({ where: { id: targetId }, select: { userId: true } });
      if (!product) { res.status(404).json({ error: '신고 대상을 찾을 수 없습니다.' }); return; }
      if (product.userId === reporterId) {
        res.status(400).json({ error: '본인 상품은 신고할 수 없습니다.' });
        return;
      }
    }
    // 매장 신고 — 존재 확인 + 본인 매장 셀프 신고 차단.
    const shopModel: Record<string, (id: string) => Promise<{ userId: string | null } | null>> = {
      skishop: (id) => prisma.skiShop.findUnique({ where: { id }, select: { userId: true } }),
      repair: (id) => prisma.repairShop.findUnique({ where: { id }, select: { userId: true } }),
      rental: (id) => prisma.rental.findUnique({ where: { id }, select: { userId: true } }),
      lesson: (id) => prisma.lesson.findUnique({ where: { id }, select: { userId: true } }),
      accommodation: (id) => prisma.accommodation.findUnique({ where: { id }, select: { userId: true } }),
    };
    if (shopModel[type]) {
      const shop = await shopModel[type](targetId);
      if (!shop) { res.status(404).json({ error: '신고 대상을 찾을 수 없습니다.' }); return; }
      if (shop.userId === reporterId) {
        res.status(400).json({ error: '본인 매장은 신고할 수 없습니다.' });
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

    const typeLabel: Record<string, string> = { product: '상품', post: '게시글', user: '유저', skishop: '스키샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소' };
    await notifyAdmins('system', '새 신고 접수', `${typeLabel[type] || type} 신고: ${reason}`, '/admin');
    res.status(201).json(report);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: '신고 처리 중 오류가 발생했습니다.' });
  }
});

export default router;
