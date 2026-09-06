// 관리자: 매장 연락 보드 — 스키·보드샵/정비샵/렌탈샵 본 행(겸업 제외)에 사장님 연락 상태·메모를 붙여 돌려주고, 상태를 갱신한다.
// 사장님 확인 전(claimable) 매장에 전화·문자로 "직접 관리하기"를 안내하는 작업용. 상태값은 프론트 OutreachBoard 와 짝.
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sanitizeText } from '../utils/sanitize';
import { SHOP_KINDS, type ShopKind } from '../utils/shopKinds';

export const OUTREACH_STATUS = ['none', 'absent', 'called', 'yes', 'no', 'del'] as const;
type OutreachStatus = (typeof OUTREACH_STATUS)[number];
const TEMPLATE_KEY = 'outreach.sms';
const MEMO_MAX = 500;
const TEMPLATE_MAX = 1000;

const isKind = (v: unknown): v is ShopKind => typeof v === 'string' && (SHOP_KINDS as readonly string[]).includes(v);
const isStatus = (v: unknown): v is OutreachStatus => typeof v === 'string' && (OUTREACH_STATUS as readonly string[]).includes(v);

async function shopExists(kind: ShopKind, id: string): Promise<boolean> {
  const where = { where: { id }, select: { id: true } } as const;
  const row = kind === 'skishop' ? await prisma.skiShop.findUnique(where)
    : kind === 'repair' ? await prisma.repairShop.findUnique(where)
    : await prisma.rental.findUnique(where);
  return !!row;
}

// 보드 목록: 공개(approved) 매장 전부 + 연락 상태 + 리조트 목록 + 문자 템플릿. 사장님이 직접 등록한 매장(claimable=false)은 owner 로 표시만.
export const listOutreach = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sel = {
      id: true, name: true, area: true, resortId: true, address: true, phone: true, hours: true, naverMap: true,
      extraKinds: true, claimable: true, viewCount: true, resort: { select: { name: true } },
    } as const;
    const [ski, rep, ren, marks, resorts, tpl] = await Promise.all([
      prisma.skiShop.findMany({ where: { approved: true }, select: sel }),
      prisma.repairShop.findMany({ where: { approved: true }, select: sel }),
      prisma.rental.findMany({ where: { approved: true }, select: sel }),
      prisma.shopOutreach.findMany(),
      prisma.skiResort.findMany({ select: { id: true, name: true, location: true }, orderBy: { name: 'asc' } }),
      prisma.adminSetting.findUnique({ where: { key: TEMPLATE_KEY } }),
    ]);
    const markOf = new Map(marks.map((m) => [`${m.shopType}:${m.shopId}`, m]));
    type Row = {
      id: string; name: string; area: string | null; resortId: string | null; address: string | null; phone: string | null; hours: string | null;
      naverMap: string | null; extraKinds: string | null; claimable: boolean; viewCount: number; resort: { name: string } | null;
    };
    const tag = (rows: Row[], kind: ShopKind) => rows.map((r) => {
      const m = markOf.get(`${kind}:${r.id}`);
      return {
        id: r.id, kind, name: r.name, area: r.area || '', resortId: r.resortId || '', resort: r.resort?.name || '',
        address: r.address || '', phone: r.phone || '', hours: r.hours || '', naver: r.naverMap || '',
        extraKinds: r.extraKinds || '', owner: !r.claimable, viewCount: r.viewCount,
        status: m?.status || 'none', memo: m?.memo || '', priority: m?.priority || 0, updatedAt: m?.updatedAt || null,
      };
    });
    res.json({ shops: [...tag(ski, 'skishop'), ...tag(rep, 'repair'), ...tag(ren, 'rental')], resorts, template: tpl?.value || null });
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
    if (!Object.keys(data).length) { res.status(400).json({ error: '바꿀 내용이 없습니다.' }); return; }
    if (!(await shopExists(shopType, shopId))) { res.status(404).json({ error: '매장을 찾을 수 없습니다.' }); return; }
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

// 일괄 갱신(우선순위 시딩 등). POST /admin/outreach/bulk { items: [{ shopType, shopId, status?, memo?, priority? }] } 최대 500
export const bulkOutreach = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items || !items.length || items.length > 500) { res.status(400).json({ error: 'items 는 1~500개여야 합니다.' }); return; }
    let updated = 0; const skipped: string[] = [];
    for (const it of items) {
      const shopType = it?.shopType; const shopId = typeof it?.shopId === 'string' ? it.shopId : '';
      if (!isKind(shopType) || !shopId) { skipped.push(`${shopType}:${shopId}`); continue; }
      const { data, error } = parsePatch(it);
      if (error || !Object.keys(data).length || !(await shopExists(shopType, shopId))) { skipped.push(`${shopType}:${shopId}`); continue; }
      await prisma.shopOutreach.upsert({ where: { shopType_shopId: { shopType, shopId } }, create: { shopType, shopId, ...data }, update: data });
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
