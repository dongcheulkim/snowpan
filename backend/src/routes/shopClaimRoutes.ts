// 매장 소유권 이전(claim) — 관리자가 공개 영업정보로 시딩한 매장(claimable=true, "사장님 확인 전")을
// 실제 사장님이 사업자등록증 인증으로 가져가는 흐름. 스키샵·정비샵·렌탈샵·숙소 지원 (레슨은 개인 강사라 시딩 대상 아님).
import { Router, Response } from 'express';
import { AuthRequest, authenticateToken, optionalAuth } from '../middleware/auth';
import prisma from '../config/database';
import { sendPushToUser } from '../utils/push';
import { notifyAdmins, createNotification } from '../controllers/notificationController';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

const CLAIM_TYPES = ['skishop', 'repair', 'rental', 'accommodation'];
const sel = { id: true, name: true, userId: true, claimable: true } as const;

async function getShop(shopType: string, shopId: string) {
  switch (shopType) {
    case 'skishop': return prisma.skiShop.findUnique({ where: { id: shopId }, select: sel });
    case 'repair': return prisma.repairShop.findUnique({ where: { id: shopId }, select: sel });
    case 'rental': return prisma.rental.findUnique({ where: { id: shopId }, select: sel });
    case 'accommodation': return prisma.accommodation.findUnique({ where: { id: shopId }, select: sel });
    default: return null;
  }
}

// 소유권 이전 + 승인 + claimable 해제 — 4개 모델 공통
async function transferOwnership(shopType: string, shopId: string, userId: string) {
  const data = { userId, approved: true, claimable: false };
  switch (shopType) {
    case 'skishop': return prisma.skiShop.update({ where: { id: shopId }, data });
    case 'repair': return prisma.repairShop.update({ where: { id: shopId }, data });
    case 'rental': return prisma.rental.update({ where: { id: shopId }, data });
    case 'accommodation': return prisma.accommodation.update({ where: { id: shopId }, data });
  }
}

// 소유권 이전 요청 생성
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { shopType, shopId, businessLicense, message } = req.body;
    if (!CLAIM_TYPES.includes(shopType) || typeof shopId !== 'string' || !shopId || !businessLicense) {
      res.status(400).json({ error: '매장 정보와 사업자등록증은 필수입니다.' });
      return;
    }
    const shop = await getShop(shopType, shopId);
    if (!shop) { res.status(404).json({ error: '매장을 찾을 수 없습니다.' }); return; }
    if (shop.userId === userId) { res.status(400).json({ error: '이미 내 매장입니다.' }); return; }

    // 동일 매장 대기중 요청 중복 방지
    const dupe = await prisma.shopClaim.findFirst({ where: { shopType, shopId, userId, status: 'pending' } });
    if (dupe) { res.status(409).json({ error: '이미 요청이 접수되었습니다. 관리자 확인을 기다려주세요.' }); return; }

    const claim = await prisma.shopClaim.create({
      data: {
        shopType, shopId, userId,
        businessLicense,
        message: sanitizeText(message, 500) || null,
      },
    });
    await notifyAdmins('system', '매장 소유권 이전 요청', `"${shop.name}" 매장 관리 요청이 접수되었습니다.`, '/admin-approval');
    res.status(201).json(claim);
  } catch (error) {
    console.error('Create shop claim error:', error);
    res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다.' });
  }
});

// 관리자: 대기중 요청 목록 (매장명·요청자 정보 조인)
// 내 매장 먼저 찾기 — 사장님이 새로 등록하기 전에 스노우판이 미리 올려 둔 매장(사장님 확인 전)이 있는지 상호·전화로 검색.
// 공개 목록에 이미 있는 정보(상호·주소·전화·리조트)만 돌려주고, 로그인돼 있으면 내 매장 여부(mine)를 표시.
// 매장 수가 수백이라 4개 테이블을 한 번에 읽어 메모리에서 띄어쓰기 무시·전화 숫자만 비교(DB contains 로는 "곤지암 렌탈"/"곤지암렌탈" 을 못 맞춤).
router.get('/find', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const q = typeof raw === 'string' ? raw.trim() : '';
    if (q.length < 2 || q.length > 60) { res.status(400).json({ error: '상호 또는 전화번호를 2자 이상 입력하세요.' }); return; }
    const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    const digits = (s: string) => s.replace(/\D/g, '');
    const qn = norm(q); const qd = digits(q);
    const byPhone = qd.length >= 7 && qd.length >= qn.length - 3; // 숫자 위주 입력이면 전화번호 검색
    const shopSel = { id: true, name: true, address: true, phone: true, claimable: true, userId: true, resort: { select: { name: true } } } as const;
    const [ski, rep, ren, acc] = await Promise.all([
      prisma.skiShop.findMany({ where: { approved: true }, select: shopSel, take: 3000 }),
      prisma.repairShop.findMany({ where: { approved: true }, select: shopSel, take: 3000 }),
      prisma.rental.findMany({ where: { approved: true }, select: shopSel, take: 3000 }),
      prisma.accommodation.findMany({ where: { approved: true }, select: { id: true, name: true, claimable: true, userId: true, resort: { select: { name: true } } }, take: 3000 }),
    ]);
    type Row = { id: string; name: string; address?: string | null; phone?: string | null; claimable: boolean; userId: string; resort: { name: string } | null };
    const tag = (rows: Row[], kind: string) => rows.map((r) => ({ kind, ...r }));
    const all = [...tag(ski, 'skishop'), ...tag(rep, 'repair'), ...tag(ren, 'rental'), ...tag(acc, 'accommodation')];
    const score = (r: Row & { kind: string }): number => {
      if (byPhone) return r.phone && digits(r.phone).includes(qd) ? 100 : 0;
      const n = norm(r.name);
      if (n === qn) return 100;
      if (n.startsWith(qn)) return 60;
      if (n.includes(qn)) return 30;
      return 0;
    };
    const me = req.user?.id;
    const hits = all.map((r) => ({ r, s: score(r) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.r.name.localeCompare(b.r.name, 'ko')).slice(0, 30)
      .map(({ r }) => ({
        kind: r.kind, id: r.id, name: r.name, address: r.address || null, phone: r.phone || null, resort: r.resort?.name || null,
        claimable: r.claimable, mine: !!me && r.userId === me, ownerManaged: !r.claimable,
      }));
    res.json(hits);
  } catch (error) {
    console.error('Shop find error:', error);
    res.status(500).json({ error: '매장 검색에 실패했습니다.' });
  }
});

router.get('/pending', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const claims = await prisma.shopClaim.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } });

    // shopType 이 관계가 아니라 수동으로 매장명·요청자 이름 채움.
    const enriched = await Promise.all(claims.map(async (c) => {
      const shop = await getShop(c.shopType, c.shopId);
      const user = await prisma.user.findUnique({ where: { id: c.userId }, select: { name: true, email: true } });
      return {
        ...c,
        shopName: shop?.name || '(삭제됨)',
        // 시딩 매장(확인 전)인지 — 이미 사장님이 관리 중인 매장을 가져가려는 요청이면 관리자가 더 신중히 봐야 함
        shopClaimable: shop?.claimable ?? null,
        requesterName: user?.name || '',
        requesterEmail: user?.email || '',
      };
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: '요청 목록 조회 실패' });
  }
});

// 관리자: 승인 → 매장 소유권을 요청자에게 이전 (+ 승인 상태, claimable 해제)
router.put('/:id/approve', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const claim = await prisma.shopClaim.findUnique({ where: { id: req.params.id } });
    if (!claim || claim.status !== 'pending') { res.status(404).json({ error: '요청을 찾을 수 없습니다.' }); return; }

    const shop = await getShop(claim.shopType, claim.shopId);
    if (!shop) { res.status(404).json({ error: '매장을 찾을 수 없습니다.' }); return; }

    await transferOwnership(claim.shopType, claim.shopId, claim.userId);
    await prisma.shopClaim.update({ where: { id: claim.id }, data: { status: 'approved' } });
    await createNotification(claim.userId, 'system', '매장 소유권 이전 완료', `"${shop.name}" 매장을 이제 직접 관리할 수 있어요.`, '/mypage/shops').catch(() => {});
    sendPushToUser(claim.userId, '매장 소유권 이전 완료', `"${shop.name}" 매장을 이제 직접 관리할 수 있어요.`, '/mypage/shops').catch(() => {});
    res.json({ message: '승인 및 소유권 이전 완료' });
  } catch (error) {
    console.error('Approve shop claim error:', error);
    res.status(500).json({ error: '승인 처리 실패' });
  }
});

// 관리자: 거절
router.put('/:id/reject', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근 가능' }); return; }
    const claim = await prisma.shopClaim.findUnique({ where: { id: req.params.id } });
    if (!claim || claim.status !== 'pending') { res.status(404).json({ error: '요청을 찾을 수 없습니다.' }); return; }
    await prisma.shopClaim.update({ where: { id: claim.id }, data: { status: 'rejected' } });
    await createNotification(claim.userId, 'system', '매장 이전 요청 반려', '매장 소유권 이전 요청이 반려되었습니다. 문의가 필요하면 고객센터로 연락주세요.', '/mypage/support').catch(() => {});
    sendPushToUser(claim.userId, '매장 이전 요청 반려', '매장 소유권 이전 요청이 반려되었습니다.', '/mypage/support').catch(() => {});
    res.json({ message: '거절 완료' });
  } catch (error) {
    res.status(500).json({ error: '거절 처리 실패' });
  }
});

export default router;
