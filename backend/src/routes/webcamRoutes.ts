// 웹캠 — 공개 read-only API. 어드민 추가/수정은 향후 어드민 라우트에서.
import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { pickVertical } from '../utils/vertical';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const list = await prisma.webcam.findMany({
      where: { active: true, vertical: verticalSlug },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true, slug: true, name: true, region: true,
        slopes: true, elevation: true, camCount: true, externalUrl: true,
      },
    });
    res.json(list);
  } catch (error) {
    console.error('Webcam list error:', error);
    res.status(500).json({ error: '웹캠 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug;
    if (!/^[a-z0-9_-]{1,32}$/i.test(slug)) {
      res.status(400).json({ error: '잘못된 식별자입니다.' });
      return;
    }
    const cam = await prisma.webcam.findUnique({
      where: { slug },
    });
    if (!cam || !cam.active) {
      res.status(404).json({ error: '존재하지 않는 웹캠입니다.' });
      return;
    }
    res.json(cam);
  } catch (error) {
    console.error('Webcam detail error:', error);
    res.status(500).json({ error: '웹캠 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
