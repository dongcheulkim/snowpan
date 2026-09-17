// 시합 일정 — 주최자가 직접 신청하고 관리자가 승인하면 공개된다.
// 이전엔 프론트 정적 파일(data/competitions.ts)에 하드코딩 + 관리자 1:1 문의로만 등록할 수 있었음.
// 상태: pending(검토 중) → approved(공개) / rejected(반려, 사유 포함). 반려된 신청은 주최자가 고쳐서 다시 올리면 pending 으로 돌아간다.
import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken, optionalAuth } from '../middleware/auth';
import { validateUUIDParam } from '../middleware/validateUUID';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';
import { createUserLimiter } from '../middleware/rateLimit';
import { createNotification, notifyAdmins } from '../controllers/notificationController';
import { sendPushToUser } from '../utils/push';
import { isAllowedImageUrl } from '../utils/validate';
import { parseKstDate, kstDayStart } from '../utils/kst';
import { cleanReason, withReason, sendSupportMessage } from '../utils/supportMessage';
import { emitToUser } from '../realtime';

const router = Router();

// 신청 도배 방지 — 한 사용자 1시간 5건 (관리자 포함, 정상 주최자에겐 충분)
const competitionCreateLimiter = createUserLimiter(5, 60 * 60_000);

const SPORTS = ['ski', 'board', 'both'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const include = {
  resort: { select: { id: true, name: true } },
} as const;

// KST 달력일 'YYYY-MM-DD' — 프론트 캘린더가 날짜 문자열로 그리므로 시간대에 흔들리지 않게 서버에서 확정
function toKstDateStr(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

type CompetitionRow = {
  id: string; title: string; date: Date; endDate: Date | null; location: string; resortId: string | null;
  sport: string; level: string | null; organizer: string; description: string | null; poster: string | null;
  events: string | null; fee: string | null; contact: string | null; website: string | null; schedule: string | null;
  eligibility: string | null; prize: string | null; status: string; rejectReason: string | null;
  submittedById: string | null; createdAt: Date; updatedAt: Date;
  resort?: { id: string; name: string } | null;
  submittedBy?: { id: string; name: string; nickname: string | null; email: string } | null;
};

function shape(c: CompetitionRow) {
  return {
    ...c,
    date: toKstDateStr(c.date),
    endDate: c.endDate ? toKstDateStr(c.endDate) : null,
  };
}

// 줄바꿈 구분 목록 정리 — 빈 줄 제거, 각 줄 trim
function normalizeLines(v: string | undefined): string | null {
  if (!v) return null;
  const lines = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return lines.length ? lines.join('\n') : null;
}

type ParsedBody = {
  title: string; date: Date; endDate: Date | null; location: string; resortId: string | null; sport: string;
  level: string | null; organizer: string; description: string | null; poster: string | null; events: string | null;
  fee: string | null; contact: string | null; website: string | null; schedule: string | null;
  eligibility: string | null; prize: string | null;
};

// 신청·수정 공통 검증. 잘못된 입력은 한국어 메시지로 400.
async function parseBody(body: any): Promise<{ ok: true; data: ParsedBody } | { ok: false; error: string }> {
  const b = body ?? {};
  const title = sanitizeText(b.title, 200) || '';
  if (title.length < 2 || title.length > 80) return { ok: false, error: '대회명은 2~80자로 입력해 주세요.' };

  const date = parseKstDate(b.date);
  if (!date) return { ok: false, error: '대회 날짜를 확인해 주세요.' };
  let endDate: Date | null = null;
  if (b.endDate !== undefined && b.endDate !== null && String(b.endDate).trim() !== '') {
    endDate = parseKstDate(b.endDate);
    if (!endDate) return { ok: false, error: '종료 날짜를 확인해 주세요.' };
    if (endDate.getTime() < date.getTime()) return { ok: false, error: '종료 날짜는 시작 날짜보다 빠를 수 없어요.' };
  }

  const location = sanitizeText(b.location, 200) || '';
  if (location.length < 1 || location.length > 100) return { ok: false, error: '장소는 1~100자로 입력해 주세요.' };

  let resortId: string | null = null;
  if (typeof b.resortId === 'string' && b.resortId.trim()) {
    if (!UUID_RE.test(b.resortId.trim())) return { ok: false, error: '스키장 정보를 확인해 주세요.' };
    const resort = await prisma.skiResort.findUnique({ where: { id: b.resortId.trim() }, select: { id: true } });
    if (!resort) return { ok: false, error: '스키장 정보를 확인해 주세요.' };
    resortId = resort.id;
  }

  const sport = typeof b.sport === 'string' ? b.sport.trim() : '';
  if (!(SPORTS as readonly string[]).includes(sport)) return { ok: false, error: '종목은 스키, 보드, 스키·보드 중에서 골라 주세요.' };

  const organizer = sanitizeText(b.organizer, 200) || '';
  if (organizer.length < 1 || organizer.length > 60) return { ok: false, error: '주최는 1~60자로 입력해 주세요.' };

  const level = sanitizeText(b.level, 100) || null;
  if (level && level.length > 30) return { ok: false, error: '참가 수준은 30자 이내로 입력해 주세요.' };

  const description = sanitizeText(b.description) || null;
  if (description && description.length > 2000) return { ok: false, error: '대회 소개는 2000자 이내로 입력해 주세요.' };

  const eventsRaw = sanitizeText(b.events) || '';
  if (eventsRaw.length > 1000) return { ok: false, error: '종목 목록은 1000자 이내로 입력해 주세요.' };
  const scheduleRaw = sanitizeText(b.schedule) || '';
  if (scheduleRaw.length > 1000) return { ok: false, error: '세부 일정은 1000자 이내로 입력해 주세요.' };

  const fee = sanitizeText(b.fee, 200) || null;
  if (fee && fee.length > 100) return { ok: false, error: '참가비는 100자 이내로 입력해 주세요.' };
  const contact = sanitizeText(b.contact, 200) || null;
  if (contact && contact.length > 120) return { ok: false, error: '문의처는 120자 이내로 입력해 주세요.' };
  const eligibility = sanitizeText(b.eligibility, 400) || null;
  if (eligibility && eligibility.length > 300) return { ok: false, error: '참가 자격은 300자 이내로 입력해 주세요.' };
  const prize = sanitizeText(b.prize, 400) || null;
  if (prize && prize.length > 300) return { ok: false, error: '시상 내용은 300자 이내로 입력해 주세요.' };

  let website: string | null = null;
  if (typeof b.website === 'string' && b.website.trim()) {
    const w = b.website.trim();
    let valid = w.startsWith('https://') && w.length <= 300;
    if (valid) { try { new URL(w); } catch { valid = false; } }
    if (!valid) return { ok: false, error: '안내 링크는 https:// 로 시작하는 주소로 입력해 주세요.' };
    website = w;
  }

  let poster: string | null = null;
  if (typeof b.poster === 'string' && b.poster.trim()) {
    const p = b.poster.trim();
    if (!isAllowedImageUrl(p)) return { ok: false, error: '포스터 이미지는 업로드한 파일만 등록할 수 있어요.' };
    poster = p;
  }

  return {
    ok: true,
    data: {
      title, date, endDate, location, resortId, sport, level, organizer, description, poster,
      events: normalizeLines(eventsRaw), schedule: normalizeLines(scheduleRaw),
      fee, contact, website, eligibility, prize,
    },
  };
}

function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === 'admin';
}

// 관리자에게 새 신청 알림 (+ 디스코드)
function alertAdmins(title: string, organizer: string) {
  notifyAdmins('system', '시합 일정 등록 신청', `${organizer} · ${title}`, '/admin').catch(() => {});
}

// ── 공개 목록. 기본은 다가오는 대회(오늘 KST 포함) 날짜순, past=1 이면 지난 대회만 최근순.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const today = kstDayStart();
    const past = String(req.query.past || '') === '1';
    const sport = typeof req.query.sport === 'string' ? req.query.sport : '';
    const where: Record<string, unknown> = { status: 'approved' };
    if (past) {
      // 종료일이 있으면 종료일, 없으면 시작일이 오늘 이전
      where.AND = [
        { date: { lt: today } },
        { OR: [{ endDate: null }, { endDate: { lt: today } }] },
      ];
    } else {
      where.OR = [{ date: { gte: today } }, { endDate: { gte: today } }];
    }
    if (sport === 'ski') where.sport = { in: ['ski', 'both'] };
    else if (sport === 'board') where.sport = { in: ['board', 'both'] };
    else if (sport === 'both') where.sport = 'both';

    const items = await prisma.competition.findMany({
      where,
      orderBy: [{ date: past ? 'desc' : 'asc' }, { createdAt: 'asc' }],
      take: 200,
      include,
    });
    res.json({ items: items.map(shape) });
  } catch (err) {
    console.error('List competitions error:', err);
    res.status(500).json({ error: '시합 일정을 불러오지 못했어요.' });
  }
});

// ── 내 신청 내역 (모든 상태, 최신순). '/:id' 보다 먼저.
router.get('/mine', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.competition.findMany({
      where: { submittedById: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include,
    });
    res.json({ items: items.map(shape) });
  } catch (err) {
    console.error('My competitions error:', err);
    res.status(500).json({ error: '신청 내역을 불러오지 못했어요.' });
  }
});

// ── 관리자: 검토 대기 목록. '/:id' 보다 먼저.
router.get('/admin/pending', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const items = await prisma.competition.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: {
        ...include,
        submittedBy: { select: { id: true, name: true, nickname: true, email: true } },
      },
    });
    res.json(items.map(shape));
  } catch (err) {
    console.error('Pending competitions error:', err);
    res.status(500).json({ error: '대기 목록을 불러오지 못했어요.' });
  }
});

// ── 단건. 공개(approved)이거나 본인 신청이거나 관리자일 때만, 아니면 404 (존재 여부 노출 안 함).
router.get('/:id', validateUUIDParam('id'), optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const c = await prisma.competition.findUnique({ where: { id: req.params.id }, include });
    const visible = c && (c.status === 'approved' || isAdmin(req) || (req.user && c.submittedById === req.user.id));
    if (!c || !visible) { res.status(404).json({ error: '대회를 찾을 수 없어요.' }); return; }
    res.json(shape(c));
  } catch (err) {
    console.error('Get competition error:', err);
    res.status(500).json({ error: '대회 정보를 불러오지 못했어요.' });
  }
});

// ── 신청 (관리자는 바로 공개)
router.post('/', authenticateToken, competitionCreateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = await parseBody(req.body);
    if (!parsed.ok) { res.status(400).json({ error: parsed.error }); return; }
    const admin = isAdmin(req);
    const c = await prisma.competition.create({
      data: { ...parsed.data, status: admin ? 'approved' : 'pending', submittedById: req.user!.id },
      include,
    });
    if (!admin) alertAdmins(c.title, c.organizer);
    res.status(201).json(shape(c));
  } catch (err) {
    console.error('Create competition error:', err);
    res.status(500).json({ error: '신청 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

// ── 수정. 주최자는 검토 중·반려 상태에서만 (수정하면 다시 검토 중), 관리자는 언제나 (상태 유지).
router.put('/:id', validateUUIDParam('id'), authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.competition.findUnique({ where: { id: req.params.id }, select: { id: true, status: true, submittedById: true } });
    if (!existing) { res.status(404).json({ error: '대회를 찾을 수 없어요.' }); return; }
    const admin = isAdmin(req);
    const owner = existing.submittedById === req.user!.id;
    if (!admin && !owner) { res.status(403).json({ error: '신청한 분만 수정할 수 있어요.' }); return; }
    if (!admin && existing.status === 'approved') {
      res.status(403).json({ error: '공개된 일정은 직접 수정할 수 없어요. 고객센터로 문의해 주세요.' });
      return;
    }
    const parsed = await parseBody(req.body);
    if (!parsed.ok) { res.status(400).json({ error: parsed.error }); return; }
    const c = await prisma.competition.update({
      where: { id: existing.id },
      data: admin ? parsed.data : { ...parsed.data, status: 'pending', rejectReason: null },
      include,
    });
    if (!admin) alertAdmins(c.title, c.organizer);
    res.json(shape(c));
  } catch (err) {
    console.error('Update competition error:', err);
    res.status(500).json({ error: '수정 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

// ── 삭제 (주최자 본인 또는 관리자)
router.delete('/:id', validateUUIDParam('id'), authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.competition.findUnique({ where: { id: req.params.id }, select: { id: true, submittedById: true } });
    if (!existing) { res.status(404).json({ error: '대회를 찾을 수 없어요.' }); return; }
    if (!isAdmin(req) && existing.submittedById !== req.user!.id) { res.status(403).json({ error: '신청한 분만 삭제할 수 있어요.' }); return; }
    await prisma.competition.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete competition error:', err);
    res.status(500).json({ error: '삭제 중 오류가 발생했어요.' });
  }
});

// ── 관리자 승인 → 공개 + 주최자에게 알림·푸시
router.put('/:id/approve', validateUUIDParam('id'), authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const existing = await prisma.competition.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) { res.status(404).json({ error: '대회를 찾을 수 없어요.' }); return; }
    const c = await prisma.competition.update({
      where: { id: existing.id },
      data: { status: 'approved', rejectReason: null },
      include,
    });
    if (c.submittedById && c.submittedById !== req.user!.id) {
      const title = '시합 일정이 등록됐어요';
      const msg = `'${c.title}' 일정이 시합 일정에 공개됐어요.`;
      const link = `/competitions/${c.id}`;
      await createNotification(c.submittedById, 'system', title, msg, link);
      emitToUser(c.submittedById, 'new_notification', { type: 'system', title, message: msg, link });
      sendPushToUser(c.submittedById, title, msg, link).catch(() => {});
    }
    res.json(shape(c));
  } catch (err) {
    console.error('Approve competition error:', err);
    res.status(500).json({ error: '승인 중 오류가 발생했어요.' });
  }
});

// ── 관리자 반려 { reason, sendChat? } → 사유 저장 + 주최자 알림 (사유 있고 sendChat 이면 고객센터 채팅으로도)
router.put('/:id/reject', validateUUIDParam('id'), authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const existing = await prisma.competition.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) { res.status(404).json({ error: '대회를 찾을 수 없어요.' }); return; }
    const reason = cleanReason(req.body?.reason);
    const c = await prisma.competition.update({
      where: { id: existing.id },
      data: { status: 'rejected', rejectReason: reason || null },
      include,
    });
    if (c.submittedById && c.submittedById !== req.user!.id) {
      const title = '시합 일정 신청이 반려됐어요';
      const msg = withReason(`'${c.title}' 신청이 반려됐어요. 내용을 고쳐서 다시 신청할 수 있어요.`, reason);
      const link = '/competitions/register';
      await createNotification(c.submittedById, 'system', title, msg, link);
      emitToUser(c.submittedById, 'new_notification', { type: 'system', title, message: msg, link });
      sendPushToUser(c.submittedById, title, msg, link).catch(() => {});
      if (reason && req.body?.sendChat !== false) {
        sendSupportMessage(c.submittedById, `[시합 일정 신청 반려] '${c.title}'\n사유: ${reason}\n\n내용을 고쳐서 다시 신청해 주시면 빠르게 확인해 드릴게요. 궁금한 점은 이 채팅으로 물어봐 주세요.`).catch(() => {});
      }
    }
    res.json(shape(c));
  } catch (err) {
    console.error('Reject competition error:', err);
    res.status(500).json({ error: '반려 중 오류가 발생했어요.' });
  }
});

export default router;
