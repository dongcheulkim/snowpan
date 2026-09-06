// 매장 3업종(스키·보드샵=판매, 정비샵, 렌탈샵) 공통 — 겸업 태그와 카테고리 목록 합치기.
// 사용자 결정(2026-09-06): 카테고리는 3개 그대로 두고, 매장에 겸업 칩을 달아 여러 카테고리 목록에 같이 보이게 한다.
import prisma from '../config/database';
import { maskRowUserAll } from './displayName';
import { stripPrivateAll } from './publicFields';
import { isAllowedImageUrl, isHttpUrl } from './validate';

export type ShopKind = 'skishop' | 'repair' | 'rental';
export const SHOP_KINDS: ShopKind[] = ['skishop', 'repair', 'rental'];

// 입력(배열 또는 콤마 문자열) → 저장값. 모르는 값·본인 업종은 버린다. 없으면 null.
export function parseExtraKinds(v: unknown, own: ShopKind): string | null {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  const kinds = [...new Set(arr.map((x) => String(x).trim()).filter((x): x is ShopKind => (SHOP_KINDS as string[]).includes(x) && x !== own))];
  return kinds.length ? kinds.join(',') : null;
}

// 겸업을 '추가'하는 요청인지 (현재 없던 업종이 새로 들어오면 true) — 추가엔 증빙 필요, 빼는 건 자유
export function addsKinds(current: string | null | undefined, next: string | null): boolean {
  const cur = new Set(String(current || '').split(',').filter(Boolean));
  return String(next || '').split(',').filter(Boolean).some((k) => !cur.has(k));
}

// 증빙: 스노우판에 업로드한 사진(/uploads/…) 또는 http(s) 영상·게시물 링크
export function validProof(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const s = v.trim().slice(0, 300);
  if (isAllowedImageUrl(s) || isHttpUrl(s)) return s;
  return null;
}

export interface ShopListFilter { vertical: string; area?: string; resortId?: string }

const USER_SEL = { select: { id: true, name: true, nickname: true } } as const;
const RESORT_SEL = { select: { id: true, name: true, location: true } } as const;
// 공개 필드만 — businessLicense 등 비공개 유지
const SKI_SELECT = {
  id: true, name: true, area: true, resortId: true, resort: RESORT_SEL, address: true, description: true,
  brands: true, phone: true, instagram: true, website: true, naverMap: true, hours: true,
  image: true, images: true, isPremium: true, viewCount: true, createdAt: true, claimable: true, lat: true, lng: true, extraKinds: true,
  user: USER_SEL,
} as const;
const REPAIR_SELECT = {
  id: true, name: true, area: true, resortId: true, resort: RESORT_SEL, address: true, description: true, services: true,
  phone: true, instagram: true, website: true, naverMap: true, hours: true,
  image: true, images: true, isPremium: true, viewCount: true, createdAt: true, claimable: true, lat: true, lng: true, extraKinds: true,
  user: USER_SEL,
} as const;

function baseWhere(f: ShopListFilter): Record<string, unknown> {
  const w: Record<string, unknown> = { approved: true, vertical: f.vertical };
  if (f.area) w.area = f.area;
  if (f.resortId === 'none') w.resortId = null; // 리조트 없는 시내 매장('외')
  else if (f.resortId) {
    const ids = f.resortId.split(',').filter(Boolean); // 콤마 목록도 허용 (레슨·숙소 페이지 패턴과 호환)
    w.resortId = ids.length > 1 ? { in: ids } : ids[0];
  }
  return w;
}

// kind 카테고리 목록 = 그 업종 매장 + 다른 업종이지만 extraKinds 에 kind 를 겸업으로 단 매장.
// 각 행에 kind(원 업종, 상세 링크용)·kinds(칩 표시용)를 붙여 돌려준다.
// 정렬: 프리미엄 → 본 업종 먼저 → 최신순.
export async function listShopsForKind(kind: ShopKind, f: ShopListFilter): Promise<Record<string, unknown>[]> {
  const w = baseWhere(f);
  const extra = (k: ShopKind) => (k === kind ? {} : { extraKinds: { contains: kind } });
  const [ski, rep, ren] = await Promise.all([
    prisma.skiShop.findMany({ where: { ...w, ...extra('skishop') } as never, select: SKI_SELECT }),
    prisma.repairShop.findMany({ where: { ...w, ...extra('repair') } as never, select: REPAIR_SELECT }),
    prisma.rental.findMany({ where: { ...w, ...extra('rental') } as never, include: { resort: true, user: USER_SEL } }),
  ]);
  type Tagged = Record<string, unknown> & { kind: ShopKind; kinds: string[] };
  const tag = (rows: Record<string, unknown>[], k: ShopKind): Tagged[] => rows.map((r) => ({
    ...r, kind: k, kinds: [k, ...String(r.extraKinds || '').split(',').filter(Boolean)],
  }));
  const all: Tagged[] = [
    ...tag(ski as unknown as Record<string, unknown>[], 'skishop'),
    ...tag(rep as unknown as Record<string, unknown>[], 'repair'),
    ...tag(stripPrivateAll(ren as unknown as Record<string, unknown>[]), 'rental'),
  ];
  all.sort((a, b) =>
    (Number(Boolean(b.isPremium)) - Number(Boolean(a.isPremium)))
    || ((a.kind === kind ? 0 : 1) - (b.kind === kind ? 0 : 1))
    || (new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()));
  return maskRowUserAll(all as { user?: unknown }[]) as Record<string, unknown>[];
}
