// 중고 거래 약속 (2026-10-09) — 타입·라벨·표시 헬퍼. Chat(약속 카드)·TradeMeetingForm·MyChatList(미리보기)·MyMeetings 가 같이 쓴다.
export type MeetingStatus = 'proposed' | 'confirmed' | 'done' | 'cancelled' | 'declined';
export type MeetingRole = 'seller' | 'buyer';

export interface TradeMeeting {
  id: string;
  productId: string;
  roomId: string;
  sellerId: string;
  buyerId: string;
  proposerId: string;
  date: string;          // 'YYYY-MM-DD' (KST)
  time?: string | null;  // 'HH:mm'
  place: string;
  note?: string | null;
  status: MeetingStatus;
  reason?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  // 서버가 덧붙이는 것
  productName?: string;
  productImage?: string | null;
  productStatus?: string | null;
  viewerRole?: MeetingRole;
  other?: { id: string; name: string; profileImage?: string | null } | null;
}

// 채팅 메시지 type='trade_meeting' 의 content(JSON) — 이벤트마다 카드 한 장
export interface MeetingCard {
  meetingId: string;
  event: MeetingStatus;
  productId: string;
  productName: string;
  date: string;
  time?: string | null;
  place: string;
  note?: string | null;
  reason?: string | null;
  by?: MeetingRole | null;
}

const STATUSES: MeetingStatus[] = ['proposed', 'confirmed', 'done', 'cancelled', 'declined'];

export function parseMeetingCard(content: string): MeetingCard | null {
  try {
    const v = JSON.parse(content) as Partial<MeetingCard>;
    if (!v || typeof v.meetingId !== 'string' || !STATUSES.includes(v.event as MeetingStatus) || typeof v.date !== 'string' || typeof v.place !== 'string') return null;
    return v as MeetingCard;
  } catch { return null; }
}

export const MEETING_EVENT_TITLE: Record<MeetingStatus, string> = {
  proposed: '거래 약속 제안',
  confirmed: '거래 약속 확정',
  done: '거래 완료',
  cancelled: '약속 취소',
  declined: '제안 거절',
};
export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = { proposed: '제안 중', confirmed: '확정', done: '거래 완료', cancelled: '취소', declined: '거절' };
export const MEETING_STATUS_CHIP: Record<MeetingStatus, string> = {
  proposed: 'bg-sky-50 text-sky-700 border-sky-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  done: 'bg-gray-900 text-white border-gray-900',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  declined: 'bg-gray-100 text-gray-500 border-gray-200',
};

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
// '2026-10-12' → '10/12(토)'
export function formatMeetingDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${Number(m[2])}/${Number(m[3])}(${DOW[d.getUTCDay()]})`;
}
// '10/12(토) 14:00 · 곤지암리조트 정문'
export function meetingWhen(c: { date: string; time?: string | null; place: string }): string {
  return `${formatMeetingDate(c.date)}${c.time ? ' ' + c.time : ''} · ${c.place}`;
}

export const isMeetingOpen = (s: MeetingStatus): boolean => s === 'proposed' || s === 'confirmed';
