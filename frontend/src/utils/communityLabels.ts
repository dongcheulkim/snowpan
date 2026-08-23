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
  meetup:  { ski: '모임',     board: '모임' },
  job:     { ski: '구인',     board: '구인' },     // 사람 구해요 (매장·스키장 채용)
  jobseek: { ski: '구직',     board: '구직' },     // 일자리 구해요 (강사·알바 지원)
  poll:    { ski: '투표',     board: '투표' },
  notice:  { ski: '공지',     board: '공지' },
};

// 다른 판 종목별 라벨 오버라이드 — 명시 안 된 카테고리는 ski 라벨(범용) 재사용.
// road 는 run/bike 공용이라 중립 라벨 사용.
const SPORT_OVERRIDES: Record<string, Record<string, string>> = {
  road:   { resort: '코스 후기', carpool: '동행', meetup: '크루 · 모임' },
  trail:  { resort: '코스 후기', carpool: '동행', meetup: '러닝 크루' },
  track:  { resort: '코스 후기', carpool: '동행', meetup: '러닝 크루' },
  mtb:    { resort: '코스 후기', carpool: '동행', meetup: '라이딩 크루' },
  gravel: { resort: '코스 후기', carpool: '동행', meetup: '라이딩 크루' },
  field:  { resort: '골프장 후기', carpool: '조인 · 동행', meetup: '라운드 모임' },
  screen: { resort: '매장 후기', carpool: '조인 · 동행', meetup: '스크린 모임' },
};

export function communityCategoryLabel(id: string, sport?: Sport): string {
  if (sport && SPORT_OVERRIDES[sport]) {
    return SPORT_OVERRIDES[sport][id] ?? BASE[id]?.ski ?? id;
  }
  const entry = BASE[id];
  if (!entry) return id;
  return sport === 'board' ? entry.board : entry.ski;
}

// 카테고리 옵션 배열 — sport 파라미터에 따라 라벨이 달라짐.
export function communityCategories(sport?: Sport, includePoll = false): { id: string; name: string }[] {
  const ids = includePoll
    ? ['free', 'review', 'gear', 'resort', 'tip', 'carpool', 'meetup', 'job', 'jobseek', 'poll']
    : ['free', 'review', 'gear', 'resort', 'tip', 'carpool', 'meetup', 'job', 'jobseek'];
  return ids.map((id) => ({ id, name: communityCategoryLabel(id, sport) }));
}
