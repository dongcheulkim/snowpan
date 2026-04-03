import { Router, Request, Response } from 'express';
import prisma from '../config/database';

const router = Router();

// 통합 검색 (자동완성 + 결과)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || (q as string).length < 1) { res.json({ products: [], posts: [], shops: [] }); return; }

    const query = q as string;
    const search = { contains: query, mode: 'insensitive' as const };

    const [products, posts, skiShops, repairShops] = await Promise.all([
      prisma.product.findMany({
        where: { category: 'used', OR: [{ name: search }, { brand: search }, { description: search }] },
        select: { id: true, name: true, price: true, image: true, brand: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.post.findMany({
        where: { OR: [{ title: search }, { content: search }] },
        select: { id: true, title: true, category: true, sport: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.skiShop.findMany({
        where: { approved: true, OR: [{ name: search }, { address: search }, { brands: search }] },
        select: { id: true, name: true, area: true },
        take: 3,
      }),
      prisma.repairShop.findMany({
        where: { approved: true, OR: [{ name: search }, { address: search }, { services: search }] },
        select: { id: true, name: true, area: true },
        take: 3,
      }),
    ]);

    res.json({
      products,
      posts,
      shops: [...skiShops.map(s => ({ ...s, type: 'ski' })), ...repairShops.map(s => ({ ...s, type: 'repair' }))],
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
  }
});

export default router;
