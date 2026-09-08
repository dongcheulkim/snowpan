// 한국 시간(KST, UTC+9) 달력 계산 — 서버는 UTC 로 돌지만 광고 시작·종료일은 한국 날짜가 기준이다.
// 배경(2026-09-09): 관리자가 밤 2시(KST)에 "오늘" 시작으로 승인했는데 서버가 '2026-09-09' 를 UTC 자정(=KST 오전 9시)으로 읽어
// 7시간 뒤에야 노출되는 걸로 잡혔다. 날짜만 온 값은 KST 자정으로, 날짜가 없으면 "지금 바로"로 다룬다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 그 시각이 속한 KST 달력일의 연·월·일
function kstParts(d: Date): { y: number; m: number; day: number } {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth(), day: k.getUTCDate() };
}

// KST 달력일 (y, m, day) 의 00:00 KST 를 나타내는 Date
function kstMidnight(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m, day) - KST_OFFSET_MS);
}

// 그 시각이 속한 KST 날짜의 00:00
export function kstDayStart(d: Date = new Date()): Date {
  const { y, m, day } = kstParts(d);
  return kstMidnight(y, m, day);
}

// 그 시각이 속한 KST 날짜의 23:59:59.999
export function kstDayEnd(d: Date = new Date()): Date {
  return new Date(kstDayStart(d).getTime() + DAY_MS - 1);
}

// n 일 뒤 같은 시각 (DST 없는 KST 라 단순 덧셈)
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

// KST 달력 기준 n 개월 뒤의 같은 날짜 00:00 (말일 넘침은 JS Date 규칙대로)
export function addMonthsKst(d: Date, n: number): Date {
  const { y, m, day } = kstParts(d);
  return kstMidnight(y, m + n, day);
}

// 입력값 → 시작 시각. 'YYYY-MM-DD' 는 그 날 00:00 KST, 시각이 있는 ISO 문자열·Date 는 그 시각 그대로. 못 읽으면 null.
export function parseKstDate(input: unknown): Date | null {
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input !== 'string') return null;
  const s = input.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = kstMidnight(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// 'YYYY.M.D' (KST)
export function fmtKstDate(d: Date): string {
  const { y, m, day } = kstParts(d);
  return `${y}.${m + 1}.${day}`;
}
