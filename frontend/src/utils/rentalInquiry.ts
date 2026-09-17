// 렌탈 "예약 문의" 폼 값 → 채팅 첫 메시지(평문). components/RentalInquiryForm 이 만들고 RentalDetail 이 Chat 으로 넘긴다.
export interface RentalInquiryInput {
  start: string; // YYYY-MM-DD
  end: string;
  adults: number;
  children: number;
  ski: number;
  board: number;
  options: string[];
  note: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 예:
// [렌탈 예약 문의]
// 날짜: 2026-12-20 ~ 2026-12-21 (1박)
// 인원: 성인 2, 아동 1
// 장비: 스키 세트 2, 보드 세트 1
// 옵션: 의류, 헬멧
// 요청: 키 175 발 270이에요
export function buildRentalInquiry(f: RentalInquiryInput): string {
  const nights = Math.max(0, Math.round((Date.parse(f.end) - Date.parse(f.start)) / DAY_MS));
  const lines = [
    '[렌탈 예약 문의]',
    `날짜: ${f.start} ~ ${f.end} (${nights > 0 ? `${nights}박` : '당일'})`,
    `인원: 성인 ${f.adults}, 아동 ${f.children}`,
  ];
  const gear = [f.ski > 0 ? `스키 세트 ${f.ski}` : '', f.board > 0 ? `보드 세트 ${f.board}` : ''].filter(Boolean);
  if (gear.length) lines.push(`장비: ${gear.join(', ')}`);
  if (f.options.length) lines.push(`옵션: ${f.options.join(', ')}`);
  const note = f.note.trim();
  if (note) lines.push(`요청: ${note}`);
  return lines.join('\n');
}
