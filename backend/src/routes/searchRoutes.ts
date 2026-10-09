import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { cacheGet, cacheSet } from '../utils/cache';
import { pickVertical } from '../utils/vertical';

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
    // ?q=a&q=b 로 오면 q 가 배열 → (q as string).trim() 에서 500. 문자열만 허용.
    const empty = { products: [], posts: [], shops: [], rentals: [], resorts: [] };
    const raw = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    if (typeof raw !== 'string') { res.json(empty); return; }
    const query = raw.trim();
    // 최소 2글자 — 1글자 ILIKE 풀스캔 부하 방지.
    if (query.length < 2) { res.json(empty); return; }
    const search = { contains: query, mode: 'insensitive' as const };
    // 판(vertical) 스코프 — run 매물/글이 snow 검색결과에 섞이지 않게.
    const verticalSlug = pickVertical(req.query.vertical) || 'snow';

    // 통합검색 넓히기 (2026-10-09 사장님 결정): "곤지암 렌탈", "휘닉스 웹캠" 처럼 장소 + 종류로 치는 말을 이해한다.
    // 종류 단어(렌탈·정비·웹캠·스키장…)를 빼고 남은 말(장소·이름)로 리조트를 찾고, 그 리조트 소속 매장까지 결과에 넣는다.
    const KIND_WORDS: Record<string, string[]> = {
      rental: ['렌탈', '렌탈샵', '렌트', '대여'], repair: ['정비', '정비샵', '튜닝', '왁싱', '수리'], ski: ['스키샵', '보드샵', '장비샵'],
      webcam: ['웹캠', '라이브캠', '실시간'], resort: ['스키장', '리조트', '슬로프'],
    };
    const tokens = query.split(/\s+/).filter(Boolean);
    const kinds = new Set<string>();
    const terms = tokens.filter((t) => {
      const k = Object.entries(KIND_WORDS).find(([, words]) => words.includes(t));
      if (k) { kinds.add(k[0]); return false; }
      return true;
    });
    // 종류 단어만 쳤으면("렌탈샵") 장소 없이 종류 전체 — 이름 검색엔 원문을 그대로 쓴다.
    const termSearch = terms.length ? terms.map((t) => ({ contains: t.replace(/리조트$/, ''), mode: 'insensitive' as const })) : [search];
    const resortsFound = verticalSlug === 'snow' && terms.length
      ? await prisma.skiResort.findMany({ where: { OR: termSearch.flatMap((s) => [{ name: s }, { location: s }]) }, select: { id: true, name: true, location: true }, take: 5 })
      : [];
    const resortIds = resortsFound.map((r) => r.id);
    // 리조트가 잡히면 그 리조트 소속 매장도 후보에 — 이름에 "곤지암"이 없어도 "곤지암 렌탈"에 나와야 한다.
    const byResort = resortIds.length ? [{ resortId: { in: resortIds } }] : [];
    const nameOrAddr = termSearch.flatMap((s) => [{ name: s }, { address: s }]);

    // 더 큰 후보 풀을 가져와 클라이언트 사이드 (Node) 에서 점수 매기고 상위 N 반환.
    // Postgres FTS / Elasticsearch 없이도 의미 있는 랭킹.
    const [products, posts, skiShops, repairShops, rentals, webcams] = await Promise.all([
      prisma.product.findMany({
        where: { category: 'used', vertical: verticalSlug, OR: [{ name: search }, { brand: search }, { description: search }] },
        select: { id: true, name: true, price: true, image: true, brand: true, description: true, status: true, createdAt: true, bumpedAt: true },
        take: 40,
      }),
      prisma.post.findMany({
        where: { vertical: verticalSlug, OR: [{ title: search }, { content: search }] },
        select: { id: true, title: true, content: true, category: true, sport: true, createdAt: true, likes: true, views: true },
        take: 40,
      }),
      prisma.skiShop.findMany({
        where: { approved: true, vertical: verticalSlug, OR: [{ name: search }, { address: search }, { brands: search }, ...(kinds.has('ski') || kinds.size === 0 ? byResort : [])] },
        select: { id: true, name: true, area: true, address: true, brands: true, createdAt: true, isPremium: true },
        take: 20,
      }),
      prisma.repairShop.findMany({
        where: { approved: true, vertical: verticalSlug, OR: [{ name: search }, { address: search }, { services: search }, ...(kinds.has('repair') || kinds.size === 0 ? byResort : [])] },
        select: { id: true, name: true, area: true, address: true, services: true, createdAt: true, isPremium: true },
        take: 20,
      }),
      // 렌탈샵 — 이름·주소 일치 또는 잡힌 리조트 소속. 종류를 다른 걸로 못박았으면("곤지암 정비") 비움.
      kinds.size === 0 || kinds.has('rental')
        ? prisma.rental.findMany({
          where: { approved: true, vertical: verticalSlug, OR: [...nameOrAddr, ...byResort] },
          select: { id: true, name: true, area: true, address: true, createdAt: true, isPremium: true, claimable: true, priceFrom: true, resort: { select: { name: true } } },
          take: 40,
        })
        : Promise.resolve([]),
      // 실시간 웹캠 — 리조트 이름으로 (웹캠 테이블은 리조트와 이름으로만 이어짐)
      verticalSlug === 'snow' && (resortsFound.length || kinds.has('webcam'))
        ? prisma.webcam.findMany({
          where: { active: true, vertical: 'snow', OR: [...resortsFound.map((r) => ({ name: { contains: r.name.replace(/리조트$/, ''), mode: 'insensitive' as const } })), ...(kinds.has('webcam') && terms.length ? termSearch.map((s) => ({ name: s })) : [])] },
          select: { id: true, name: true },
          take: 5,
        })
        : Promise.resolve([]),
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

    // 렌탈샵 — 프리미엄 → 사장님 인증(claimable=false) → 가격표 있음 → 일치도 순
    const rentalsRanked = rentals
      .map((r) => ({
        item: r,
        score: score({ name: r.name, desc: r.address, query: terms[0] || query, createdAt: r.createdAt, active: true })
          + (r.isPremium ? 30 : 0) + (r.claimable ? 0 : 20) + (r.priceFrom ? 10 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ item }) => ({ id: item.id, name: item.name, area: item.area, resortName: item.resort?.name || null, claimable: item.claimable, priceFrom: item.priceFrom }));

    // 스키장 — 리조트 페이지(/resort/:name) + 같은 이름의 웹캠(/webcam/:id)
    const resortsOut = resortsFound.map((r) => {
      const key = r.name.replace(/리조트$/, '');
      const cam = webcams.find((w) => w.name.includes(key) || key.includes(w.name.replace(/리조트$/, '')));
      return { id: r.id, name: r.name, location: r.location, webcamId: cam?.id || null };
    });
    // 리조트 없이 "웹캠"만 친 경우 — 웹캠 이름 일치분을 스키장 칩으로
    for (const w of webcams) if (!resortsOut.some((r) => r.webcamId === w.id)) resortsOut.push({ id: w.id, name: w.name, location: '', webcamId: w.id });

    res.json({
      products: productsRanked,
      posts: postsRanked,
      shops: shopsRanked,
      rentals: rentalsRanked,
      resorts: resortsOut.slice(0, 5),
      rentalCount: rentals.length, // "렌탈샵 N곳 모두 보기" 표시용 (후보 풀 40 기준)
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
  }
});

// 검색 자동완성 (2026-09-25) — 매장 5종·매물·리조트 이름에서 앞부분 일치 우선, 최대 8개. 60초 캐시.
router.get('/suggest', async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const q = typeof raw === 'string' ? raw.trim().slice(0, 40) : '';
    if (q.length < 1) { res.json([]); return; }
    const cacheKey = `suggest:${q.toLowerCase()}`;
    const hit = cacheGet<{ text: string; type: string }[]>(cacheKey);
    if (hit) { res.json(hit); return; }
    const like = { contains: q, mode: 'insensitive' as const };
    const [ski, repair, rental, lesson, acc, products, resorts] = await Promise.all([
      prisma.skiShop.findMany({ where: { approved: true, name: like }, select: { name: true }, take: 4 }),
      prisma.repairShop.findMany({ where: { approved: true, name: like }, select: { name: true }, take: 4 }),
      prisma.rental.findMany({ where: { approved: true, name: like }, select: { name: true }, take: 4 }),
      prisma.lesson.findMany({ where: { approved: true, name: like }, select: { name: true }, take: 4 }),
      prisma.accommodation.findMany({ where: { approved: true, name: like }, select: { name: true }, take: 4 }),
      prisma.product.findMany({ where: { status: { not: 'sold' }, OR: [{ name: like }, { brand: like }] }, select: { name: true, brand: true }, take: 6, orderBy: { createdAt: 'desc' } }),
      prisma.skiResort.findMany({ where: { name: like }, select: { name: true }, take: 3 }),
    ]);
    const items: { text: string; type: string }[] = [];
    const seen = new Set<string>();
    const push = (text: string | null | undefined, type: string) => { const t = (text || '').trim(); const k = t.toLowerCase(); if (!t || seen.has(k)) return; seen.add(k); items.push({ text: t, type }); };
    resorts.forEach((r) => push(r.name, 'resort'));
    ski.forEach((r) => push(r.name, 'skishop')); repair.forEach((r) => push(r.name, 'repair')); rental.forEach((r) => push(r.name, 'rental')); lesson.forEach((r) => push(r.name, 'lesson')); acc.forEach((r) => push(r.name, 'accommodation'));
    products.forEach((r) => { push(r.brand, 'brand'); push(r.name, 'product'); });
    const lower = q.toLowerCase();
    const sorted = items.sort((a, b) => Number(b.text.toLowerCase().startsWith(lower)) - Number(a.text.toLowerCase().startsWith(lower)) || a.text.length - b.text.length).slice(0, 8);
    cacheSet(cacheKey, sorted, 60);
    res.json(sorted);
  } catch (error) {
    console.error('Search suggest error:', error);
    res.status(500).json({ error: '자동완성 실패' });
  }
});

export default router;
