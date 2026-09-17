// 매장 3업종(스키·보드샵, 정비샵, 렌탈샵) 공통 — 구조화 영업시간 검증·정규화 + 렌탈 가격표 검증 (2026-09-17).
// 프론트 "지금 영업 중" 배지(frontend/src/utils/openNow.ts)와 렌탈 목록 "가격 낮은 순" 정렬(priceFrom)이 이 값을 쓴다.
//   openTime/closeTime: 'HH:mm' (00:00~24:00, 24:00 = 자정까지). ''/null 이면 지움.
//   closedDays: 배열 또는 콤마 문자열(mon,tue,wed,thu,fri,sat,sun). 모르는 코드가 있으면 400. 저장은 월→일 순 콤마, 비면 null.
//   가격: 0 이상 1천만원 이하 정수(숫자 또는 숫자 문자열). ''/null 이면 지움. 그 외 400.
import { sanitizeText } from './sanitize';

export const DAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayCode = (typeof DAY_CODES)[number];

export const HOURS_ERROR = '영업시간은 HH:mm 형식(00:00~24:00)으로 입력해 주세요';
export const CLOSED_DAYS_ERROR = '휴무일은 mon,tue,wed,thu,fri,sat,sun 중에서 골라 주세요';
export const PRICE_ERROR = '가격은 0원 이상 1천만원 이하 숫자여야 해요';

const TIME_RE = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
const MAX_SHOP_PRICE = 10_000_000;

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

// 공통 규약: undefined = 요청에 없음(건드리지 않음), null = 지움, false = 형식 오류
type Field<T> = T | null | undefined | false;

function parseTime(v: unknown): Field<string> {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return null;
  return TIME_RE.test(s) ? s : false;
}

function parseClosedDays(v: unknown): Field<string> {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : null;
  if (!arr) return false;
  const codes = arr.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  if (codes.some((c) => !(DAY_CODES as readonly string[]).includes(c))) return false;
  const picked = new Set(codes);
  const ordered = DAY_CODES.filter((d) => picked.has(d));
  return ordered.length ? ordered.join(',') : null;
}

export interface ShopHoursInput { openTime?: string | null; closeTime?: string | null; closedDays?: string | null }

// body 에서 영업시간 필드만 검증. 요청에 없는 키는 결과에도 없음(부분 수정 안전). 오류면 400 용 메시지.
export function parseShopHours(body: Record<string, unknown>): Parsed<ShopHoursInput> {
  const out: ShopHoursInput = {};
  const open = parseTime(body.openTime);
  if (open === false) return { ok: false, error: HOURS_ERROR };
  if (open !== undefined) out.openTime = open;
  const close = parseTime(body.closeTime);
  if (close === false) return { ok: false, error: HOURS_ERROR };
  if (close !== undefined) out.closeTime = close;
  const days = parseClosedDays(body.closedDays);
  if (days === false) return { ok: false, error: CLOSED_DAYS_ERROR };
  if (days !== undefined) out.closedDays = days;
  return { ok: true, data: out };
}

export const RENTAL_PRICE_KEYS = ['priceSkiSet', 'priceBoardSet', 'priceClothes', 'priceHelmet', 'priceGoggles'] as const;
export type RentalPriceKey = (typeof RENTAL_PRICE_KEYS)[number];
export type RentalPricesInput = Partial<Record<RentalPriceKey, number | null>> & { priceNote?: string | null };

function parsePriceField(v: unknown): Field<number> {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'number' && typeof v !== 'string') return false;
  if (typeof v === 'string' && !v.trim()) return null;
  const n = typeof v === 'number' ? v : Number(v.trim().replace(/,/g, ''));
  if (!Number.isInteger(n) || n < 0 || n > MAX_SHOP_PRICE) return false;
  return n;
}

// body 에서 렌탈 가격표 필드만 검증. priceNote 는 200자.
export function parseRentalPrices(body: Record<string, unknown>): Parsed<RentalPricesInput> {
  const out: RentalPricesInput = {};
  for (const k of RENTAL_PRICE_KEYS) {
    const v = parsePriceField(body[k]);
    if (v === false) return { ok: false, error: PRICE_ERROR };
    if (v !== undefined) out[k] = v;
  }
  if (body.priceNote !== undefined) out.priceNote = body.priceNote === null ? null : (sanitizeText(body.priceNote, 200) || null);
  return { ok: true, data: out };
}

// 요청에 세트 가격 키가 하나라도 있으면 priceFrom 을 다시 계산해야 한다 (부분 수정에서 기존값과 합쳐 계산)
export function touchesPriceFrom(p: RentalPricesInput): boolean {
  return 'priceSkiSet' in p || 'priceBoardSet' in p;
}

// priceFrom = 스키 세트/보드 세트 중 입력된 값의 최저. 둘 다 없으면 null. (의류·헬멧·고글은 세트가 아니라 제외)
export function computePriceFrom(p: { priceSkiSet?: number | null; priceBoardSet?: number | null }): number | null {
  const vals = [p.priceSkiSet, p.priceBoardSet].filter((v): v is number => typeof v === 'number');
  return vals.length ? Math.min(...vals) : null;
}
