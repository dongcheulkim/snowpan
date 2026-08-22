import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';
import { pickVertical } from '../utils/vertical';
import { notifyAdmins } from '../controllers/notificationController';
import { isAgencyActive, agencyActiveWhere, AGENCY_BETA_FREE } from '../utils/agencyActive';

// 여행사 — 해외 스키 여행 파트너. 등록→관리자 승인→노출. 승인되면 스스로 딜 등록 가능.
const router = Router();

function isHttpUrl(v: unknown): v is string {
  return typeof v === 'string' && /^https?:\/\//i.test(v);
}
function tokens(csv?: string | null): string[] {
  return (csv || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// 구독 요금 (env 로 조정). 가입비=최초 1회, 월요금=매월. 토스페이먼츠 결제.
// 베타 기간(AGENCY_BETA_FREE=기본 true)엔 무료 — 결제 없이 승인만으로 노출.
const SIGNUP_FEE = Number(process.env.AGENCY_SIGNUP_FEE || 100000);
const MONTHLY_FEE = Number(process.env.AGENCY_MONTHLY_FEE || 55000);

// 토스페이먼츠 결제 승인 — successUrl 로 돌아온 paymentKey/orderId/amount 를 서버에서 확정.
async function confirmTossPayment(paymentKey: string, orderId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) return { ok: false, error: '결제 설정이 완료되지 않았습니다. (TOSS_SECRET_KEY)' };
  try {
    const resp = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const data = await resp.json() as { status?: string; message?: string };
    if (!resp.ok || (data.status && data.status !== 'DONE')) {
      return { ok: false, error: data.message || '결제 승인에 실패했습니다.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: '결제 승인 중 오류가 발생했습니다.' };
  }
}

const PUBLIC_AGENCY_SELECT = {
  id: true, name: true, description: true, image: true, phone: true, website: true, kakao: true,
  countries: true, resortSlugs: true, isPremium: true, createdAt: true,
} as const;

// ===== 공개 =====

// 승인된 여행사 목록. ?resort=slug 주면 그 리조트 취급 여행사만.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const verticalSlug = pickVertical(req.query.vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const agencies = await prisma.travelAgency.findMany({
      where: { ...agencyActiveWhere(), vertical: verticalSlug },
      select: PUBLIC_AGENCY_SELECT,
      orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const resortSlug = typeof req.query.resort === 'string' ? req.query.resort : '';
    if (!resortSlug) { res.json(agencies); return; }
    const resort = await prisma.overseasResort.findUnique({ where: { slug: resortSlug }, select: { country: true } });
    const country = resort?.country || '';
    const matched = agencies.filter((a) =>
      tokens(a.resortSlugs).includes(resortSlug) || (country && tokens(a.countries).includes(country))
    );
    res.json(matched);
  } catch (error) {
    console.error('Get agencies error:', error);
    res.status(500).json({ error: '여행사 조회 중 오류가 발생했습니다.' });
  }
});

// 내 여행사 목록 (사장님 대시보드) — 반드시 /:id 앞.
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const agencies = await prisma.travelAgency.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(agencies);
});

// 관리자: 승인 대기 여행사.
router.get('/pending', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const agencies = await prisma.travelAgency.findMany({
    where: { approved: false },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(agencies);
});

// 구독 요금 안내 (프론트가 금액 계산·표시).
router.get('/billing/pricing', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({ signupFee: SIGNUP_FEE, monthlyFee: MONTHLY_FEE, betaFree: AGENCY_BETA_FREE });
});

// 관리자: 입금/결제 대기 구독 (Toss 승인 실패분 수동 확인용).
router.get('/subscriptions/pending', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const subs = await prisma.agencySubscription.findMany({
    where: { status: 'pending' },
    include: { agency: { select: { id: true, name: true } } },
    orderBy: { requestedAt: 'desc' },
  });
  res.json(subs);
});

// 구독 신청 — 승인된 여행사 오너가 개월 수 선택 → 결제 주문(pending) 생성.
router.post('/:id/subscribe', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const agency = await prisma.travelAgency.findUnique({ where: { id: req.params.id } });
    if (!agency) { res.status(404).json({ error: '여행사를 찾을 수 없습니다.' }); return; }
    if (agency.userId !== req.user!.id) { res.status(403).json({ error: '권한이 없습니다.' }); return; }
    if (!agency.approved) { res.status(403).json({ error: '관리자 승인 후 결제할 수 있어요.' }); return; }
    const months = Math.max(1, Math.min(12, Number(req.body.months) || 1));
    const includesSignup = !agency.signupPaid;
    const amount = (includesSignup ? SIGNUP_FEE : 0) + MONTHLY_FEE * months;
    const sub = await prisma.agencySubscription.create({
      data: { agencyId: agency.id, months, amount, includesSignup, status: 'pending' },
    });
    res.status(201).json({
      orderId: sub.id,
      amount,
      orderName: `${agency.name} 여행사 구독 ${months}개월${includesSignup ? ' (가입비 포함)' : ''}`,
      months,
      includesSignup,
    });
  } catch (error) {
    console.error('Agency subscribe error:', error);
    res.status(500).json({ error: '구독 신청 중 오류가 발생했습니다.' });
  }
});

// 토스 결제 승인 — successUrl 콜백. paymentKey/orderId/amount 검증 후 구독 활성화.
router.post('/subscriptions/confirm', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentKey, orderId, amount } = req.body;
    if (!paymentKey || !orderId || amount == null) { res.status(400).json({ error: '결제 정보가 부족합니다.' }); return; }
    const sub = await prisma.agencySubscription.findUnique({ where: { id: String(orderId) }, include: { agency: true } });
    if (!sub) { res.status(404).json({ error: '주문을 찾을 수 없습니다.' }); return; }
    if (sub.agency.userId !== req.user!.id) { res.status(403).json({ error: '권한이 없습니다.' }); return; }
    if (sub.status === 'paid') { res.json({ ok: true, alreadyPaid: true }); return; }
    if (sub.amount !== Number(amount)) { res.status(400).json({ error: '결제 금액이 일치하지 않습니다.' }); return; }

    const result = await confirmTossPayment(String(paymentKey), String(orderId), sub.amount);
    if (!result.ok) { res.status(402).json({ error: result.error }); return; }

    // 결제 확정 → 구독 기간 연장 (남은 기간 있으면 이어붙임).
    const now = new Date();
    const base = sub.agency.paidUntil && sub.agency.paidUntil > now ? sub.agency.paidUntil : now;
    const paidUntil = new Date(base.getTime() + sub.months * 30 * 24 * 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.agencySubscription.update({ where: { id: sub.id }, data: { status: 'paid', paidAt: now, method: 'toss' } }),
      prisma.travelAgency.update({ where: { id: sub.agencyId }, data: { paidUntil, signupPaid: true } }),
    ]);
    res.json({ ok: true, paidUntil });
  } catch (error) {
    console.error('Agency payment confirm error:', error);
    res.status(500).json({ error: '결제 확정 중 오류가 발생했습니다.' });
  }
});

// 여행사 상세(공개, 승인+구독중인 것만) + 활성 딜.
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const agency = await prisma.travelAgency.findFirst({
      where: { id: req.params.id, ...agencyActiveWhere() },
      select: {
        ...PUBLIC_AGENCY_SELECT,
        deals: {
          where: { active: true },
          select: { id: true, title: true, partner: true, price: true, originalPrice: true, description: true, image: true, link: true, badge: true, resort: { select: { slug: true, name: true } } },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
    if (!agency) { res.status(404).json({ error: '여행사를 찾을 수 없습니다.' }); return; }
    prisma.travelAgency.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    res.json(agency);
  } catch (error) {
    res.status(500).json({ error: '여행사 조회 실패' });
  }
});

// ===== 여행사주(오너) =====

// 여행사 등록 (승인 대기).
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body;
    if (!b.name || !isHttpUrl(b.website) || !b.businessLicense) {
      res.status(400).json({ error: '상호명, 예약 링크(http/https), 사업자등록증은 필수입니다.' }); return;
    }
    if (b.image && !isHttpUrl(b.image) && !String(b.image).startsWith('/')) { res.status(400).json({ error: '이미지 형식이 올바르지 않습니다.' }); return; }
    const verticalSlug = pickVertical(b.vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const agency = await prisma.travelAgency.create({
      data: {
        userId: req.user!.id,
        name: sanitizeText(b.name, 80) || b.name,
        description: sanitizeText(b.description, 3000) || null,
        image: b.image || null,
        phone: sanitizeText(b.phone, 40) || null,
        website: b.website,
        kakao: sanitizeText(b.kakao, 200) || null,
        businessLicense: b.businessLicense,
        countries: sanitizeText(b.countries, 200) || null,
        resortSlugs: sanitizeText(b.resortSlugs, 400) || null,
        approved: false,
        vertical: verticalSlug,
      },
    });
    notifyAdmins('system', '새 여행사 등록 신청', `"${agency.name}" 여행사가 등록 신청되었습니다.`, '/admin-approval').catch(() => {});
    res.status(201).json({ ...agency, message: '등록 완료! 관리자 승인 후 노출됩니다.' });
  } catch (error) {
    console.error('Create agency error:', error);
    res.status(500).json({ error: '여행사 등록 중 오류가 발생했습니다.' });
  }
});

// 소유자/관리자: 여행사 수정. (프로필 수정은 재심사 없이 반영)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const agency = await prisma.travelAgency.findUnique({ where: { id: req.params.id } });
    if (!agency) { res.status(404).json({ error: '여행사를 찾을 수 없습니다.' }); return; }
    if (agency.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }
    const b = req.body;
    if (b.website !== undefined && !isHttpUrl(b.website)) { res.status(400).json({ error: '예약 링크 형식이 올바르지 않습니다.' }); return; }
    const data: Record<string, unknown> = {};
    if (b.name !== undefined) data.name = sanitizeText(b.name, 80) || b.name;
    if (b.description !== undefined) data.description = b.description ? (sanitizeText(b.description, 3000) || b.description) : null;
    if (b.image !== undefined) data.image = b.image || null;
    if (b.phone !== undefined) data.phone = b.phone ? (sanitizeText(b.phone, 40) || b.phone) : null;
    if (b.website !== undefined) data.website = b.website;
    if (b.kakao !== undefined) data.kakao = b.kakao ? (sanitizeText(b.kakao, 200) || b.kakao) : null;
    if (b.countries !== undefined) data.countries = b.countries ? (sanitizeText(b.countries, 200) || b.countries) : null;
    if (b.resortSlugs !== undefined) data.resortSlugs = b.resortSlugs ? (sanitizeText(b.resortSlugs, 400) || b.resortSlugs) : null;
    const updated = await prisma.travelAgency.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '수정 중 오류가 발생했습니다.' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const agency = await prisma.travelAgency.findUnique({ where: { id: req.params.id } });
    if (!agency) { res.status(404).json({ error: '여행사를 찾을 수 없습니다.' }); return; }
    if (agency.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }
    await prisma.travelAgency.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

// 관리자: 승인.
router.put('/:id/approve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.travelAgency.update({ where: { id: req.params.id }, data: { approved: true } });
    res.json({ message: '승인 완료' });
  } catch {
    res.status(500).json({ error: '승인 실패' });
  }
});

// ===== 여행사 딜 (승인된 여행사만, 오너 셀프서비스) =====

// 내 여행사 소유 확인 헬퍼.
async function ownedApprovedAgency(agencyId: string, userId: string, role?: string) {
  const agency = await prisma.travelAgency.findUnique({ where: { id: agencyId } });
  if (!agency) return { err: 404 as const };
  if (agency.userId !== userId && role !== 'admin') return { err: 403 as const };
  return { agency };
}

router.get('/:agencyId/deals', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { agency, err } = await ownedApprovedAgency(req.params.agencyId, req.user!.id, req.user!.role);
  if (err) { res.status(err).json({ error: err === 404 ? '여행사를 찾을 수 없습니다.' : '권한이 없습니다.' }); return; }
  const deals = await prisma.overseasDeal.findMany({
    where: { agencyId: agency!.id },
    include: { resort: { select: { slug: true, name: true } } },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(deals);
});

router.post('/:agencyId/deals', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { agency, err } = await ownedApprovedAgency(req.params.agencyId, req.user!.id, req.user!.role);
  if (err) { res.status(err).json({ error: err === 404 ? '여행사를 찾을 수 없습니다.' : '권한이 없습니다.' }); return; }
  if (!isAgencyActive(agency!)) { res.status(403).json({ error: AGENCY_BETA_FREE ? '관리자 승인 후 딜을 등록할 수 있어요.' : '구독(결제) 후 딜을 등록할 수 있어요.' }); return; }
  const b = req.body;
  if (!b.title || !isHttpUrl(b.link)) { res.status(400).json({ error: '제목과 링크(http/https)는 필수입니다.' }); return; }
  if (b.image && !isHttpUrl(b.image) && !String(b.image).startsWith('/')) { res.status(400).json({ error: '이미지 형식이 올바르지 않습니다.' }); return; }
  const deal = await prisma.overseasDeal.create({
    data: {
      title: sanitizeText(b.title, 120) || b.title,
      partner: sanitizeText(b.partner, 80) || agency!.name,
      price: b.price != null && b.price !== '' ? Number(b.price) || null : null,
      originalPrice: b.originalPrice != null && b.originalPrice !== '' ? Number(b.originalPrice) || null : null,
      description: sanitizeText(b.description, 500) || null,
      image: b.image || null,
      link: b.link,
      badge: sanitizeText(b.badge, 20) || null,
      resortId: b.resortId || null,
      agencyId: agency!.id,
      active: true,
      order: Number(b.order) || 0,
      vertical: agency!.vertical,
    },
  });
  res.status(201).json(deal);
});

router.put('/:agencyId/deals/:dealId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { agency, err } = await ownedApprovedAgency(req.params.agencyId, req.user!.id, req.user!.role);
  if (err) { res.status(err).json({ error: err === 404 ? '여행사를 찾을 수 없습니다.' : '권한이 없습니다.' }); return; }
  const existing = await prisma.overseasDeal.findUnique({ where: { id: req.params.dealId }, select: { agencyId: true } });
  if (!existing || existing.agencyId !== agency!.id) { res.status(404).json({ error: '딜을 찾을 수 없습니다.' }); return; }
  const b = req.body;
  if (b.link !== undefined && !isHttpUrl(b.link)) { res.status(400).json({ error: '링크 형식이 올바르지 않습니다.' }); return; }
  if (b.image && !isHttpUrl(b.image) && !String(b.image).startsWith('/')) { res.status(400).json({ error: '이미지 형식이 올바르지 않습니다.' }); return; }
  const data: Record<string, unknown> = {};
  if (b.title !== undefined) data.title = sanitizeText(b.title, 120) || b.title;
  if (b.price !== undefined) data.price = b.price != null && b.price !== '' ? Number(b.price) || null : null;
  if (b.originalPrice !== undefined) data.originalPrice = b.originalPrice != null && b.originalPrice !== '' ? Number(b.originalPrice) || null : null;
  if (b.description !== undefined) data.description = b.description ? (sanitizeText(b.description, 500) || b.description) : null;
  if (b.image !== undefined) data.image = b.image || null;
  if (b.link !== undefined) data.link = b.link;
  if (b.badge !== undefined) data.badge = b.badge ? (sanitizeText(b.badge, 20) || b.badge) : null;
  if (b.resortId !== undefined) data.resortId = b.resortId || null;
  if (b.active !== undefined) data.active = !!b.active;
  if (b.order !== undefined) data.order = Number(b.order) || 0;
  const updated = await prisma.overseasDeal.update({ where: { id: req.params.dealId }, data });
  res.json(updated);
});

router.delete('/:agencyId/deals/:dealId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { agency, err } = await ownedApprovedAgency(req.params.agencyId, req.user!.id, req.user!.role);
  if (err) { res.status(err).json({ error: err === 404 ? '여행사를 찾을 수 없습니다.' : '권한이 없습니다.' }); return; }
  const existing = await prisma.overseasDeal.findUnique({ where: { id: req.params.dealId }, select: { agencyId: true } });
  if (!existing || existing.agencyId !== agency!.id) { res.status(404).json({ error: '딜을 찾을 수 없습니다.' }); return; }
  await prisma.overseasDeal.delete({ where: { id: req.params.dealId } });
  res.json({ ok: true });
});

export default router;
