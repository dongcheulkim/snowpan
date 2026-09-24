// 매장 공개 통계 — 답장 속도 (2026-09-24). 상세 페이지 찜 바에 "보통 1시간 안에 답장 · 답장률 95%"
import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { isStaffShopType } from '../utils/shopAccess';
import { summarize } from '../utils/responseStats';

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/response/:shopType/:shopId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopType, shopId } = req.params;
    if (!isStaffShopType(shopType) || !UUID_RE.test(shopId)) { res.status(400).json({ error: '매장 정보가 올바르지 않아요.' }); return; }
    const stat = await prisma.shopResponseStat.findUnique({ where: { shopType_shopId: { shopType, shopId } } });
    res.json(summarize(stat));
  } catch (e) { console.error('Response stat error:', e); res.status(500).json({ error: '답장 속도를 불러오지 못했어요.' }); }
});

export default router;
