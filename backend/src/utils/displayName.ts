// 유저 표시 이름: 닉네임 우선, 없으면 본명
export function displayName(user: { name: string; nickname?: string | null }): string {
  return user.nickname || user.name;
}

// Prisma select에서 user 조회 후 name을 닉네임으로 치환
export function resolveUserName<T extends { name: string; nickname?: string | null }>(user: T): T {
  return { ...user, name: user.nickname || user.name };
}
