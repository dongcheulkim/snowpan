// 가입일 → 자연어 (예: "3개월째 활동 중", "1년 2개월째 활동 중"). 판매자 프로필·중고 상세 판매자 칸이 같이 쓴다.
export function memberDuration(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 14) return `가입한 지 ${days}일`;
  if (days < 60) return `가입한 지 ${Math.floor(days / 7)}주`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월째 활동 중`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years}년째 활동 중` : `${years}년 ${rem}개월째 활동 중`;
}
