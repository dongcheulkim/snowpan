import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import prisma from '../config/database';
import { isDuplicateClick, recordClick } from '../utils/clickDedup';
import { sanitizeText } from '../utils/sanitize';
import { pickVertical } from '../utils/vertical';
import { isAgencyActive, agencyActiveWhere } from '../utils/agencyActive';

// 해외 스키 여행 — 콘텐츠형(가이드) + 딜/광고(외부 파트너 중개).
// 공개: 목록/상세/딜 조회 + 딜 클릭 추적. 쓰기: 관리자(에디터)만.
const router = Router();

// 외부 링크는 http(s) 만 허용 — javascript:, data: 등 스킴 차단.
function isHttpUrl(v: unknown): v is string {
  return typeof v === 'string' && /^https?:\/\//i.test(v);
}

// ===== 공개 조회 =====

// 리조트(가이드) 목록 — 공개된 것만, 노출 순서.
router.get('/resorts', async (req: Request, res: Response): Promise<void> => {
  try {
    const verticalSlug = pickVertical(req.query.vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const resorts = await prisma.overseasResort.findMany({
      where: { published: true, vertical: verticalSlug },
      select: {
        id: true, slug: true, name: true, scope: true, country: true, continent: true, popular: true,
        region: true, address: true, liftPrice: true, nightSki: true, image: true, summary: true,
        season: true, snowType: true, highlights: true, slopes: true, order: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(resorts);
  } catch (error) {
    console.error('Get overseas resorts error:', error);
    res.status(500).json({ error: '해외 스키장 조회 중 오류가 발생했습니다.' });
  }
});

// 추천/전체 딜 — 메인 노출용. featured=1 이면 featured 만.
router.get('/deals', async (req: Request, res: Response): Promise<void> => {
  try {
    const verticalSlug = pickVertical(req.query.vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const where: { active: boolean; vertical: string; featured?: boolean } = { active: true, vertical: verticalSlug };
    if (req.query.featured === '1') where.featured = true;
    const deals = await prisma.overseasDeal.findMany({
      where,
      select: {
        id: true, title: true, partner: true, price: true, originalPrice: true, description: true,
        image: true, link: true, badge: true, order: true,
        resort: { select: { slug: true, name: true } },
      },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      take: 30,
    });
    res.json(deals);
  } catch (error) {
    console.error('Get overseas deals error:', error);
    res.status(500).json({ error: '딜 조회 중 오류가 발생했습니다.' });
  }
});

// 리조트 상세(가이드) + 그 리조트에 연결된 딜.  — 반드시 /resorts 뒤, /admin 과 무관.
router.get('/resorts/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const resort = await prisma.overseasResort.findFirst({
      where: { slug: req.params.slug, published: true },
      include: {
        deals: {
          where: { active: true },
          select: {
            id: true, title: true, partner: true, price: true, originalPrice: true,
            description: true, image: true, link: true, badge: true,
            agency: { select: { id: true, name: true, approved: true, paidUntil: true } },
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
    if (!resort) { res.status(404).json({ error: '해외 스키장을 찾을 수 없습니다.' }); return; }
    // 조회수 증가 (fire-and-forget).
    prisma.overseasResort.update({ where: { id: resort.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    // 여행사 딜은 그 여행사가 활성(베타 무료 or 구독중)일 때만 노출. 관리자 딜(agency 없음)은 항상 노출.
    const deals = resort.deals
      .filter((d) => !d.agency || isAgencyActive(d.agency))
      .map((d) => ({ ...d, agency: d.agency ? { id: d.agency.id, name: d.agency.name } : null }));
    // 추천 여행사 — 이 리조트/국가를 취급하는 활성 여행사. (스키장 정보는 snow vertical 전용)
    const activeAgencies = await prisma.travelAgency.findMany({
      where: { ...agencyActiveWhere(), vertical: 'snow' },
      select: {
        id: true, name: true, description: true, image: true, phone: true, website: true, kakao: true,
        countries: true, resortSlugs: true, isPremium: true,
      },
      orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const tok = (csv?: string | null) => (csv || '').split(',').map((s) => s.trim()).filter(Boolean);
    const agencies = activeAgencies.filter((a) =>
      tok(a.resortSlugs).includes(resort.slug) || tok(a.countries).includes(resort.country)
    );
    res.json({ ...resort, deals, agencies });
  } catch (error) {
    console.error('Get overseas resort error:', error);
    res.status(500).json({ error: '해외 스키장 조회 중 오류가 발생했습니다.' });
  }
});

// 딜 클릭 추적 — 중개 성과. 링크는 프론트가 이미 가지고 있으니 카운트만.
router.post('/deals/:id/click', async (req: Request, res: Response): Promise<void> => {
  try {
    // 같은 IP 반복 클릭 10분 1회 + active 딜만 — 여행사 성과 지표 부풀리기 방지
    if (isDuplicateClick(req.ip, req.params.id)) { res.json({ ok: true }); return; }
    const r = await prisma.overseasDeal.updateMany({ where: { id: req.params.id, active: true }, data: { clickCount: { increment: 1 } } });
    if (r.count > 0) recordClick(req.ip, req.params.id);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false }); // 실패해도 UX 막지 않음
  }
});

// ===== 관리자(에디터) — 리조트 CRUD =====

router.get('/admin/resorts', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const resorts = await prisma.overseasResort.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  res.json(resorts);
});

router.post('/resorts', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body;
    if (!b.slug || !b.name || !b.country || !b.description) {
      res.status(400).json({ error: 'slug, 이름, 국가, 본문은 필수입니다.' }); return;
    }
    if (b.image && !isHttpUrl(b.image)) { res.status(400).json({ error: '이미지 URL 형식이 올바르지 않습니다.' }); return; }
    const verticalSlug = pickVertical(b.vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const resort = await prisma.overseasResort.create({
      data: {
        slug: sanitizeText(b.slug, 60) || b.slug,
        name: sanitizeText(b.name, 80) || b.name,
        scope: b.scope === '국내' ? '국내' : '해외',
        country: sanitizeText(b.country, 40) || b.country,
        continent: sanitizeText(b.continent, 20) || null,
        popular: !!b.popular,
        region: sanitizeText(b.region, 60) || null,
        address: sanitizeText(b.address, 200) || null,
        liftPrice: sanitizeText(b.liftPrice, 120) || null,
        website: b.website && /^https?:\/\//i.test(b.website) ? b.website : null,
        phone: sanitizeText(b.phone, 40) || null,
        nightSki: !!b.nightSki,
        lifts: b.lifts != null ? Number(b.lifts) || null : null,
        image: b.image || null,
        summary: sanitizeText(b.summary, 200) || null,
        description: sanitizeText(b.description, 8000) || b.description,
        season: sanitizeText(b.season, 60) || null,
        snowType: sanitizeText(b.snowType, 40) || null,
        highlights: sanitizeText(b.highlights, 300) || null,
        slopes: b.slopes != null ? Number(b.slopes) || null : null,
        bestFor: sanitizeText(b.bestFor, 100) || null,
        published: b.published !== false,
        order: Number(b.order) || 0,
        vertical: verticalSlug,
      },
    });
    res.status(201).json(resort);
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') { res.status(409).json({ error: '이미 존재하는 slug 입니다.' }); return; }
    console.error('Create overseas resort error:', error);
    res.status(500).json({ error: '해외 스키장 등록 중 오류가 발생했습니다.' });
  }
});

router.put('/resorts/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body;
    if (b.image && !isHttpUrl(b.image)) { res.status(400).json({ error: '이미지 URL 형식이 올바르지 않습니다.' }); return; }
    const data: Record<string, unknown> = {};
    if (b.slug !== undefined) data.slug = sanitizeText(b.slug, 60) || b.slug;
    if (b.name !== undefined) data.name = sanitizeText(b.name, 80) || b.name;
    if (b.country !== undefined) data.country = sanitizeText(b.country, 40) || b.country;
    if (b.scope !== undefined) data.scope = b.scope === '국내' ? '국내' : '해외';
    if (b.continent !== undefined) data.continent = b.continent ? (sanitizeText(b.continent, 20) || b.continent) : null;
    if (b.popular !== undefined) data.popular = !!b.popular;
    if (b.region !== undefined) data.region = b.region ? (sanitizeText(b.region, 60) || b.region) : null;
    if (b.address !== undefined) data.address = b.address ? (sanitizeText(b.address, 200) || b.address) : null;
    if (b.liftPrice !== undefined) data.liftPrice = b.liftPrice ? (sanitizeText(b.liftPrice, 120) || b.liftPrice) : null;
    if (b.website !== undefined) data.website = b.website && /^https?:\/\//i.test(b.website) ? b.website : null;
    if (b.phone !== undefined) data.phone = b.phone ? (sanitizeText(b.phone, 40) || b.phone) : null;
    if (b.nightSki !== undefined) data.nightSki = !!b.nightSki;
    if (b.lifts !== undefined) data.lifts = b.lifts != null ? Number(b.lifts) || null : null;
    if (b.image !== undefined) data.image = b.image || null;
    if (b.summary !== undefined) data.summary = b.summary ? (sanitizeText(b.summary, 200) || b.summary) : null;
    if (b.description !== undefined) data.description = sanitizeText(b.description, 8000) || b.description;
    if (b.season !== undefined) data.season = b.season ? (sanitizeText(b.season, 60) || b.season) : null;
    if (b.snowType !== undefined) data.snowType = b.snowType ? (sanitizeText(b.snowType, 40) || b.snowType) : null;
    if (b.highlights !== undefined) data.highlights = b.highlights ? (sanitizeText(b.highlights, 300) || b.highlights) : null;
    if (b.slopes !== undefined) data.slopes = b.slopes != null ? Number(b.slopes) || null : null;
    if (b.bestFor !== undefined) data.bestFor = b.bestFor ? (sanitizeText(b.bestFor, 100) || b.bestFor) : null;
    if (b.published !== undefined) data.published = !!b.published;
    if (b.order !== undefined) data.order = Number(b.order) || 0;
    const updated = await prisma.overseasResort.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') { res.status(409).json({ error: '이미 존재하는 slug 입니다.' }); return; }
    if ((error as { code?: string })?.code === 'P2025') { res.status(404).json({ error: '대상을 찾을 수 없습니다.' }); return; }
    console.error('Update overseas resort error:', error);
    res.status(500).json({ error: '수정 중 오류가 발생했습니다.' });
  }
});

router.delete('/resorts/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.overseasResort.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

// ===== 관리자(에디터) — 딜 CRUD =====

router.get('/admin/deals', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const deals = await prisma.overseasDeal.findMany({
    include: { resort: { select: { slug: true, name: true } } },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(deals);
});

router.post('/deals', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body;
    if (!b.title || !isHttpUrl(b.link)) { res.status(400).json({ error: '제목과 올바른 링크(http/https)는 필수입니다.' }); return; }
    if (b.image && !isHttpUrl(b.image)) { res.status(400).json({ error: '이미지 URL 형식이 올바르지 않습니다.' }); return; }
    const verticalSlug = pickVertical(b.vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const deal = await prisma.overseasDeal.create({
      data: {
        title: sanitizeText(b.title, 120) || b.title,
        partner: sanitizeText(b.partner, 80) || null,
        price: b.price != null && b.price !== '' ? Number(b.price) || null : null,
        originalPrice: b.originalPrice != null && b.originalPrice !== '' ? Number(b.originalPrice) || null : null,
        description: sanitizeText(b.description, 500) || null,
        image: b.image || null,
        link: b.link,
        badge: sanitizeText(b.badge, 20) || null,
        resortId: b.resortId || null,
        featured: !!b.featured,
        active: b.active !== false,
        order: Number(b.order) || 0,
        startDate: b.startDate ? new Date(b.startDate) : null,
        endDate: b.endDate ? new Date(b.endDate) : null,
        vertical: verticalSlug,
      },
    });
    res.status(201).json(deal);
  } catch (error) {
    console.error('Create overseas deal error:', error);
    res.status(500).json({ error: '딜 등록 중 오류가 발생했습니다.' });
  }
});

router.put('/deals/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body;
    if (b.link !== undefined && !isHttpUrl(b.link)) { res.status(400).json({ error: '링크 형식이 올바르지 않습니다.' }); return; }
    if (b.image && !isHttpUrl(b.image)) { res.status(400).json({ error: '이미지 URL 형식이 올바르지 않습니다.' }); return; }
    const data: Record<string, unknown> = {};
    if (b.title !== undefined) data.title = sanitizeText(b.title, 120) || b.title;
    if (b.partner !== undefined) data.partner = b.partner ? (sanitizeText(b.partner, 80) || b.partner) : null;
    if (b.price !== undefined) data.price = b.price != null && b.price !== '' ? Number(b.price) || null : null;
    if (b.originalPrice !== undefined) data.originalPrice = b.originalPrice != null && b.originalPrice !== '' ? Number(b.originalPrice) || null : null;
    if (b.description !== undefined) data.description = b.description ? (sanitizeText(b.description, 500) || b.description) : null;
    if (b.image !== undefined) data.image = b.image || null;
    if (b.link !== undefined) data.link = b.link;
    if (b.badge !== undefined) data.badge = b.badge ? (sanitizeText(b.badge, 20) || b.badge) : null;
    if (b.resortId !== undefined) data.resortId = b.resortId || null;
    if (b.featured !== undefined) data.featured = !!b.featured;
    if (b.active !== undefined) data.active = !!b.active;
    if (b.order !== undefined) data.order = Number(b.order) || 0;
    if (b.startDate !== undefined) data.startDate = b.startDate ? new Date(b.startDate) : null;
    if (b.endDate !== undefined) data.endDate = b.endDate ? new Date(b.endDate) : null;
    const updated = await prisma.overseasDeal.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') { res.status(404).json({ error: '대상을 찾을 수 없습니다.' }); return; }
    console.error('Update overseas deal error:', error);
    res.status(500).json({ error: '수정 중 오류가 발생했습니다.' });
  }
});

router.delete('/deals/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.overseasDeal.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
