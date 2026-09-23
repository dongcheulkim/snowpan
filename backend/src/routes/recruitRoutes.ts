// 매장 모집·신청 — 2026-09-23 사용자 요청: "스노우메타 정비샵 앰버서더 뽑을 건데 스노우판에서 가입해서 신청하게, 사장님은 확인만".
// 배지·명단 없음. 사장님(직원)이 모집 글을 올리면 매장 페이지·/recruit/:id 에 뜨고, 회원이 신청서(이름·연락처·인스타·한마디)를 내면
// 사장님·직원에게 알림이 가고 대시보드에서 신청자 목록을 본다. 회원 가입 유도가 목적이라 로그인만 하면 신청할 수 있다.
import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authenticateToken, optionalAuth } from '../middleware/auth';
import { sanitizeText } from '../utils/sanitize';
import { parseKstDate } from '../utils/kst';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from '../utils/push';
import { displayName } from '../utils/displayName';
import { shopAccess, isStaffShopType, staffShopsOf, shopManagerIds, StaffShopType } from '../utils/shopAccess';

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DETAIL_PATH: Record<StaffShopType, string> = { skishop: '/skishop', repair: '/repair', rental: '/rental', lesson: '/lesson', accommodation: '/accommodation' };
const publicUser = { id: true, name: true, nickname: true, profileImage: true } as const;

type RecruitRow = { id: string; shopType: string; shopId: string; shopName: string; ownerId: string; title: string; description: string; deadline: Date | null; closed: boolean; createdAt: Date };
const isActive = (r: { closed: boolean; deadline: Date | null }) => !r.closed && (!r.deadline || r.deadline.getTime() >= Date.now());
function serialize(r: RecruitRow, extra: Record<string, unknown> = {}) {
  return {
    id: r.id, shopType: r.shopType, shopId: r.shopId, shopName: r.shopName, title: r.title, description: r.description,
    deadline: r.deadline ? r.deadline.toISOString().slice(0, 10) : null, closed: r.closed, active: isActive(r), createdAt: r.createdAt,
    shopPath: isStaffShopType(r.shopType) ? `${DETAIL_PATH[r.shopType]}/${r.shopId}` : '/', ...extra,
  };
}
// 마감일 'YYYY-MM-DD' → 그날 KST 23:59:59 까지 유효
function parseDeadline(v: unknown): { deadline: Date | null; error?: string } {
  if (v === undefined || v === null || v === '') return { deadline: null };
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { deadline: null, error: '마감일 형식이 올바르지 않아요' };
  const d = parseKstDate(v);
  if (!d) return { deadline: null, error: '마감일이 올바르지 않아요' };
  return { deadline: new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1) };
}
function notify(userId: string, title: string, message: string, link: string): void {
  createNotification(userId, 'system', title, message, link).catch(() => undefined);
  sendPushToUser(userId, title, message, link).catch(() => undefined);
}

// 내가 관리하는 매장의 모집 전부 (사장님·직원) + 신청 수 — 대시보드용
router.get('/mine', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const staffShops = await staffShopsOf(me);
    const rows = await prisma.shopRecruit.findMany({
      where: { OR: [{ ownerId: me }, ...staffShops.map((s) => ({ shopType: s.shopType, shopId: s.shopId }))] },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: rows.map((r) => serialize(r, { applicationCount: r._count.applications })) });
  } catch (e) { console.error('Recruit mine error:', e); res.status(500).json({ error: '모집 목록을 불러오지 못했어요.' }); }
});

// 매장 페이지용: 진행 중인 모집만 (공개)
router.get('/shop/:shopType/:shopId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shopType, shopId } = req.params;
    if (!isStaffShopType(shopType) || !UUID_RE.test(shopId)) { res.status(400).json({ error: '매장 정보가 올바르지 않아요.' }); return; }
    const rows = await prisma.shopRecruit.findMany({ where: { shopType, shopId, closed: false, OR: [{ deadline: null }, { deadline: { gte: new Date() } }] }, orderBy: { createdAt: 'desc' }, take: 5 });
    res.json({ items: rows.map((r) => serialize(r)) });
  } catch (e) { console.error('Recruit shop list error:', e); res.status(500).json({ error: '모집을 불러오지 못했어요.' }); }
});

// 모집 상세 (공개, 로그인하면 내 신청 여부·관리 권한 포함)
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!UUID_RE.test(id)) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    const r = await prisma.shopRecruit.findUnique({ where: { id } });
    if (!r) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    let applied = false, canManage = false;
    if (req.user) {
      applied = !!(await prisma.shopApplication.findUnique({ where: { recruitId_userId: { recruitId: r.id, userId: req.user.id } }, select: { id: true } }));
      canManage = (await shopAccess(req.user, r.shopType, r.shopId)).allowed;
    }
    res.json(serialize(r, { applied, canManage }));
  } catch (e) { console.error('Recruit detail error:', e); res.status(500).json({ error: '모집을 불러오지 못했어요.' }); }
});

// 모집 올리기 (사장님·직원, 승인된 매장만)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body || {};
    const shopType = String(b.shopType || ''); const shopId = String(b.shopId || '');
    if (!isStaffShopType(shopType) || !UUID_RE.test(shopId)) { res.status(400).json({ error: '매장 정보가 올바르지 않아요.' }); return; }
    const a = await shopAccess(req.user!, shopType, shopId);
    if (!a.shop) { res.status(404).json({ error: '매장을 찾을 수 없어요.' }); return; }
    if (!a.allowed) { res.status(403).json({ error: '매장 사장님이나 직원만 모집을 올릴 수 있어요.' }); return; }
    if (!a.shop.approved) { res.status(400).json({ error: '매장 승인 후에 모집을 올릴 수 있어요.' }); return; }
    const title = sanitizeText(b.title, 60)?.trim() || '';
    const description = sanitizeText(b.description, 2000)?.trim() || '';
    if (title.length < 2) { res.status(400).json({ error: '제목을 2자 이상 적어 주세요.' }); return; }
    if (description.length < 5) { res.status(400).json({ error: '모집 내용을 5자 이상 적어 주세요.' }); return; }
    const dl = parseDeadline(b.deadline);
    if (dl.error) { res.status(400).json({ error: dl.error }); return; }
    const created = await prisma.shopRecruit.create({ data: { shopType, shopId, shopName: a.shop.name, ownerId: a.shop.userId || req.user!.id, title, description, deadline: dl.deadline } });
    res.status(201).json(serialize(created, { applicationCount: 0 }));
  } catch (e) { console.error('Recruit create error:', e); res.status(500).json({ error: '모집을 올리지 못했어요.' }); }
});

// 모집 수정·마감·다시 열기 (사장님·직원)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!UUID_RE.test(id)) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    const r = await prisma.shopRecruit.findUnique({ where: { id } });
    if (!r) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    if (!(await shopAccess(req.user!, r.shopType, r.shopId)).allowed) { res.status(403).json({ error: '매장 사장님이나 직원만 고칠 수 있어요.' }); return; }
    const b = req.body || {}; const data: { title?: string; description?: string; deadline?: Date | null; closed?: boolean } = {};
    if (b.title !== undefined) { const t = sanitizeText(b.title, 60)?.trim() || ''; if (t.length < 2) { res.status(400).json({ error: '제목을 2자 이상 적어 주세요.' }); return; } data.title = t; }
    if (b.description !== undefined) { const d = sanitizeText(b.description, 2000)?.trim() || ''; if (d.length < 5) { res.status(400).json({ error: '모집 내용을 5자 이상 적어 주세요.' }); return; } data.description = d; }
    if (b.deadline !== undefined) { const dl = parseDeadline(b.deadline); if (dl.error) { res.status(400).json({ error: dl.error }); return; } data.deadline = dl.deadline; }
    if (b.closed !== undefined) data.closed = !!b.closed;
    const updated = await prisma.shopRecruit.update({ where: { id }, data, include: { _count: { select: { applications: true } } } });
    res.json(serialize(updated, { applicationCount: updated._count.applications }));
  } catch (e) { console.error('Recruit update error:', e); res.status(500).json({ error: '수정하지 못했어요.' }); }
});

// 모집 삭제 (사장님·직원) — 신청서도 함께 지워짐
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!UUID_RE.test(id)) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    const r = await prisma.shopRecruit.findUnique({ where: { id }, select: { id: true, shopType: true, shopId: true } });
    if (!r) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    if (!(await shopAccess(req.user!, r.shopType, r.shopId)).allowed) { res.status(403).json({ error: '매장 사장님이나 직원만 지울 수 있어요.' }); return; }
    await prisma.shopRecruit.delete({ where: { id } });
    res.json({ message: '모집을 지웠어요.' });
  } catch (e) { console.error('Recruit delete error:', e); res.status(500).json({ error: '지우지 못했어요.' }); }
});

// 신청 (로그인 회원) — 모집당 1회. 사장님·직원에게 알림.
router.post('/:id/apply', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id; const me = req.user!;
    if (!UUID_RE.test(id)) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    const r = await prisma.shopRecruit.findUnique({ where: { id } });
    if (!r) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    if (!isActive(r)) { res.status(400).json({ error: '마감된 모집이에요.' }); return; }
    if ((await shopAccess(me, r.shopType, r.shopId)).allowed) { res.status(400).json({ error: '내 매장 모집에는 신청할 수 없어요.' }); return; }
    const b = req.body || {};
    const name = sanitizeText(b.name, 30)?.trim() || '';
    const phone = String(b.phone || '').replace(/[^\d+-]/g, '').slice(0, 20);
    const instagram = (sanitizeText(b.instagram, 40)?.trim() || '').replace(/^@/, '').replace(/\s+/g, '') || null;
    const message = sanitizeText(b.message, 500)?.trim() || null;
    if (!name) { res.status(400).json({ error: '이름을 적어 주세요.' }); return; }
    if (phone.replace(/\D/g, '').length < 9) { res.status(400).json({ error: '연락처를 정확히 적어 주세요.' }); return; }
    const dup = await prisma.shopApplication.findUnique({ where: { recruitId_userId: { recruitId: r.id, userId: me.id } }, select: { id: true } });
    if (dup) { res.status(409).json({ error: '이미 신청했어요. 사장님이 확인하면 연락드릴 거예요.' }); return; }
    await prisma.shopApplication.create({ data: { recruitId: r.id, userId: me.id, name, phone, instagram, message } });
    const link = '/mypage/shops';
    for (const mid of await shopManagerIds(r.shopType, r.shopId, r.ownerId)) notify(mid, `'${r.title}' 신청이 왔어요`, `${name}님이 신청했어요. 대시보드에서 연락처를 확인해 주세요.`, link);
    res.status(201).json({ message: '신청했어요. 사장님이 확인하면 연락드릴 거예요.' });
  } catch (e) { console.error('Recruit apply error:', e); res.status(500).json({ error: '신청하지 못했어요. 잠시 후 다시 시도해 주세요.' }); }
});

// 신청자 목록 (사장님·직원)
router.get('/:id/applications', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!UUID_RE.test(id)) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    const r = await prisma.shopRecruit.findUnique({ where: { id }, select: { id: true, shopType: true, shopId: true } });
    if (!r) { res.status(404).json({ error: '모집을 찾을 수 없어요.' }); return; }
    if (!(await shopAccess(req.user!, r.shopType, r.shopId)).allowed) { res.status(403).json({ error: '매장 사장님이나 직원만 볼 수 있어요.' }); return; }
    const rows = await prisma.shopApplication.findMany({ where: { recruitId: r.id }, include: { user: { select: publicUser } }, orderBy: { createdAt: 'desc' } });
    res.json({ items: rows.map((a) => ({ id: a.id, name: a.name, phone: a.phone, instagram: a.instagram, message: a.message, createdAt: a.createdAt, user: { id: a.user.id, name: displayName(a.user), profileImage: a.user.profileImage } })) });
  } catch (e) { console.error('Recruit applications error:', e); res.status(500).json({ error: '신청자 목록을 불러오지 못했어요.' }); }
});

export default router;
