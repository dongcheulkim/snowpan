import { isAllowedImageUrl } from './validate';

// 포스터/갤러리용 다중 이미지 정리 — 배열 또는 콤마 문자열 → 허용 URL만, 최대 max장, 콤마 결합.
export function sanitizeImages(input: unknown, max = 8): string | null {
  let arr: string[] = [];
  if (Array.isArray(input)) arr = input.map((x) => String(x));
  else if (typeof input === 'string') arr = input.split(',');
  arr = arr.map((s) => s.trim()).filter(Boolean).filter((u) => isAllowedImageUrl(u)).slice(0, max);
  return arr.length ? arr.join(',') : null;
}
