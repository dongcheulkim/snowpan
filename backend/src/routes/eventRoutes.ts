import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

// 이벤트 신청 (2026-10-03, 사장님 "앱 출시 이벤트 — 메인배너에서 신청, 로그인 필수, 인스타 아이디 남기기")
//  GET  /events/:key            공개: 이벤트 설정 + 신청자 수
//  GET  /events/:key/me         로그인: 내 신청 여부
//  POST /events/:key/apply      로그인: 신청/수정 { name, phone, instagram (필수 3개), message?(응원 한마디) } — 회원당 1건, 같은 연락처·인스타로 다른 계정 중복 신청 불가
//  GET  /events/admin/:key/entries, PUT /events/admin/:key, DELETE /events/admin/:key/entries/:id  관리자
const router = Router();
const KEY_RE = /^[a-z0-9-]{1,40}$/;
const IG_RE = /^[A-Za-z0-9._]{1,30}$/;
const PHONE_RE = /^01[016789]\d{7,8}$/;

export interface EventConfig { active: boolean; title: string; description: string; prize: string; endsAt: string | null; buttonLabel: string }
const DEFAULTS: Record<string, EventConfig> = {
  launch: {
    active: true,
    title: '스노우판 앱 출시 기념 이벤트',
    description: '성함·연락처·인스타만 적으면 신청 끝.\n당첨 안내는 앱 채팅으로.',
    prize: '',
    endsAt: null,
    buttonLabel: '이벤트 신청하기',
  },
};

export async function readEventConfig(key: string): Promise<EventConfig | null> {
  const base = DEFAULTS[key];
  const row = await prisma.adminSetting.findUnique({ where: { key: `event_${key}` } });
  if (!row) return base ?? null;
  try { return { ...(base ?? DEFAULTS.launch), ...(JSON.parse(row.value) as Partial<EventConfig>) }; } catch { return base ?? null; }
}
function isOpen(cfg: EventConfig): boolean {
  if (!cfg.active) return false;
  if (cfg.endsAt && Date.parse(cfg.endsAt) < Date.now()) return false;
  return true;
}
function normalizeInstagram(raw: unknown): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  let v = String(raw).trim();
  if (!v) return { ok: true, value: null };
  v = v.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '');
  if (!IG_RE.test(v)) return { ok: false };
  return { ok: true, value: v.toLowerCase() };
}
function normalizePhone(raw: unknown): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  const v = String(raw).replace(/\D/g, '');
  if (!v) return { ok: true, value: null };
  if (!PHONE_RE.test(v)) return { ok: false };
  return { ok: true, value: v };
}

router.get('/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = String(req.params.key);
    if (!KEY_RE.test(key)) { res.status(400).json({ error: '잘못된 이벤트입니다.' }); return; }
    const cfg = await readEventConfig(key);
    if (!cfg) { res.status(404).json({ error: '이벤트를 찾을 수 없어요.' }); return; }
    const count = await prisma.eventEntry.count({ where: { eventKey: key } });
    res.json({ key, ...cfg, open: isOpen(cfg), count });
  } catch (e) { console.error('event get error:', e); res.status(500).json({ error: '이벤트를 불러오지 못했어요.' }); }
});

router.get('/:key/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const key = String(req.params.key);
    if (!KEY_RE.test(key)) { res.status(400).json({ error: '잘못된 이벤트입니다.' }); return; }
    const [row, me] = await Promise.all([
      prisma.eventEntry.findUnique({ where: { eventKey_userId: { eventKey: key, userId: req.user!.id } } }),
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true, phone: true } }),
    ]);
    // 폼 기본값: 신청했으면 적은 값, 아니면 계정 정보(카카오·애플은 전화 없음 → 빈칸)
    res.json(row
      ? { applied: true, name: row.name || me?.name || '', phone: row.phone || me?.phone || '', instagram: row.instagram, message: row.message, createdAt: row.createdAt }
      : { applied: false, name: me?.name || '', phone: me?.phone || '', instagram: null, message: null });
  } catch (e) { console.error('event me error:', e); res.status(500).json({ error: '신청 정보를 불러오지 못했어요.' }); }
});

router.post('/:key/apply', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const key = String(req.params.key);
    if (!KEY_RE.test(key)) { res.status(400).json({ error: '잘못된 이벤트입니다.' }); return; }
    const cfg = await readEventConfig(key);
    if (!cfg) { res.status(404).json({ error: '이벤트를 찾을 수 없어요.' }); return; }
    if (!isOpen(cfg)) { res.status(409).json({ error: '이벤트 신청이 마감됐어요.' }); return; }
    const body = (req.body || {}) as { name?: unknown; instagram?: unknown; phone?: unknown; message?: unknown };
    const userId = req.user!.id;
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
    const existing = await prisma.eventEntry.findUnique({ where: { eventKey_userId: { eventKey: key, userId } } });
    // 성함·연락처·인스타 3개 필수 (안 보내면 기존 신청값 → 계정값 순으로 채움)
    const name = (body.name === undefined || body.name === null ? (existing?.name || me?.name || '') : String(body.name)).trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!name) { res.status(400).json({ error: '성함을 적어 주세요.' }); return; }
    const ig = normalizeInstagram(body.instagram === undefined ? existing?.instagram : body.instagram);
    if (!ig.ok) { res.status(400).json({ error: '인스타그램 아이디는 영문·숫자·밑줄·점만 30자까지 쓸 수 있어요.' }); return; }
    if (!ig.value) { res.status(400).json({ error: '인스타그램 아이디를 적어 주세요.' }); return; }
    const ph = normalizePhone(body.phone === undefined ? (existing?.phone || me?.phone) : body.phone);
    if (!ph.ok) { res.status(400).json({ error: '휴대폰 번호를 숫자만 10~11자리로 적어 주세요. (예: 01012345678)' }); return; }
    if (!ph.value) { res.status(400).json({ error: '당첨 안내를 드릴 연락처를 적어 주세요.', needPhone: true }); return; }
    const message = body.message === undefined || body.message === null ? undefined : String(body.message).trim().slice(0, 200) || null;
    // 중복 신청 차단 — 다른 계정이 같은 연락처나 같은 인스타 아이디로 이미 신청했으면 거절
    const dup = await prisma.eventEntry.findFirst({ where: { eventKey: key, userId: { not: userId }, OR: [{ phone: ph.value }, { instagram: ig.value }] }, select: { phone: true, instagram: true } });
    if (dup) { res.status(409).json({ error: dup.phone === ph.value ? '이 연락처로 이미 신청된 내역이 있어요. 한 사람당 한 번만 신청할 수 있어요.' : '이 인스타그램 아이디로 이미 신청된 내역이 있어요. 한 사람당 한 번만 신청할 수 있어요.' }); return; }
    const data = { name, instagram: ig.value, phone: ph.value, ...(message !== undefined ? { message } : {}) };
    const row = existing
      ? await prisma.eventEntry.update({ where: { id: existing.id }, data })
      : await prisma.eventEntry.create({ data: { eventKey: key, userId, ...data, message: message ?? null } });
    res.status(existing ? 200 : 201).json({ applied: true, name: row.name, phone: row.phone, instagram: row.instagram, message: row.message, createdAt: row.createdAt, updated: !!existing });
  } catch (e) { console.error('event apply error:', e); res.status(500).json({ error: '신청하지 못했어요. 잠시 뒤 다시 해 주세요.' }); }
});

// ---- 관리자 ----
router.get('/admin/:key/entries', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const key = String(req.params.key);
  if (!KEY_RE.test(key)) { res.status(400).json({ error: '잘못된 이벤트입니다.' }); return; }
  const rows = await prisma.eventEntry.findMany({
    where: { eventKey: key }, orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, nickname: true, email: true, phone: true, provider: true } } },
  });
  res.json(rows);
});
router.put('/admin/:key', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const key = String(req.params.key);
  if (!KEY_RE.test(key)) { res.status(400).json({ error: '잘못된 이벤트입니다.' }); return; }
  const cur = (await readEventConfig(key)) ?? DEFAULTS.launch;
  const b = (req.body || {}) as Partial<EventConfig>;
  const next: EventConfig = {
    active: typeof b.active === 'boolean' ? b.active : cur.active,
    title: typeof b.title === 'string' ? b.title.trim().slice(0, 80) || cur.title : cur.title,
    description: typeof b.description === 'string' ? b.description.trim().slice(0, 600) : cur.description,
    prize: typeof b.prize === 'string' ? b.prize.trim().slice(0, 300) : cur.prize,
    endsAt: b.endsAt === null ? null : typeof b.endsAt === 'string' && !Number.isNaN(Date.parse(b.endsAt)) ? new Date(b.endsAt).toISOString() : cur.endsAt,
    buttonLabel: typeof b.buttonLabel === 'string' ? b.buttonLabel.trim().slice(0, 30) || cur.buttonLabel : cur.buttonLabel,
  };
  await prisma.adminSetting.upsert({ where: { key: `event_${key}` }, update: { value: JSON.stringify(next) }, create: { key: `event_${key}`, value: JSON.stringify(next) } });
  res.json({ key, ...next, open: isOpen(next) });
});
router.delete('/admin/:key/entries/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try { await prisma.eventEntry.delete({ where: { id: String(req.params.id) } }); res.json({ ok: true }); }
  catch { res.status(404).json({ error: '신청을 찾을 수 없어요.' }); }
});

export default router;
