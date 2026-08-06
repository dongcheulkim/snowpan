// 공개 API 응답에서 비공개 서류·내부 필드 제거.
// 사업자등록증/자격증/숙박업신고증 이미지는 관리자 심사용 — 공개 노출 금지 (개인정보).
const PRIVATE_KEYS = ['businessLicense', 'instructorCert', 'accommodationPermit', 'aiNote', 'aiReviewedAt', 'aiVerified'] as const;

export function stripPrivate<T extends Record<string, unknown>>(row: T): T {
  const copy: Record<string, unknown> = { ...row };
  for (const k of PRIVATE_KEYS) delete copy[k];
  return copy as T;
}

export function stripPrivateAll<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(stripPrivate);
}
