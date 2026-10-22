// 관리자: 매장 연락 보드 — 스키·보드샵/정비샵/렌탈샵 본 행(겸업 제외)에 사장님 연락 상태·메모를 붙여 돌려주고, 상태를 갱신한다.
// 사장님 확인 전(claimable) 매장에 전화·문자로 "직접 관리하기"를 안내하는 작업용. 상태값은 프론트 OutreachBoard 와 짝.
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';
import { SHOP_KINDS, type ShopKind } from '../utils/shopKinds';

const OUTREACH_STATUS = ['none', 'absent', 'called', 'yes', 'no', 'del'] as const;
type OutreachStatus = (typeof OUTREACH_STATUS)[number];
const TEMPLATE_KEY = 'outreach.sms';
const MEMO_MAX = 500;
const TEMPLATE_MAX = 1000;

// 보드 업종 = 매장 3종 + 레슨 (2026-09-19 사용자 요청 "레슨 보는 게 없다"). 레슨은 강사가 직접 등록하므로 연락 상태 대신 강사 연락처·소속·승인 여부를 보여준다.
type BoardKind = ShopKind | 'lesson';
const BOARD_KINDS: readonly string[] = [...SHOP_KINDS, 'lesson'];
const isKind = (v: unknown): v is BoardKind => typeof v === 'string' && BOARD_KINDS.includes(v);
const isStatus = (v: unknown): v is OutreachStatus => typeof v === 'string' && (OUTREACH_STATUS as readonly string[]).includes(v);

// 인스타 핸들 정규화 — 주소·@ 를 떼고 핸들만. 빈 값이면 null(지우기). 형식이 틀리면 undefined (2026-10-22)
export function normalizeInstagram(v: unknown): string | null | undefined {
  if (v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  let h = v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '').trim();
  if (!h) return null;
  if (!/^[A-Za-z0-9._]{1,30}$/.test(h)) return undefined;
  return h;
}
async function saveInstagram(kind: BoardKind, id: string, instagram: string | null): Promise<void> {
  const args = { where: { id }, data: { instagram } } as const;
  if (kind === 'skishop') await prisma.skiShop.update(args);
  else if (kind === 'repair') await prisma.repairShop.update(args);
  else if (kind === 'rental') await prisma.rental.update(args);
  // 레슨엔 인스타 칸이 없음 — 무시
}

async function shopExists(kind: BoardKind, id: string): Promise<boolean> {
  const where = { where: { id }, select: { id: true } } as const;
  const row = kind === 'skishop' ? await prisma.skiShop.findUnique(where)
    : kind === 'repair' ? await prisma.repairShop.findUnique(where)
    : kind === 'lesson' ? await prisma.lesson.findUnique(where)
    : await prisma.rental.findUnique(where);
  return !!row;
}

// 보드 목록: 공개(approved) 매장 전부 + 연락 상태 + 리조트 목록 + 문자 템플릿. 사장님이 직접 등록한 매장(claimable=false)은 owner 로 표시만.
export const listOutreach = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sel = {
      id: true, name: true, area: true, resortId: true, address: true, phone: true, hours: true, naverMap: true,
      extraKinds: true, claimable: true, viewCount: true, resort: { select: { name: true } },
      businessLicense: true, // 관리자 보드에서 첨부 서류 바로 보기 (2026-09-23)
      instagram: true, // 인스타 DM 보내기 (2026-10-22)
    } as const;
    const [ski, rep, ren, lessons, marks, resorts, tpl] = await Promise.all([
      prisma.skiShop.findMany({ where: { approved: true }, select: sel }),
      prisma.repairShop.findMany({ where: { approved: true }, select: sel }),
      prisma.rental.findMany({ where: { approved: true }, select: sel }),
      // 레슨은 승인 대기까지 포함 (강사에게 연락할 일이 심사 중에 더 많음)
      prisma.lesson.findMany({ select: { id: true, name: true, phone: true, resortId: true, approved: true, providerType: true, businessLicense: true, instructorCert: true, businessVerified: true, certVerified: true, viewCount: true, createdAt: true, resort: { select: { name: true } }, user: { select: { id: true, name: true, nickname: true, phone: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.shopOutreach.findMany(),
      prisma.skiResort.findMany({ select: { id: true, name: true, location: true }, orderBy: { name: 'asc' } }),
      prisma.adminSetting.findUnique({ where: { key: TEMPLATE_KEY } }),
    ]);
    const markOf = new Map(marks.map((m) => [`${m.shopType}:${m.shopId}`, m]));
    type Row = {
      id: string; name: string; area: string | null; resortId: string | null; address: string | null; phone: string | null; hours: string | null;
      naverMap: string | null; extraKinds: string | null; claimable: boolean; viewCount: number; resort: { name: string } | null; businessLicense: string | null; instagram: string | null;
    };
    const tag = (rows: Row[], kind: ShopKind) => rows.map((r) => {
      const m = markOf.get(`${kind}:${r.id}`);
      return {
        id: r.id, kind, name: r.name, area: r.area || '', resortId: r.resortId || '', resort: r.resort?.name || '',
        address: r.address || '', phone: r.phone || '', hours: r.hours || '', naver: r.naverMap || '',
        extraKinds: r.extraKinds || '', owner: !r.claimable, viewCount: r.viewCount, businessLicense: r.businessLicense || '', instagram: r.instagram || '',
        status: m?.status || 'none', memo: m?.memo || '', priority: m?.priority || 0, updatedAt: m?.updatedAt || null,
      };
    });
    const lessonRows = lessons.map((l) => {
      const m = markOf.get(`lesson:${l.id}`);
      return {
        id: l.id, kind: 'lesson' as const, name: l.name, area: '', resortId: l.resortId || '', resort: l.resort?.name || '',
        address: '', phone: l.phone || l.user?.phone || '', hours: '', naver: '', extraKinds: '', owner: true, viewCount: l.viewCount, // 레슨 연락처 우선, 없으면 강사 계정 번호
        status: m?.status || 'none', memo: m?.memo || '', priority: m?.priority || 0, updatedAt: m?.updatedAt || null,
        // 레슨 전용 (관리자만 보는 보드라 강사 연락처·이메일 포함)
        approved: l.approved, providerType: l.providerType || null,
        businessLicense: l.businessLicense || '', instructorCert: l.instructorCert || '', businessVerified: l.businessVerified, certVerified: l.certVerified, // 첨부 서류·배지 (2026-09-23)
        instructor: l.user ? { id: l.user.id, name: l.user.nickname || l.user.name, email: l.user.email } : null,
      };
    });
    res.json({ shops: [...tag(ski, 'skishop'), ...tag(rep, 'repair'), ...tag(ren, 'rental'), ...lessonRows], resorts, template: tpl?.value || null });
  } catch (error) {
    console.error('Outreach list error:', error);
    res.status(500).json({ error: '연락 보드를 불러오지 못했습니다.' });
  }
};

function parsePatch(body: Record<string, unknown>): { data: { status?: OutreachStatus; memo?: string | null; priority?: number }; error?: string } {
  const data: { status?: OutreachStatus; memo?: string | null; priority?: number } = {};
  if (body.status !== undefined) {
    if (!isStatus(body.status)) return { data, error: '상태값이 올바르지 않습니다.' };
    data.status = body.status;
  }
  if (body.memo !== undefined) {
    if (body.memo !== null && typeof body.memo !== 'string') return { data, error: '메모는 문자열이어야 합니다.' };
    const memo = sanitizeText(body.memo, MEMO_MAX);
    data.memo = memo || null;
  }
  if (body.priority !== undefined) {
    const p = Number(body.priority);
    if (!Number.isFinite(p) || p < 0 || p > 1_000_000) return { data, error: '우선순위 숫자가 올바르지 않습니다.' };
    data.priority = Math.round(p);
  }
  return { data };
}

// 상태·메모 갱신(없으면 생성). PUT /admin/outreach/:shopType/:shopId
export const upsertOutreach = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shopType, shopId } = req.params as { shopType: string; shopId: string };
    if (!isKind(shopType)) { res.status(400).json({ error: '업종이 올바르지 않습니다.' }); return; }
    const { data, error } = parsePatch(req.body || {});
    if (error) { res.status(400).json({ error }); return; }
    const ig = req.body?.instagram !== undefined ? normalizeInstagram(req.body.instagram) : undefined;
    if (req.body?.instagram !== undefined && ig === undefined) { res.status(400).json({ error: '인스타그램 아이디 형식이 올바르지 않습니다. (영문·숫자·점·밑줄 30자 이내)' }); return; }
    if (!Object.keys(data).length && ig === undefined) { res.status(400).json({ error: '바꿀 내용이 없습니다.' }); return; }
    if (!(await shopExists(shopType, shopId))) { res.status(404).json({ error: '매장을 찾을 수 없습니다.' }); return; }
    if (ig !== undefined) await saveInstagram(shopType, shopId, ig);
    if (!Object.keys(data).length) { res.json({ shopType, shopId, instagram: ig }); return; }
    const row = await prisma.shopOutreach.upsert({
      where: { shopType_shopId: { shopType, shopId } },
      create: { shopType, shopId, ...data },
      update: data,
    });
    res.json(row);
  } catch (error) {
    console.error('Outreach upsert error:', error);
    res.status(500).json({ error: '저장하지 못했습니다.' });
  }
};

// 일괄 갱신(우선순위 시딩·인스타 핸들 등). POST /admin/outreach/bulk { items: [{ shopType, shopId, status?, memo?, priority?, instagram? }] } 최대 500
export const bulkOutreach = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items || !items.length || items.length > 500) { res.status(400).json({ error: 'items 는 1~500개여야 합니다.' }); return; }
    let updated = 0; const skipped: string[] = [];
    for (const it of items) {
      const shopType = it?.shopType; const shopId = typeof it?.shopId === 'string' ? it.shopId : '';
      if (!isKind(shopType) || !shopId) { skipped.push(`${shopType}:${shopId}`); continue; }
      const { data, error } = parsePatch(it);
      const ig = it?.instagram !== undefined ? normalizeInstagram(it.instagram) : undefined;
      if (error || (it?.instagram !== undefined && ig === undefined) || (!Object.keys(data).length && ig === undefined) || !(await shopExists(shopType, shopId))) { skipped.push(`${shopType}:${shopId}`); continue; }
      if (ig !== undefined) await saveInstagram(shopType, shopId, ig);
      if (Object.keys(data).length) await prisma.shopOutreach.upsert({ where: { shopType_shopId: { shopType, shopId } }, create: { shopType, shopId, ...data }, update: data });
      updated++;
    }
    res.json({ updated, skipped });
  } catch (error) {
    console.error('Outreach bulk error:', error);
    res.status(500).json({ error: '일괄 저장하지 못했습니다.' });
  }
};

// 문자 템플릿 저장. PUT /admin/outreach/template { sms }
export const putOutreachTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sms = typeof req.body?.sms === 'string' ? req.body.sms.replace(/<[^>]*>/g, '').trim() : '';
    if (!sms) { res.status(400).json({ error: '템플릿 내용을 입력하세요.' }); return; }
    if (sms.length > TEMPLATE_MAX) { res.status(400).json({ error: `템플릿은 ${TEMPLATE_MAX}자 이내여야 합니다.` }); return; }
    const row = await prisma.adminSetting.upsert({ where: { key: TEMPLATE_KEY }, create: { key: TEMPLATE_KEY, value: sms }, update: { value: sms } });
    res.json({ sms: row.value });
  } catch (error) {
    console.error('Outreach template error:', error);
    res.status(500).json({ error: '템플릿을 저장하지 못했습니다.' });
  }
};
