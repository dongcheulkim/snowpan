// 판(vertical)별 큐레이션 콘텐츠 — 코스/대회/장비 추천.
// 정적 데이터로 시작, 추후 관리자 등록형·유저 제보형으로 전환 예정.

export interface PanCourse {
  name: string;
  area: string;
  distance?: string;
  level: string;   // '초급' | '중급' | '상급' | '투어' 등
  type: string;    // 필터 태그 — 판별 자유 (로드/트레일, 업힐/평지, 스크린/필드 등)
  desc: string;
  tip?: string;
}

export interface PanEvent {
  name: string;
  season: string;
  type: string;
  courses: string;
  area: string;
  note?: string;
}

export interface PanGearItem {
  name: string;
  brand: string;
  target: string;
  priceRange: string;
  point: string;
}

export interface PanGearSection {
  id: string;
  title: string;
  desc: string;
  items: PanGearItem[];
}

interface PanContent {
  coursesTitle: string;
  coursesFootnote?: string;
  eventsTitle: string;
  gearTitle: string;
  courses: PanCourse[];
  events: PanEvent[];
  gear: PanGearSection[];
}

export const PAN_CONTENT: Record<string, PanContent> = {
  run: {
    coursesTitle: '러닝 코스 추천',
    coursesFootnote: '코스 제보·후기는 커뮤니티에 남겨주세요.',
    eventsTitle: '대회 정보',
    gearTitle: '장비 추천',
    courses: [
      { name: '여의도 한강공원 순환', area: '서울 영등포', distance: '5~8.4km', level: '초급', type: '로드', desc: '평지 위주의 대표 러닝 코스. 밤에도 러너가 많아 안전하고, 물·화장실 인프라 최고.', tip: '주말 오전은 자전거·인파 많음 — 이른 아침 추천' },
      { name: '반포 한강공원', area: '서울 서초', distance: '5~10km', level: '초급', type: '로드', desc: '세빛섬~동작대교 구간. 야경이 좋아 저녁 러닝 명소.', tip: '무지개분수 시간대엔 사람 많음' },
      { name: '석촌호수 순환', area: '서울 송파', distance: '2.5km/바퀴', level: '초급', type: '로드', desc: '한 바퀴 2.5km 순환 코스라 페이스 훈련·인터벌에 최적. 트랙처럼 활용 가능.', tip: '벚꽃 시즌엔 러닝 불가 수준으로 혼잡' },
      { name: '올림픽공원', area: '서울 송파', distance: '5km 내외', level: '초급', type: '로드', desc: '신호 없는 공원 내부 코스. 잔디·포장 섞여 있어 지루하지 않음.' },
      { name: '경의선 숲길', area: '서울 마포', distance: '6km 편도', level: '초급', type: '로드', desc: '홍대~효창공원 직선 숲길. 그늘이 많아 여름 러닝에 좋음.', tip: '연남동 구간은 인파 주의' },
      { name: '남산 북측순환로', area: '서울 중구', distance: '7km 왕복', level: '중급', type: '로드', desc: '완만한 오르막 3.5km — 언덕 훈련의 정석 코스. 차량 통제라 안전.', tip: '오르막 페이스 훈련 후 내리막은 가볍게' },
      { name: '안양천 종주', area: '서울 서남부', distance: '10km+', level: '중급', type: '로드', desc: '평지 장거리 훈련용. 한강 합류 지점까지 신호 없이 쭉 달릴 수 있음.' },
      { name: '불암산~수락산 능선', area: '서울 노원', distance: '10km 내외', level: '상급', type: '트레일', desc: '서울 대표 트레일런 코스. 암릉 구간 있어 경험자용.', tip: '트레일화 필수, 스틱 권장' },
      { name: '관악산 둘레길', area: '서울 관악', distance: '6~12km', level: '중급', type: '트레일', desc: '흙길 위주의 입문용 트레일. 구간별로 끊어 달리기 좋음.' },
      { name: '광안리~해운대 해변', area: '부산', distance: '8km 편도', level: '초급', type: '로드', desc: '바다 보며 달리는 코스. 광안대교 야경 러닝 명소.', tip: '여름 낮은 더위 주의 — 일출 러닝 추천' },
    ],
    events: [
      { name: '서울마라톤 (동아마라톤)', season: '매년 3월', type: '로드', courses: '풀 · 10km', area: '서울 광화문~잠실', note: '국내 최고 권위의 메이저 대회. 접수 조기 마감' },
      { name: '코리아 50K', season: '매년 4월경', type: '트레일', courses: '50K · 25K 등', area: '경기 동두천 일대', note: '국내 대표 트레일 레이스' },
      { name: '서울하프마라톤', season: '매년 5월경', type: '로드', courses: '하프 · 10km', area: '서울 도심', note: '봄 시즌 대표 하프 대회' },
      { name: '춘천마라톤', season: '매년 10월', type: '로드', courses: '풀 · 10km', area: '강원 춘천 의암호', note: '가을 단풍 코스로 유명한 메이저 대회' },
      { name: 'JTBC 서울마라톤', season: '매년 11월', type: '로드', courses: '풀 · 10km', area: '서울 상암~잠실', note: '가을 시즌 최대 규모. 축제 분위기' },
      { name: '손기정평화마라톤', season: '매년 11월경', type: '로드', courses: '풀 · 하프 · 10km', area: '서울', note: '초보 러너 참가 비율 높음' },
    ],
    gear: [
      {
        id: 'daily', title: '데일리 러닝화 (입문·훈련)', desc: '처음 시작하거나 매일 신는 용도 — 쿠션 좋고 내구성 높은 모델',
        items: [
          { name: '페가수스', brand: '나이키', target: '입문~중급 데일리', priceRange: '10만원대', point: '수십 년 검증된 국민 데일리화. 무난함의 정석' },
          { name: '노바블라스트', brand: '아식스', target: '쿠션 좋아하는 러너', priceRange: '10만원대', point: '통통 튀는 쿠션감 — 장거리도 편함' },
          { name: '클리프톤', brand: '호카', target: '무릎 부담 줄이고 싶은 러너', priceRange: '10만원대 후반', point: '두꺼운 쿠션의 대명사. 회복 러닝에도 좋음' },
          { name: '고스트', brand: '브룩스', target: '발볼 넓은 러너', priceRange: '10만원대', point: '착화감 균형이 좋아 입문 추천 단골' },
        ],
      },
      {
        id: 'race', title: '레이스화 (대회용)', desc: '기록 도전용 카본 플레이트 — 풀·하프 대회에서',
        items: [
          { name: '베이퍼플라이', brand: '나이키', target: '기록 단축이 목표', priceRange: '30만원대', point: '카본화의 기준. 대회 날의 무기' },
          { name: '메타스피드', brand: '아식스', target: '피치 주법 러너', priceRange: '30만원대', point: '주법별 라인업 — 국내 러너 착용률 급상승' },
          { name: '아디오스 프로', brand: '아디다스', target: '장거리 레이스', priceRange: '20만원대 후반', point: '에너지로드 특유의 반발력' },
        ],
      },
      {
        id: 'watch', title: 'GPS 시계', desc: '페이스·심박·거리 기록 — 훈련의 필수템',
        items: [
          { name: '포러너 시리즈', brand: '가민', target: '본격 훈련 러너', priceRange: '30~70만원대', point: '러닝 시계의 표준. 훈련 기능 최강' },
          { name: '페이스 시리즈', brand: '코로스', target: '가성비 중시', priceRange: '20~30만원대', point: '배터리 오래가고 가벼움 — 가성비 강자' },
          { name: '애플워치', brand: '애플', target: '일상 겸용', priceRange: '50만원대~', point: '아이폰 유저면 활용도 최고, 러닝 전용 기능은 가민보다 약함' },
        ],
      },
      {
        id: 'etc', title: '러닝 용품', desc: '있으면 러닝이 훨씬 편해지는 것들',
        items: [
          { name: '러닝 베스트', brand: '(다양)', target: '장거리·트레일 러너', priceRange: '5~15만원대', point: '물·젤·폰 수납 — 10km 이상이면 체감 큼' },
          { name: '러닝 양말', brand: '(다양)', target: '모든 러너', priceRange: '1~2만원대', point: '물집 방지엔 전용 양말이 답. 면양말 금지' },
          { name: '러닝 벨트', brand: '(다양)', target: '가볍게 뛰는 러너', priceRange: '1~3만원대', point: '폰·카드만 넣고 출퇴근 러닝' },
          { name: '무선 이어폰 (오픈형)', brand: '샥즈 등', target: '음악 들으며 뛰는 러너', priceRange: '10만원대', point: '귀를 막지 않는 골전도 — 도로에서 안전' },
        ],
      },
    ],
  },

  bike: {
    coursesTitle: '라이딩 코스 추천',
    coursesFootnote: '코스 제보·GPX 공유는 커뮤니티에 남겨주세요.',
    eventsTitle: '대회 정보',
    gearTitle: '장비 추천',
    courses: [
      { name: '한강 자전거길 (반포~팔당)', area: '서울~경기', distance: '왕복 50km+', level: '초급', type: '로드', desc: '국내 라이딩의 시작점. 평지 위주라 입문 장거리 연습에 최적.', tip: '주말엔 잠수교~팔당 구간 인파 주의' },
      { name: '아라뱃길 (정서진)', area: '인천·김포', distance: '왕복 42km', level: '초급', type: '로드', desc: '신호 없는 직선 평지 — 속도 연습 명소. 서해 정서진 인증센터까지.', tip: '바람 방향에 따라 난이도 급변' },
      { name: '남산 업힐', area: '서울 중구', distance: '약 3km 업힐', level: '중급', type: '업힐', desc: '라이더 업힐 입문 코스. 국립극장~정상 반복 훈련 정석.', tip: '차량 통행 구간 — 새벽 라이딩 추천' },
      { name: '북악 스카이웨이', area: '서울 종로', distance: '업힐 5km+', level: '상급', type: '업힐', desc: '서울 대표 업힐 성지. 경사·커브 모두 훈련 강도 높음.', tip: '팔각정 뷰는 보상. 내리막 과속 금지' },
      { name: '남한강 자전거길 (팔당~양평)', area: '경기 양평', distance: '편도 30km+', level: '중급', type: '로드', desc: '터널·강변 풍경의 인기 코스. 두물머리 경유 라이딩 명소.', tip: '북한강철교 인증샷 필수' },
      { name: '의암호 순환', area: '강원 춘천', distance: '약 30km', level: '초급', type: '로드', desc: '호수 한 바퀴 순환 코스. 풍경 좋고 차량 간섭 적음.' },
      { name: '제주 환상 자전거길', area: '제주', distance: '일주 234km', level: '투어', type: '로드', desc: '해안도로 일주 인증 코스. 1박 2일~3일 투어 라이딩의 로망.', tip: '바람 많은 동쪽 구간은 오전에' },
    ],
    events: [
      { name: '설악 그란폰도', season: '매년 5~6월경', type: '그란폰도', courses: '그란폰도 · 메디오폰도', area: '강원 인제·설악 일대', note: '국내 최대 그란폰도. 미시령 업힐로 유명' },
      { name: '전국 그란폰도 시리즈', season: '봄~가을', type: '그란폰도', courses: '지역별 상이', area: '전국', note: '홍천·양양·화천 등 지역별 그란폰도가 시즌 내내 열림' },
      { name: '서울 자전거 대행진', season: '매년 봄', type: '퍼레이드', courses: '도심 코스', area: '서울', note: '도로 통제 후 달리는 축제형 행사 — 입문자도 부담 없음' },
    ],
    gear: [
      {
        id: 'bike', title: '입문 로드바이크', desc: '첫 로드는 알루미늄+기계식 변속이면 충분 — 100만원 내외',
        items: [
          { name: '컨텐드', brand: '자이언트', target: '입문 로드', priceRange: '100만원 내외', point: '입문 로드의 대명사. AS 접근성 좋음' },
          { name: '도마니 AL', brand: '트렉', target: '편한 지오메트리 원하는 입문자', priceRange: '100만원대', point: '업라이트 포지션 — 장거리도 덜 피로' },
          { name: '스컬트라', brand: '메리다', target: '가성비 중시', priceRange: '90만원대~', point: '가격 대비 구성 좋기로 유명' },
        ],
      },
      {
        id: 'computer', title: '속도계 (사이클링 컴퓨터)', desc: '속도·거리·코스 내비 — 라이딩 기록의 시작',
        items: [
          { name: '엣지 시리즈', brand: '가민', target: '본격 라이더', priceRange: '30~60만원대', point: '지도·내비까지 원하면 표준' },
          { name: '라이더 시리즈', brand: '브라이튼', target: '가성비 중시', priceRange: '10~20만원대', point: '기본 기록용으론 충분한 가성비' },
        ],
      },
      {
        id: 'safety', title: '안전 장비 (필수)', desc: '헬멧 없이 타지 마세요 — 라이트도 야간 필수',
        items: [
          { name: '헬멧', brand: '(다양)', target: '모든 라이더', priceRange: '5~20만원대', point: '인증(KC·CE) 확인. 사고 나면 교체' },
          { name: '전조등·후미등', brand: '(다양)', target: '야간·새벽 라이더', priceRange: '2~10만원대', point: '한강 야간 라이딩 필수. 후미등은 점멸' },
          { name: '빕숏', brand: '(다양)', target: '1시간 이상 타는 라이더', priceRange: '5~15만원대', point: '엉덩이 통증의 해답. 입문 후 첫 업그레이드로 추천' },
        ],
      },
    ],
  },

  golf: {
    coursesTitle: '골프장 · 연습 가이드',
    coursesFootnote: '골프장·연습장 후기는 커뮤니티에 남겨주세요.',
    eventsTitle: '대회 정보',
    gearTitle: '장비 추천',
    courses: [
      { name: '스크린골프', area: '전국 (골프존·카카오VX 등)', level: '입문', type: '스크린', desc: '골프 입문의 시작점. 룰·스윙을 부담 없이 익히고 비용도 저렴.', tip: '평일 낮 시간대가 저렴. 조인 문화도 활발' },
      { name: '실내 연습장', area: '전국', level: '입문', type: '연습', desc: '스윙 만들기 단계. 레슨 프로 상주 매장이 많아 입문 레슨 받기 좋음.', tip: '월 회원권이 일반 타석보다 훨씬 경제적' },
      { name: '야외 드라이빙레인지', area: '전국', level: '초급', type: '연습', desc: '실제 구질(슬라이스·훅)을 눈으로 확인하는 단계. 필드 전 필수 코스.', tip: '거리 표지판 기준으로 클럽별 거리 파악' },
      { name: '파3 · 숏코스', area: '전국', level: '초급', type: '필드', desc: '첫 필드 경험으로 최적. 그린 주변 숏게임·퍼팅 연습 실전 무대.', tip: '캐디·카트 없이 저렴하게 라운드 감각 익히기' },
      { name: '퍼블릭 18홀', area: '전국', level: '중급', type: '필드', desc: '회원권 없이 부킹 가능한 정규 라운드. 주중이 주말보다 훨씬 저렴.', tip: '동반자 조인 문화 활용하면 1인도 라운드 가능' },
      { name: '회원제 골프장', area: '전국', level: '상급', type: '필드', desc: '회원 동반·초청 위주의 정규 코스. 코스 관리 상태가 좋은 편.', }
    ],
    events: [],
    gear: [
      {
        id: 'starter', title: '입문 클럽', desc: '처음부터 풀세트 신품은 비추 — 중고·하프세트로 시작',
        items: [
          { name: '중고 풀세트', brand: '(다양)', target: '입문 골퍼', priceRange: '30~80만원대', point: '입문은 중고가 정답. 실력 늘면 취향대로 교체' },
          { name: '하프세트', brand: '(다양)', target: '스크린·파3 위주', priceRange: '20~50만원대', point: '드라이버·아이언 몇 개·퍼터면 시작 충분' },
          { name: '입문용 브랜드 세트', brand: '캘러웨이·테일러메이드 등', target: '신품 선호 입문자', priceRange: '100만원대~', point: '관용성 좋은 입문 라인으로' },
        ],
      },
      {
        id: 'rangefinder', title: '거리측정기', desc: '필드 나가기 시작하면 체감 큰 장비',
        items: [
          { name: '레이저 거리측정기', brand: '부쉬넬·니콘 등', target: '정확한 거리 원하는 골퍼', priceRange: '20~50만원대', point: '핀까지 정확한 거리 — 클럽 선택이 쉬워짐' },
          { name: 'GPS 워치·음성형', brand: '보이스캐디 등', target: '간편함 중시', priceRange: '10~30만원대', point: '착용만 하면 그린까지 거리 안내' },
        ],
      },
      {
        id: 'ball', title: '골프볼', desc: '실력 단계별로 고르는 게 경제적',
        items: [
          { name: '로스트볼', brand: '(다양)', target: '입문·초급', priceRange: '개당 몇백원~', point: '어차피 잃어버림 — 입문은 로스트볼로' },
          { name: '2~3피스 신품볼', brand: '스릭슨·볼빅 등', target: '중급', priceRange: '더즌 2~4만원대', point: '비거리·내구성 균형' },
          { name: '투어볼', brand: '타이틀리스트 Pro V1 등', target: '상급·스핀 컨트롤', priceRange: '더즌 6만원대~', point: '숏게임 스핀 차이를 느낄 실력에' },
        ],
      },
      {
        id: 'etc', title: '용품', desc: '라운드 기본템',
        items: [
          { name: '골프 장갑', brand: '(다양)', target: '모든 골퍼', priceRange: '1~3만원대', point: '소모품 — 여분 필수' },
          { name: '골프화', brand: '(다양)', target: '필드 나가는 골퍼', priceRange: '10~20만원대', point: '스파이크리스가 입문 무난' },
          { name: '티·마커·볼파우치', brand: '(다양)', target: '모든 골퍼', priceRange: '1만원 내외', point: '기본 소품 세트로 한 번에' },
        ],
      },
    ],
  },
};
