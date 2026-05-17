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
  },
  {
    slug: 'bike',
    name: 'BIKEPAN',
    tagline: '자전거 · MTB · 로드',
    status: 'coming_soon',
    basePath: '/bike',
    toneFrom: '#fef3c7',
    toneTo: '#fde68a',
    description: '라이딩 장비 · 코스 · 동행. 페달의 모든 것 (준비 중).',
  },
  {
    slug: 'run',
    name: 'RUNPAN',
    tagline: '러닝 · 마라톤 · 트레일',
    status: 'coming_soon',
    basePath: '/run',
    toneFrom: '#dcfce7',
    toneTo: '#bbf7d0',
    description: '러너 장비 · 대회 · 페이스메이커. 한 발 한 발의 모든 것 (준비 중).',
  },
];

export const ACTIVE_VERTICAL_SLUG = 'snow';
export function getActiveVertical(): Vertical {
  return VERTICALS.find(v => v.slug === ACTIVE_VERTICAL_SLUG)!;
}
export function getVerticalBySlug(slug: string): Vertical | undefined {
  return VERTICALS.find(v => v.slug === slug);
}
