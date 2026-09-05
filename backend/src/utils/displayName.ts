// 유저 표시 이름: 닉네임 우선, 없으면 본명
export function displayName(user: { name: string; nickname?: string | null }): string {
  return user.nickname || user.name;
}

// 공개 응답용 — 중첩 user 의 name 을 표시명(닉네임 우선)으로 치환해 실명 비노출.
// select 에 name·nickname 이 함께 있는 목록/상세 응답에 씌운다.
const PUBLIC_ANON = '스노우판 회원';
export function maskRowUser<T extends { user?: unknown }>(row: T): T {
  const u = row?.user as { name?: string | null; nickname?: string | null } | null | undefined;
  if (u && typeof u === 'object' && 'name' in u) {
    // 닉네임 없으면 실명 대신 익명 라벨 — 폴백으로 실명이 새던 것 차단
    return { ...row, user: { ...u, name: u.nickname || PUBLIC_ANON } };
  }
  return row;
}
export function maskRowUserAll<T extends { user?: unknown }>(rows: T[]): T[] {
  return rows.map(maskRowUser);
}
