export interface Competition {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  location: string;
  sport: 'ski' | 'board' | 'both';
  level: string;
  organizer: string;
  description?: string;
  poster?: string;
  events?: string[];
  fee?: string;
  contact?: string;
  website?: string;
  schedule?: string[];
  eligibility?: string;
  prize?: string;
}

const competitions: Competition[] = [
  // 2026-27 시즌 대회 등록 시 여기에 추가

  // ===== [샘플/테스트 데이터 — 실제 대회 아님, 캘린더 확인용. 확인 후 이 블록 삭제] =====
  { id: 'sample-1', date: '2026-12-12', title: '샘플 스키 오픈전', location: '하이원 스키장', sport: 'ski', level: '아마추어', organizer: '테스트' },
  { id: 'sample-2', date: '2026-12-12', title: '샘플 보드 킥오프', location: '휘닉스 평창', sport: 'board', level: '전체', organizer: '테스트' },
  { id: 'sample-3', date: '2026-12-19', endDate: '2026-12-21', title: '샘플 종별 선수권', location: '용평리조트', sport: 'both', level: '선수', organizer: '테스트' },
  { id: 'sample-4', date: '2026-12-27', title: '샘플 스키 데몬전', location: '무주덕유산', sport: 'ski', level: '데몬', organizer: '테스트' },
  { id: 'sample-5', date: '2027-01-10', title: '샘플 보드 슬로프스타일', location: '곤지암리조트', sport: 'board', level: '아마추어', organizer: '테스트' },
  // ===== [샘플 데이터 끝] =====
];

export default competitions;
