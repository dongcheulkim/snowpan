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
  // 12월
  {
    id: '1', date: '2025-12-06', endDate: '2025-12-07',
    title: 'KSIA 시즌 개막전', location: '하이원리조트', sport: 'ski', level: '전체', organizer: 'KSIA',
    description: '2025-26 시즌 개막 레이스. 모든 레벨의 스키어가 참가할 수 있는 GS 대회입니다.',
    events: ['GS(대회전)'],
    fee: '50,000원', eligibility: 'KSIA 회원 또는 당일 가입 가능',
    schedule: ['12/6 10:00 1차 런', '12/6 13:00 2차 런', '12/7 10:00 결승'],
    contact: 'ksia@ksia.or.kr', website: 'https://www.ksia.or.kr',
  },
  {
    id: '2', date: '2025-12-13', endDate: '2025-12-14',
    title: 'SBAK 보드크로스 1차', location: '웰리힐리파크', sport: 'board', level: '전체', organizer: 'SBAK',
    description: '보드크로스 시즌 첫 대회. 4인 1조 동시 출발 레이스.',
    events: ['보드크로스'],
    fee: '40,000원', eligibility: '누구나 참가 가능',
    schedule: ['12/13 09:00 코스 인스펙션', '12/13 11:00 예선', '12/14 10:00 본선'],
    contact: 'info@sbak.or.kr',
  },
  {
    id: '3', date: '2025-12-20', endDate: '2025-12-21',
    title: '전국 알파인 스키 선수권 1차', location: '용평리조트', sport: 'ski', level: '선수', organizer: '대한스키협회',
    description: '대한스키협회 공인 전국 알파인 선수권대회.',
    events: ['SL(회전)', 'GS(대회전)'],
    fee: '80,000원', eligibility: '대한스키협회 등록 선수',
    schedule: ['12/20 09:30 GS 1차', '12/20 13:00 GS 2차', '12/21 09:30 SL 1차', '12/21 13:00 SL 2차'],
    prize: '1위 상금 100만원, 2위 50만원, 3위 30만원',
  },
  {
    id: '4', date: '2025-12-27', endDate: '2025-12-28',
    title: '크리스마스 프리스타일 잼', location: '휘닉스평창', sport: 'both', level: '전체', organizer: '휘닉스파크',
    description: '크리스마스 시즌 프리스타일 축제! 스키 & 보드 모두 참가 가능.',
    events: ['모굴', '에어리얼', '하프파이프', '빅에어'],
    fee: '30,000원 (관람 무료)', eligibility: '누구나 참가 가능',
    schedule: ['12/27 10:00 모굴 & 에어리얼', '12/27 14:00 빅에어', '12/28 10:00 하프파이프', '12/28 15:00 시상식 & 파티'],
    prize: '종목별 1위 상품권 50만원',
  },

  // 1월
  {
    id: '5', date: '2026-01-03', endDate: '2026-01-04',
    title: '신년 GS 대회', location: '하이원리조트', sport: 'ski', level: '전체', organizer: 'KSIA',
    description: '새해 첫 GS 대회. 레벨별 조 편성으로 누구나 즐길 수 있습니다.',
    events: ['GS(대회전)'],
    fee: '50,000원', eligibility: '전체',
    schedule: ['1/3 10:00 레벨1~2 조', '1/3 13:00 레벨3~데몬 조', '1/4 10:00 결승'],
  },
  {
    id: '6', date: '2026-01-10', endDate: '2026-01-11',
    title: 'SBAK 슬로프스타일 1차', location: '휘닉스평창', sport: 'board', level: '전체', organizer: 'SBAK',
    description: '슬로프스타일 시즌 1차 대회. 레일, 박스, 점프 코스.',
    events: ['슬로프스타일'],
    fee: '40,000원', eligibility: '누구나 참가 가능',
    schedule: ['1/10 09:00 연습 런', '1/10 12:00 예선', '1/11 10:00 본선 & 시상'],
  },
  {
    id: '7', date: '2026-01-17', endDate: '2026-01-18',
    title: '전국 동계체전 스키부문', location: '용평리조트', sport: 'ski', level: '선수', organizer: '대한체육회',
    description: '전국체육대회 동계종목 스키 부문.',
    events: ['SL(회전)', 'GS(대회전)', '크로스컨트리'],
    fee: '시·도 대표 선발', eligibility: '시·도 대표 선수',
    schedule: ['1/17 GS', '1/18 SL'],
  },
  {
    id: '8', date: '2026-01-24', endDate: '2026-01-25',
    title: '아마추어 보더크로스 오픈', location: '곤지암리조트', sport: 'board', level: '아마추어', organizer: 'SBAK',
    description: '보더크로스 입문자를 위한 오픈 대회. 클리닉 포함.',
    events: ['보드크로스', '보드크로스 클리닉'],
    fee: '35,000원 (클리닉 포함)', eligibility: '누구나 참가 가능',
    schedule: ['1/24 09:00 클리닉', '1/24 13:00 연습 런', '1/25 10:00 본선'],
    prize: '참가자 전원 기념품',
  },
  {
    id: '9', date: '2026-01-31',
    title: 'KSIA 데몬스트레이션 캠프', location: '웰리힐리파크', sport: 'ski', level: '데몬', organizer: 'KSIA',
    description: '데몬스트레이터 자격 유지 및 기술 향상 캠프.',
    events: ['기술 시연', '평가'],
    fee: '100,000원', eligibility: 'KSIA 데몬스트레이터',
    schedule: ['1/31 09:00~16:00 종일 캠프'],
  },

  // 2월
  {
    id: '10', date: '2026-02-07', endDate: '2026-02-08',
    title: '전국 알파인 스키 선수권 2차', location: '하이원리조트', sport: 'ski', level: '선수', organizer: '대한스키협회',
    description: '시즌 2차 전국 선수권. 시즌 종합 순위 반영.',
    events: ['SL(회전)', 'GS(대회전)'],
    fee: '80,000원', eligibility: '대한스키협회 등록 선수',
    schedule: ['2/7 GS', '2/8 SL'],
    prize: '시즌 종합 순위 시상',
  },
  {
    id: '11', date: '2026-02-11', endDate: '2026-02-12',
    title: 'FIS 극동컵 SL/GS', location: '용평리조트', sport: 'ski', level: '국제', organizer: 'FIS',
    description: 'FIS 공인 국제대회. FIS 포인트 획득 가능.',
    events: ['SL(회전)', 'GS(대회전)'],
    fee: 'FIS 등록비 별도', eligibility: 'FIS 라이선스 보유 선수',
    schedule: ['2/11 09:00 GS', '2/12 09:00 SL'],
    website: 'https://www.fis-ski.com',
    prize: 'FIS 포인트 부여',
  },
  {
    id: '12', date: '2026-02-14', endDate: '2026-02-15',
    title: '발렌타인 프리라이드 챌린지', location: '휘닉스평창', sport: 'both', level: '전체', organizer: '휘닉스파크',
    description: '발렌타인데이 특별 프리라이드 이벤트.',
    events: ['프리라이드', '커플 듀오 레이스'],
    fee: '25,000원 (커플 40,000원)', eligibility: '누구나',
    schedule: ['2/14 10:00 프리라이드', '2/14 14:00 커플 듀오', '2/15 10:00 결승 & 시상'],
    prize: '커플 1위 리조트 숙박권',
  },
  {
    id: '13', date: '2026-02-21', endDate: '2026-02-22',
    title: 'SBAK 하프파이프 챔피언십', location: '웰리힐리파크', sport: 'board', level: '전체', organizer: 'SBAK',
    description: '시즌 최대 하프파이프 대회.',
    events: ['하프파이프'],
    fee: '45,000원', eligibility: '전체',
    schedule: ['2/21 연습 & 예선', '2/22 본선 & 시상'],
    prize: '1위 100만원, 2위 50만원, 3위 30만원',
  },
  {
    id: '14', date: '2026-02-28',
    title: '시즌엔드 레이스 페스티벌', location: '곤지암리조트', sport: 'both', level: '전체', organizer: '곤지암리조트',
    description: '시즌 마무리 축제. 코스튬 레이스, DJ 파티 포함.',
    events: ['GS 레이스', '코스튬 레이스', 'DJ 파티'],
    fee: '20,000원 (파티 포함)', eligibility: '누구나',
    schedule: ['2/28 10:00 GS', '2/28 13:00 코스튬 레이스', '2/28 17:00 DJ 파티'],
    prize: '베스트 코스튬상, 레이스 1~3위 상품',
  },

  // 3월
  {
    id: '15', date: '2026-03-07', endDate: '2026-03-08',
    title: 'KSIA 시즌 클로징 대회', location: '하이원리조트', sport: 'ski', level: '전체', organizer: 'KSIA',
    description: '시즌 마지막 공식 대회. 시즌 종합 시상.',
    events: ['GS(대회전)'],
    fee: '50,000원', eligibility: 'KSIA 회원',
    schedule: ['3/7 본선', '3/8 시즌 종합 시상식'],
    prize: '시즌 종합 1~3위 트로피 & 상품',
  },
  {
    id: '16', date: '2026-03-14', endDate: '2026-03-15',
    title: 'SBAK 시즌 마감전', location: '휘닉스평창', sport: 'board', level: '전체', organizer: 'SBAK',
    description: '보드 시즌 마지막 대회. 슬로프스타일 & 빅에어.',
    events: ['슬로프스타일', '빅에어'],
    fee: '40,000원', eligibility: '전체',
    schedule: ['3/14 슬로프스타일', '3/15 빅에어 & 시상'],
    prize: '시즌 종합 순위 시상',
  },
  {
    id: '17', date: '2026-03-21',
    title: '스프링 스키 페스티벌', location: '용평리조트', sport: 'both', level: '전체', organizer: '용평리조트',
    description: '봄 스키 축제! 코스튬 레이스, 보물찾기, 라이브 공연까지.',
    events: ['코스튬 레이스', '보물찾기', '라이브 공연'],
    fee: '15,000원 (공연 관람 포함)', eligibility: '누구나',
    schedule: ['3/21 10:00 코스튬 레이스', '3/21 13:00 보물찾기', '3/21 16:00 라이브 공연'],
    prize: '베스트 코스튬, 보물찾기 경품',
  },
];

export default competitions;
