import { Router, Request, Response } from 'express';
import prisma from '../config/database';

const router = Router();

// 검색 랭킹 점수 — 단순 createdAt desc 보다 의도에 맞는 결과 상위로.
// 일치도 (name > brand > desc) + 최신성 + 활성도 (selling/approved) 가중합.
function score(opts: {
  name?: string | null;
  brand?: string | null;
  desc?: string | null;
  query: string;
  createdAt: Date;
  active?: boolean;
  popularity?: number; // likes / views 등 0-N 누적치
}): number {
  const q = opts.query.toLowerCase();
  const name = (opts.name || '').toLowerCase();
  const brand = (opts.brand || '').toLowerCase();
  const desc = (opts.desc || '').toLowerCase();

  let s = 0;
  if (name === q) s += 100;
  else if (name.startsWith(q)) s += 50;
  else if (name.includes(q)) s += 20;
  if (brand) {
    if (brand === q) s += 40;
    else if (brand.startsWith(q)) s += 25;
    else if (brand.includes(q)) s += 15;
  }
  if (desc.includes(q)) s += 5;

  // 최신성 — 최근 30일 내면 가산, 그 이후는 점차 감소 (오래된 매물 깊이 묻힘 방지)
  const ageDays = (Date.now() - opts.createdAt.getTime()) / 86400000;
  if (ageDays < 7) s += 15;
  else if (ageDays < 30) s += 8;
  else if (ageDays < 90) s += 3;

  // 활성도 — selling/approved 만 보너스, sold/reserved 페널티
  if (opts.active === true) s += 10;
  else if (opts.active === false) s -= 5;

  // 인기 — 로그 스케일 (좋아요·조회수 1000 차이가 매번 +N 아니라 천천히)
  if (opts.popularity && opts.popularity > 0) {
    s += Math.min(20, Math.log10(opts.popularity + 1) * 5);
  }

  return s;
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || (q as string).length < 1) { res.json({ products: [], posts: [], shops: [] }); return; }

    const query = (q as string).trim();
    const search = { contains: query, mode: 'insensitive' as const };

    // 더 큰 후보 풀을 가져와 클라이언트 사이드 (Node) 에서 점수 매기고 상위 N 반환.
    // Postgres FTS / Elasticsearch 없이도 의미 있는 랭킹.
    const [products, posts, skiShops, repairShops] = await Promise.all([
      prisma.product.findMany({
        where: { category: 'used', OR: [{ name: search }, { brand: search }, { description: search }] },
        select: { id: true, name: true, price: true, image: true, brand: true, description: true, status: true, createdAt: true, bumpedAt: true },
        take: 40,
      }),
      prisma.post.findMany({
        where: { OR: [{ title: search }, { content: search }] },
        select: { id: true, title: true, content: true, category: true, sport: true, createdAt: true, likes: true, views: true },
        take: 40,
      }),
      prisma.skiShop.findMany({
        where: { approved: true, OR: [{ name: search }, { address: search }, { brands: search }] },
        select: { id: true, name: true, area: true, address: true, brands: true, createdAt: true, isPremium: true },
        take: 20,
      }),
      prisma.repairShop.findMany({
        where: { approved: true, OR: [{ name: search }, { address: search }, { services: search }] },
        select: { id: true, name: true, area: true, address: true, services: true, createdAt: true, isPremium: true },
        take: 20,
      }),
    ]);

    const productsRanked = products
      .map(p => ({
        item: p,
        score: score({
          name: p.name,
          brand: p.brand,
          desc: p.description,
          query,
          // 끌어올림 (bump) 한 매물은 최신성 점수 받도록 bumpedAt 우선
          createdAt: p.bumpedAt || p.createdAt,
          active: p.status === 'selling',
        }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ item }) => ({ id: item.id, name: item.name, price: item.price, image: item.image, brand: item.brand }));

    const postsRanked = posts
      .map(p => ({
        item: p,
        score: score({
          name: p.title,
          desc: p.content,
          query,
          createdAt: p.createdAt,
          popularity: (p.likes || 0) + (p.views || 0) * 0.1,
        }),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ item }) => ({ id: item.id, title: item.title, category: item.category, sport: item.sport }));

    // 샵 — premium 우선, 그다음 일치도/최신성
    const shopsAll = [
      ...skiShops.map(s => ({ ...s, type: 'ski' as const })),
      ...repairShops.map(s => ({ ...s, type: 'repair' as const })),
    ];
    const shopsRanked = shopsAll
      .map(s => ({
        item: s,
        score: score({
          name: s.name,
          desc: 'brands' in s ? s.brands : (s as { services?: string | null }).services,
          query,
          createdAt: s.createdAt,
          active: true,
        }) + (s.isPremium ? 30 : 0), // premium 부스트
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ item }) => ({ id: item.id, name: item.name, area: item.area, type: item.type }));

    res.json({
      products: productsRanked,
      posts: postsRanked,
      shops: shopsRanked,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
  }
});

export default router;
