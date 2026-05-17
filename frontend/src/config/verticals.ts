// PAN 우산 브랜드 아래의 버티컬 (세부 플랫폼) 레지스트리.
// 현재 snow 만 활성. bike/run 은 향후 별도 구현 후 active=true.
//
// 신규 버티컬 추가 절차:
//   1. 이 파일에 항목 추가 (slug, name, status, basePath)
//   2. status='active' 로 변경
//   3. PanTopBar 의 스위처에 자동 노출
//   4. (선택) 별도 라우트 prefix 적용 시 App.tsx 에서 분기

export type VerticalStatus = 'active' | 'coming_soon' | 'beta';

export interface Vertical {
  slug: string;          // 'snow' | 'bike' | 'run' | ...
  name: string;          // 'SNOWPAN'
  tagline: string;       // '스키 · 보드'
  status: VerticalStatus;
  basePath: string;      // 진입 시 이동할 경로 (현재 snow 만 '/')
  // 시각 메타 — Hub 카드에 사용
  toneFrom: string;      // gradient 시작 색
  toneTo: string;        // gradient 끝 색
  description: string;
  // 랜딩 페이지에서 미리보기로 보여줄 카테고리들 (각 4개)
  previewCategories?: { label: string; desc: string }[];
  // 영어 슬로건 — 랜딩 hero 의 부제
  englishSlogan?: string;
}

export const VERTICALS: Vertical[] = [
  {
    slug: 'snow',
    name: 'SNOWPAN',
    tagline: '스키 · 보드',
    status: 'active',
    basePath: '/',
    toneFrom: '#e0f2fe',
    toneTo: '#bae6fd',
    description: '중고거래 · 렌탈 · 레슨 · 숙소를 한 곳에. 시즌의 모든 것.',
    englishSlogan: 'FREEDOM ON THE SNOW',
    previewCategories: [
      { label: '중고거래', desc: '시세 기반 중고 장비' },
      { label: '렌탈', desc: '리조트별 풀세트' },
      { label: '레슨', desc: '강사 · 데몬 매칭' },
      { label: '숙소', desc: '펜션 · 콘도 · 시즌방' },
    ],
  },
  {
    slug: 'bike',
    name: 'BIKEPAN',
    tagline: '자전거 · MTB · 로드',
    status: 'coming_soon',
    basePath: '/bike',
    toneFrom: '#fef3c7',
    toneTo: '#fde68a',
    description: '로드 · MTB · 그래블. 페달의 모든 것.',
    englishSlogan: 'EVERY PEDAL COUNTS',
    previewCategories: [
      { label: '중고거래', desc: '프레임 · 휠셋 · 컴포넌트' },
      { label: '라이딩 동행', desc: '코스 매칭 · 그룹 라이딩' },
      { label: '바이크샵', desc: '피팅 · 정비 · 매장 정보' },
      { label: '코스', desc: '명소 · GPX · 인증' },
    ],
  },
  {
    slug: 'run',
    name: 'RUNPAN',
    tagline: '러닝 · 마라톤 · 트레일',
    status: 'coming_soon',
    basePath: '/run',
    toneFrom: '#dcfce7',
    toneTo: '#bbf7d0',
    description: '한 발 한 발, 러너를 위한 플랫폼.',
    englishSlogan: 'EVERY STEP MATTERS',
    previewCategories: [
      { label: '러닝 장비', desc: '슈즈 · 의류 · 시계' },
      { label: '대회 정보', desc: '마라톤 · 트레일런 · 등록' },
      { label: '코치 매칭', desc: '훈련 프로그램 · 러닝 클래스' },
      { label: '페이서', desc: '동반 러너 매칭' },
    ],
  },
  {
    slug: 'surf',
    name: 'SURFPAN',
    tagline: '서핑 · 양양 · 송정',
    status: 'coming_soon',
    basePath: '/surf',
    toneFrom: '#cffafe',
    toneTo: '#67e8f9',
    description: '보드와 파도, 모든 라인업.',
    englishSlogan: 'RIDE THE LINEUP',
    previewCategories: [
      { label: '중고거래', desc: '보드 · 슈트 · 액세서리' },
      { label: '강사', desc: '입문 · 중급 · 빅웨이브' },
      { label: '라인업', desc: '파도 · 바람 · 컨디션' },
      { label: '서핑 숙소', desc: '양양 · 송정 펜션' },
    ],
  },
  {
    slug: 'golf',
    name: 'GOLFPAN',
    tagline: '골프 · 라운드 · 스크린',
    status: 'coming_soon',
    basePath: '/golf',
    toneFrom: '#ecfccb',
    toneTo: '#d9f99d',
    description: '클럽부터 라운드까지, 그린의 모든 것.',
    englishSlogan: 'OWN THE GREEN',
    previewCategories: [
      { label: '중고거래', desc: '클럽 · 풀세트 · 의류' },
      { label: '라운드', desc: '필드 부킹 · 동반자 매칭' },
      { label: '스크린', desc: '스크린골프 매장 · 가격' },
      { label: '레슨', desc: '프로 매칭 · 클래스' },
    ],
  },
  {
    slug: 'camp',
    name: 'CAMPPAN',
    tagline: '캠핑 · 차박 · 백패킹',
    status: 'coming_soon',
    basePath: '/camp',
    toneFrom: '#ffedd5',
    toneTo: '#fed7aa',
    description: '텐트 한 동, 별 가득. 야영의 모든 것.',
    englishSlogan: 'UNDER THE STARS',
    previewCategories: [
      { label: '중고거래', desc: '텐트 · 체어 · 코펠' },
      { label: '캠핑장', desc: '오토 · 글램핑 · 노지' },
      { label: '차박 코스', desc: '경치 · 화장실 · 후기' },
      { label: '동행', desc: '단독 캠핑 · 그룹 캠핑' },
    ],
  },
];

export const ACTIVE_VERTICAL_SLUG = 'snow';
export function getActiveVertical(): Vertical {
  return VERTICALS.find(v => v.slug === ACTIVE_VERTICAL_SLUG)!;
}
export function getVerticalBySlug(slug: string): Vertical | undefined {
  return VERTICALS.find(v => v.slug === slug);
}
