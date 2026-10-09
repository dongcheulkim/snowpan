// 옛 앱(2.4 이하) 호환 — '거래 약속' 카드(type trade_meeting, content JSON)를 모르는 클라이언트에는 읽을 수 있는 문장으로 바꿔 보낸다 (2026-10-09).
// 새 클라이언트(웹·2.5+ 앱)는 요청에 X-Snowpan-Client 헤더(소켓은 auth.client)를 붙이고, 없으면 옛 앱으로 본다.
import type { Request } from 'express';

export function isLegacyClient(req: Request): boolean {
  return !req.headers['x-snowpan-client'];
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
function fmtDate(ymd: string | undefined): string {
  if (!ymd) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${Number(m[2])}월 ${Number(m[3])}일(${DOW[d.getUTCDay()]})`;
}

const UPDATE_HINT = '앱을 최신 버전으로 업데이트하면 채팅에서 바로 수락·확정할 수 있어요.';

export function legacyTradeMeetingText(content: string): string {
  let c: { event?: string; productName?: string; date?: string; time?: string; place?: string; note?: string; reason?: string } = {};
  try { c = JSON.parse(content); } catch { return content; }
  const when = [fmtDate(c.date), c.time].filter(Boolean).join(' ');
  const where = c.place ? ` · ${c.place}` : '';
  const item = c.productName ? ` (${c.productName})` : '';
  switch (c.event) {
    case 'proposed': return `[거래 약속 제안] ${when}${where}${item}${c.note ? `\n${c.note}` : ''}\n${UPDATE_HINT}`;
    case 'confirmed': return `[거래 약속 확정] ${when}${where}${item}`;
    case 'declined': return `[약속 거절] 다른 시간을 제안해 주세요.${c.reason ? ` ${c.reason}` : ''}`;
    case 'cancelled': return `[약속 취소] ${when}${where}${c.reason ? `\n${c.reason}` : ''}`;
    case 'done': return `[거래 확정] 거래가 완료됐어요${item}. 후기를 남겨 주세요.`;
    default: return `[거래 약속] ${when}${where}`;
  }
}

// 옛 클라이언트용 메시지 변환 — 카드는 text 로
export function legacyMessage<T extends { type: string; content: string }>(m: T, legacy = true): T {
  return legacy && m.type === 'trade_meeting' ? { ...m, type: 'text', content: legacyTradeMeetingText(m.content) } : m;
}
