// "지금 영업 중" 판정 — 매장 3업종(렌탈·스키보드샵·정비샵) 공통 (2026-09-17).
// 구조화 영업시간(openTime/closeTime/closedDays)이 있으면 그걸로, 없으면 자유 텍스트 hours 에서 최선 추정.
// 기준 시각은 한국시간(KST, UTC+9 고정 — 서머타임 없음). 예:
//   { openTime:'09:00', closeTime:'20:00', closedDays:'mon' } → 월요일 'closed' / 화 10:00 'open' / 화 21:00 'closed'
//   { openTime:'22:00', closeTime:'02:00' }                  → 자정 넘김: 23:00 'open', 01:00 'open', 12:00 'closed'
//   { closeTime:'24:00' }                                     → 그날 끝까지
//   { hours:'09:00~20:00' } / '09:00 - 20:00' / '9시~20시' / '오전 9시 ~ 오후 8시' → 자유 텍스트에서 범위 파싱
//   { hours:'09:00~20:00 (월 휴무)' }                          → 범위 + 월요일 휴무
//   { hours:'매일 00:00~24:00' } / '24시간' / '연중무휴'       → 종일 영업 'open'
//   { hours:'시즌 중 문의' } / '현재상태만 확인'                → 'unknown' (배지 숨김)

export type OpenStatus = 'open' | 'closed' | 'unknown';
export interface ShopHoursLike {
  openTime?: string | null;
  closeTime?: string | null;
  closedDays?: string | null;
  hours?: string | null;
}

const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const BY_UTC_DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']; // Date#getUTCDay 순서
const DAY_KO: Record<string, string> = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
const KO_TO_CODE: Record<string, string> = { 월: 'mon', 화: 'tue', 수: 'wed', 목: 'thu', 금: 'fri', 토: 'sat', 일: 'sun' };
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MIN = 24 * 60;

function kstNow(now: Date): { day: string; minutes: number } {
  const k = new Date(now.getTime() + KST_OFFSET_MS);
  return { day: BY_UTC_DAY[k.getUTCDay()], minutes: k.getUTCHours() * 60 + k.getUTCMinutes() };
}

function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 24 || mi > 59 || (h === 24 && mi > 0)) return null;
  return h * 60 + mi;
}

function inRange(minutes: number, open: number, close: number): boolean {
  if (open === close) return true; // '00:00~00:00' 같은 표기 = 종일
  if (close > open) return minutes >= open && minutes < close;
  return minutes >= open || minutes < close; // 자정 넘김 (예: 22:00~02:00)
}

function parseClosedDays(s: string | null | undefined): string[] {
  return (s || '').split(',').map((x) => x.trim().toLowerCase()).filter((x) => WEEK_ORDER.includes(x));
}

// '오전 9시', '9:30', '오후 8시 30분' → 분. 못 읽으면 null.
function partToMinutes(ampm: string | undefined, h: string, mm: string | undefined, koMin: string | undefined): number | null {
  let hour = Number(h);
  const min = Number(mm ?? koMin ?? '0');
  if (!Number.isFinite(hour) || !Number.isFinite(min) || min > 59) return null;
  const tag = (ampm || '').toLowerCase();
  if ((tag === '오후' || tag === 'pm') && hour < 12) hour += 12;
  if ((tag === '오전' || tag === 'am') && hour === 12) hour = 0;
  if (hour > 24 || (hour === 24 && min > 0)) return null;
  return hour * 60 + min;
}

// 시각 하나: (오전|오후|am|pm)? 숫자 (:분 | 시 (분)?)  — 콜론이나 '시' 가 꼭 있어야 전화번호·날짜(010-1234, 12-01)를 시간으로 오해하지 않는다
const TIME_PART = '(오전|오후|am|pm)?\\s*(\\d{1,2})(?::(\\d{2})|\\s*시(?:\\s*(\\d{1,2})\\s*분)?)';
const RANGE_RE = new RegExp(`${TIME_PART}\\s*(?:~|∼|～|-|–|—|to|부터|에서)\\s*${TIME_PART}`, 'i');
const ALL_DAY_RE = /24\s*시간|24\s*h\b|연중\s*무휴/i;
const CLOSED_DAY_RE = /([월화수목금토일][월화수목금토일,·/ ]*)(?:요일)?\s*(?:정기\s*)?휴무/;

interface FreeText { open: number; close: number; closed: string[] }

// 자유 텍스트 hours 에서 범위 하나 + 요일 휴무를 뽑는다. 못 읽으면 null.
function parseFreeText(text: string): FreeText | null {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || t.includes('현재상태만')) return null;

  const closed: string[] = [];
  // '공휴일 휴무' 의 '일' 을 일요일로, '둘째·넷째 월요일 휴무' 를 매주 월요일로 읽지 않게 — 그런 표기는 요일 파싱을 건너뛴다
  if (!/첫째|둘째|셋째|넷째|격주|공휴일/.test(t)) {
    const cm = CLOSED_DAY_RE.exec(t);
    if (cm) for (const ch of cm[1]) { const code = KO_TO_CODE[ch]; if (code && !closed.includes(code)) closed.push(code); }
  }

  const rm = RANGE_RE.exec(t);
  if (rm) {
    const open = partToMinutes(rm[1], rm[2], rm[3], rm[4]);
    const close = partToMinutes(rm[5], rm[6], rm[7], rm[8]);
    if (open != null && close != null) return { open, close, closed };
  }
  if (ALL_DAY_RE.test(t)) return { open: 0, close: DAY_MIN, closed };
  return null;
}

export function openStatus(shop: ShopHoursLike, now: Date = new Date()): OpenStatus {
  const { day, minutes } = kstNow(now);
  if (parseClosedDays(shop.closedDays).includes(day)) return 'closed';
  const open = toMinutes(shop.openTime);
  const close = toMinutes(shop.closeTime);
  if (open != null && close != null) return inRange(minutes, open, close) ? 'open' : 'closed';
  const parsed = shop.hours ? parseFreeText(shop.hours) : null;
  if (!parsed) return 'unknown';
  if (parsed.closed.includes(day)) return 'closed';
  return inRange(minutes, parsed.open, parsed.close) ? 'open' : 'closed';
}

// 구조화 영업시간 표시용 — "09:00–20:00 · 월 휴무". 시간·휴무일 둘 다 없으면 null (자유 텍스트 hours 를 대신 보여줄 것).
export function hoursLabel(shop: ShopHoursLike): string | null {
  const days = parseClosedDays(shop.closedDays);
  const dayText = days.length ? `${WEEK_ORDER.filter((d) => days.includes(d)).map((d) => DAY_KO[d]).join('·')} 휴무` : '';
  const time = shop.openTime && shop.closeTime ? `${shop.openTime}–${shop.closeTime}` : '';
  if (!time && !dayText) return null;
  return [time, dayText].filter(Boolean).join(' · ');
}
