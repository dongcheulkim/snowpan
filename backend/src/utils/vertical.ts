// vertical 처리 헬퍼 — controller 들에서 일관되게 사용.
//
// pickVertical(req.query.vertical)
//   - undefined / null / '' → 'snow' (default)
//   - 'snow' | 'bike' | 'run' | 'surf' | 'golf' | 'camp' → 그대로 반환
//   - 그 외 → null (잘못된 값, 400 으로 응답해야 함)

export const VERTICAL_SLUGS = ['snow', 'bike', 'run', 'surf', 'golf', 'camp'] as const;
export type VerticalSlug = typeof VERTICAL_SLUGS[number];

export function pickVertical(value: unknown): VerticalSlug | null {
  if (value === undefined || value === null || value === '') return 'snow';
  if (typeof value !== 'string') return null;
  if ((VERTICAL_SLUGS as readonly string[]).includes(value)) return value as VerticalSlug;
  return null;
}
