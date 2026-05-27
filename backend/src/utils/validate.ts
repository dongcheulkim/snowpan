// 입력 정수/가격 검증 헬퍼.
// parseInt 가 음수도 그대로 받기 때문에 별도 체크 필요.

const MAX_PRICE = 100_000_000; // 1억원

export interface ParsedPrice {
  ok: true;
  value: number;
}
export interface ParseError {
  ok: false;
  error: string;
}

export function parsePrice(raw: unknown): ParsedPrice | ParseError {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, error: '가격을 입력해주세요.' };
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    return { ok: false, error: '유효한 가격을 입력해주세요.' };
  }
  if (n <= 0) {
    return { ok: false, error: '가격은 1원 이상이어야 합니다.' };
  }
  if (n > MAX_PRICE) {
    return { ok: false, error: `최대 등록 가격은 ${MAX_PRICE.toLocaleString()}원입니다.` };
  }
  return { ok: true, value: Math.floor(n) };
}

// 이메일 정규화 — trim + toLowerCase. 같은 사용자가 대소문자/공백으로
// 여러 계정 만드는 것 (account splitting) 차단.
// RFC 5321 상 local part 는 case-sensitive 가 맞지만, 실제 메일 서버
// (Gmail 등) 는 다 case-insensitive 라 사용자 혼란 + 사기 행위만 늘어남.
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  // 간단한 형식 체크 — local@host 형태 + 호스트에 . 1개 이상.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  if (trimmed.length > 254) return null;
  return trimmed;
}

// 사용자 입력 이미지 URL 검증 — Cloudinary 또는 우리 도메인만 허용.
// 임의 외부 URL 차단 — 사용자에게 보일 이미지에 추적 픽셀/피싱 URL 박는 것 방지.
// FRONTEND_URL env (Vercel 도메인) + ALLOWED_EXTRA_IMAGE_HOSTS (선택) 자동 포함.
function buildAllowedImageHosts(): string[] {
  const base = ['res.cloudinary.com', 'snowpan.vercel.app', 'snowpan.vercel.app', 'snowpan.onrender.com'];
  const frontUrl = process.env.FRONTEND_URL;
  if (frontUrl) {
    try { base.push(new URL(frontUrl).hostname); } catch { /* ignore */ }
  }
  const extra = process.env.ALLOWED_EXTRA_IMAGE_HOSTS;
  if (extra) base.push(...extra.split(',').map(s => s.trim()).filter(Boolean));
  return [...new Set(base)];
}
const ALLOWED_IMAGE_HOSTS = buildAllowedImageHosts();
export function isAllowedImageUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  // 상대 경로 — /uploads/, /icons/ 만 허용.
  if (url.startsWith('/')) {
    return url.startsWith('/uploads/') || url.startsWith('/icons/');
  }
  // 절대 URL — http(s) + 화이트리스트 호스트만.
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return ALLOWED_IMAGE_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

// 양수 정수 (인원, 수량 등)
export function parsePositiveInt(raw: unknown, max = 1_000_000): ParsedPrice | ParseError {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, error: '값을 입력해주세요.' };
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0 || n > max) {
    return { ok: false, error: '유효한 값을 입력해주세요.' };
  }
  return { ok: true, value: Math.floor(n) };
}
