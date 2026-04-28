// 커뮤니티 카테고리 라벨 — 종목별로 다르게 표시.
// DB enum (id) 은 동일, 화면 라벨만 sport 에 따라 분기.

type Sport = 'ski' | 'board' | string;

const BASE: Record<string, { ski: string; board: string }> = {
  free:    { ski: '자유',     board: '자유' },
  review:  { ski: '장비리뷰', board: '장비리뷰' },
  gear:    { ski: '장비추천', board: '장비추천' },
  resort:  { ski: '스키장',   board: '라이딩 장소' },
  tip:     { ski: '초보팁',   board: '초보팁' },
  carpool: { ski: '카풀',     board: '카풀' },
  poll:    { ski: '투표',     board: '투표' },
};

export function communityCategoryLabel(id: string, sport?: Sport): string {
  const entry = BASE[id];
  if (!entry) return id;
  return sport === 'board' ? entry.board : entry.ski;
}

// 카테고리 옵션 배열 — sport 파라미터에 따라 라벨이 달라짐.
export function communityCategories(sport?: Sport, includePoll = false): { id: string; name: string }[] {
  const ids = includePoll
    ? ['free', 'review', 'gear', 'resort', 'tip', 'carpool', 'poll']
    : ['free', 'review', 'gear', 'resort', 'tip', 'carpool'];
  return ids.map((id) => ({ id, name: communityCategoryLabel(id, sport) }));
}
