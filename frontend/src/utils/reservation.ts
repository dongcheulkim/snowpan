// 방문 예약 (결제 없음) — 타입·라벨·표시 헬퍼.
// ReservationForm(요청 폼)·Chat(예약 카드)·MyChatList(미리보기)·MyReservations(손님)·ShopReservations(사장님)가 같이 쓴다.
export type ShopType = 'rental' | 'skishop' | 'lesson' | 'accommodation';
export type ReservationStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled';
export type ReservationEvent = ReservationStatus;

export interface ReservationDetails {
  ski?: number;        // rental — 스키 세트 수
  board?: number;      // rental — 보드 세트 수
  options?: string[];  // rental — 의류/헬멧/고글
  purpose?: string;    // skishop — 구매 상담/부츠 피팅/장비 수령/기타
  level?: string;      // lesson — 처음/초급/중급/상급
  lessonType?: string; // lesson — 개인/그룹
  rooms?: number;      // accommodation — 객실 수
}

export interface Reservation {
  id: string;
  shopType: ShopType;
  shopId: string;
  shopName: string;
  date: string;              // ISO 또는 'YYYY-MM-DD'
  endDate?: string | null;
  time?: string | null;      // 'HH:mm'
  adults: number;
  children: number;
  details: ReservationDetails | null;
  note?: string | null;
  status: ReservationStatus;
  ownerMessage?: string | null; // 확정 메시지 또는 거절 사유
  roomId?: string | null;
  createdAt: string;
  respondedAt?: string | null;
}

export interface ReservationParty { id: string; name: string; profileImage?: string | null }

// 채팅 메시지 type='reservation' 의 content(JSON) — 이벤트마다 카드 한 장씩 새로 온다
export interface ReservationCard {
  reservationId: string;
  event: ReservationEvent;
  shopType: ShopType;
  shopName: string;
  date: string;
  endDate?: string;
  time?: string;
  adults: number;
  children: number;
  details?: ReservationDetails | null;
  note?: string;
  message?: string; // 확정 메시지 / 거절 사유
}

export const SHOP_TYPES: ShopType[] = ['rental', 'skishop', 'lesson', 'accommodation'];
const STATUSES: ReservationStatus[] = ['requested', 'confirmed', 'declined', 'cancelled'];

export const SHOP_TYPE_LABEL: Record<ShopType, string> = { rental: '렌탈샵', skishop: '스키·보드샵', lesson: '레슨', accommodation: '숙소' };
// 버튼·시트 제목 — 렌탈/스키샵은 방문, 레슨·숙소는 성격에 맞게
export const RESERVE_TITLE: Record<ShopType, string> = { rental: '방문 예약', skishop: '방문 예약', lesson: '레슨 예약', accommodation: '숙박 예약' };
export const STATUS_LABEL: Record<ReservationStatus, string> = { requested: '요청됨', confirmed: '확정', declined: '거절', cancelled: '취소' };
export const STATUS_CHIP: Record<ReservationStatus, string> = {
  requested: 'bg-sky-50 text-sky-700 border-sky-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};
export const EVENT_TITLE: Record<ReservationEvent, string> = { requested: '방문 예약 요청', confirmed: '예약 확정', declined: '예약 거절', cancelled: '예약 취소' };
export const EVENT_SHORT: Record<ReservationEvent, string> = { requested: '요청', confirmed: '확정', declined: '거절', cancelled: '취소' };

export function shopPath(shopType: ShopType, shopId: string): string {
  return `/${shopType}/${shopId}`;
}

// 'YYYY-MM-DD' 는 문자열 그대로(시간대 무관), ISO 는 로컬 날짜로
function ymd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

export function formatMD(s: string): string {
  const p = ymd(s);
  return p ? `${p.m}/${p.d}` : s;
}

// "12/20" 또는 "12/20 ~ 12/22"
export function formatDateRange(date: string, endDate?: string | null): string {
  const a = formatMD(date);
  if (!endDate) return a;
  const b = formatMD(endDate);
  return b === a ? a : `${a} ~ ${b}`;
}

// 숙박 일수 — 체크인·체크아웃 사이 밤 수 (계산 불가면 0)
export function nightsBetween(date: string, endDate?: string | null): number {
  const a = ymd(date); const b = endDate ? ymd(endDate) : null;
  if (!a || !b) return 0;
  return Math.max(0, Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000));
}

export function peopleLabel(adults: number, children: number): string {
  return children > 0 ? `성인 ${adults} · 아동 ${children}` : `성인 ${adults}`;
}

// 업종별 details → [라벨, 값] 쌍 (한국어)
export function detailPairs(shopType: ShopType, details?: ReservationDetails | null): [string, string][] {
  if (!details || typeof details !== 'object') return [];
  const out: [string, string][] = [];
  if (shopType === 'rental') {
    const gear = [details.ski ? `스키 세트 ${details.ski}` : '', details.board ? `보드 세트 ${details.board}` : ''].filter(Boolean);
    if (gear.length) out.push(['장비', gear.join(', ')]);
    if (Array.isArray(details.options) && details.options.length) out.push(['옵션', details.options.join(', ')]);
  } else if (shopType === 'skishop') {
    if (details.purpose) out.push(['방문 목적', details.purpose]);
  } else if (shopType === 'lesson') {
    const l = [details.level ? `${details.level}` : '', details.lessonType ? `${details.lessonType} 레슨` : ''].filter(Boolean);
    if (l.length) out.push(['레슨', l.join(' · ')]);
  } else if (shopType === 'accommodation') {
    if (details.rooms) out.push(['객실', `${details.rooms}개`]);
  }
  return out;
}

export function detailLines(shopType: ShopType, details?: ReservationDetails | null): string[] {
  return detailPairs(shopType, details).map(([k, v]) => `${k}: ${v}`);
}

// 채팅 카드 content 파싱 — 깨진 JSON·낯선 값이면 null (렌더는 안내 문구로 대체)
export function parseReservationCard(content: string): ReservationCard | null {
  try {
    const p = JSON.parse(content) as Partial<ReservationCard> & Record<string, unknown>;
    if (!p || typeof p !== 'object' || typeof p.reservationId !== 'string' || !p.reservationId) return null;
    const event = STATUSES.includes(p.event as ReservationStatus) ? (p.event as ReservationStatus) : 'requested';
    const shopType = SHOP_TYPES.includes(p.shopType as ShopType) ? (p.shopType as ShopType) : 'rental';
    return {
      reservationId: p.reservationId,
      event,
      shopType,
      shopName: typeof p.shopName === 'string' ? p.shopName : '',
      date: typeof p.date === 'string' ? p.date : '',
      endDate: typeof p.endDate === 'string' && p.endDate ? p.endDate : undefined,
      time: typeof p.time === 'string' && p.time ? p.time : undefined,
      adults: Number(p.adults) || 0,
      children: Number(p.children) || 0,
      details: p.details && typeof p.details === 'object' ? (p.details as ReservationDetails) : null,
      note: typeof p.note === 'string' && p.note ? p.note : undefined,
      message: typeof p.message === 'string' && p.message ? p.message : undefined,
    };
  } catch {
    return null;
  }
}

// 누가 무엇을 할 수 있나 — 손님: 요청됨·확정 상태에서 취소. 사장님: 요청됨이면 확정/거절, 확정이면 취소.
export const canCustomerCancel = (s: ReservationStatus) => s === 'requested' || s === 'confirmed';
export const canOwnerRespond = (s: ReservationStatus) => s === 'requested';
export const canOwnerCancel = (s: ReservationStatus) => s === 'confirmed';
