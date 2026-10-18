// 사이즈 표시 통일 (2026-10-18): 예전 매물은 숫자만("165") 저장돼 있고 새 매물은 단위까지("165cm") 저장됨 → 보여줄 때 단위를 맞춘다.
export function sizeLabel(size: string | null | undefined, subcategory: string | null | undefined): string {
  if (!size) return '';
  const s = size.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return s; // 이미 단위가 있거나 L/XL 같은 글자
  const sub = subcategory || '';
  if (['ski', 'board', 'pole'].includes(sub)) return `${s}cm`;
  if (['boots', 'ski_boots', 'board_boots', 'shoes'].includes(sub)) return `${s}mm`;
  return s;
}
