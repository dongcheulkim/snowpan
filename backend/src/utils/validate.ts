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

// 사용자 입력 이미지 URL 검증 — Cloudinary 또는 우리 도메인만 허용.
// 임의 외부 URL 차단 — 사용자에게 보일 이미지에 추적 픽셀/피싱 URL 박는 것 방지.
const ALLOWED_IMAGE_HOSTS = ['res.cloudinary.com', 'snowpan.vercel.app', 'snowpan.onrender.com'];
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
