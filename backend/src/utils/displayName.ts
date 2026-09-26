// 유저 표시 이름: 닉네임 우선, 없으면 본명
export function displayName(user: { name: string; nickname?: string | null }): string {
  return user.nickname || user.name;
}

// 공개 응답용 — 중첩 user 의 name 을 표시명(닉네임 우선)으로 치환해 실명 비노출.
// select 에 name·nickname 이 함께 있는 목록/상세 응답에 씌운다.
const PUBLIC_ANON = '스노우판 회원';
export const DELETED_LABEL = '탈퇴한 회원';
// 탈퇴 회원은 닉네임이 비어 있고 name 이 '탈퇴한 회원'(role deleted) — 익명 폴백 대신 탈퇴 표시를 유지
function isDeletedUser(u: { name?: string | null; role?: string | null }): boolean {
  return u.role === 'deleted' || u.name === DELETED_LABEL;
}
export function maskRowUser<T extends { user?: unknown }>(row: T): T {
  const u = row?.user as { name?: string | null; nickname?: string | null; role?: string | null } | null | undefined;
  if (u && typeof u === 'object' && 'name' in u) {
    // 닉네임 없으면 실명 대신 익명 라벨 — 폴백으로 실명이 새던 것 차단
    return { ...row, user: { ...u, name: u.nickname || (isDeletedUser(u) ? DELETED_LABEL : PUBLIC_ANON) } };
  }
  return row;
}
export function maskRowUserAll<T extends { user?: unknown }>(rows: T[]): T[] {
  return rows.map(maskRowUser);
}
// 공개 표시명: 닉네임 → 탈퇴 회원이면 '탈퇴한 회원' → 그 밖엔 익명 라벨. 인라인 `nickname || '스노우판 회원'` 대신 이걸 쓴다.
export function publicName(u: { name?: string | null; nickname?: string | null; role?: string | null } | null | undefined): string {
  if (!u) return PUBLIC_ANON;
  return u.nickname || (isDeletedUser(u) ? DELETED_LABEL : PUBLIC_ANON);
}
