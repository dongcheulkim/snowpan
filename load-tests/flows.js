// 공통 사용자 플로우 — 스모크/로드/스트레스 시나리오가 함께 사용.
// 실제 프로덕션 DB에 쓰기 작업을 하지 않는 "읽기 전용" 플로우만 정의.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';

export const status429 = new Counter('status_429');
export const status4xx = new Counter('status_4xx_other');
export const status5xx = new Counter('status_5xx');
export const statusOther = new Counter('status_other');

// 기본 엔드포인트 (env로 오버라이드 가능)
export const BASE_URL = __ENV.BASE_URL || 'https://snowpan.onrender.com';

// 엔드포인트별 응답 시간 추적 (대시보드에서 어떤 API가 느린지 확인용)
export const pageLoadTrend = new Trend('page_load_time', true);
export const errorCount = new Counter('errors');

// VU 별로 고유한 가짜 IP 생성 → trust proxy 가 설정된 서버에서 서로 다른 rate-limit bucket 할당됨.
// 10.x.x.x 사설 대역 (실제 유저 IP와 겹치지 않음).
function fakeIp() {
  // __VU 는 k6 전역: 현재 VU 번호 (1-based)
  const vu = typeof __VU !== 'undefined' ? __VU : 1;
  const a = 10;
  const b = (vu >> 16) & 0xff;
  const c = (vu >> 8) & 0xff;
  const d = vu & 0xff;
  return `${a}.${b}.${c}.${d || 1}`;
}

// 서버 rate limit 을 우회해서 순수 용량만 측정. 키는 render.yaml 과 동기화.
const LOADTEST_BYPASS_KEY = __ENV.LOADTEST_BYPASS_KEY || ''; // 키는 환경변수로 전달: k6 run -e LOADTEST_BYPASS_KEY=xxx

function defaultHeaders() {
  return {
    'X-Forwarded-For': fakeIp(),
    'X-Loadtest-Key': LOADTEST_BYPASS_KEY,
    'User-Agent': `k6-loadtest/1.0 vu=${typeof __VU !== 'undefined' ? __VU : 0}`,
  };
}

function checkAndTrack(res, name, expectedStatus = 200) {
  const ok = check(res, {
    [`${name} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name} body non-empty`]: (r) => (r.body || '').length > 0,
  });
  pageLoadTrend.add(res.timings.duration, { endpoint: name });
  if (!ok) {
    errorCount.add(1, { endpoint: name });
    if (res.status === 429) status429.add(1, { endpoint: name });
    else if (res.status >= 500) status5xx.add(1, { endpoint: name });
    else if (res.status >= 400) status4xx.add(1, { endpoint: name });
    else statusOther.add(1, { endpoint: name, code: String(res.status) });
    // 처음 5개 실패만 상세 로깅 (과도한 출력 방지)
    if (__ITER < 3 && __VU <= 3) {
      console.log(`[FAIL] ${name} status=${res.status} body=${(res.body || '').slice(0, 120)}`);
    }
  }
  return ok;
}

// 홈 진입 플로우 — 배너 + 인기매물
export function homeFlow() {
  group('home', () => {
    const res = http.get(`${BASE_URL}/api/banners`, { tags: { name: 'banners' }, headers: defaultHeaders() });
    checkAndTrack(res, 'banners');

    const hot = http.get(`${BASE_URL}/api/home/hot-deals`, { tags: { name: 'hot-deals' }, headers: defaultHeaders() });
    checkAndTrack(hot, 'hot-deals');

    sleep(randomBetween(1, 3));
  });
}

// 중고매물 검색 → 상세 플로우
export function usedBrowseFlow() {
  group('used-browse', () => {
    // 1) 목록 조회
    const list = http.get(`${BASE_URL}/api/products?category=used&limit=12`, { tags: { name: 'products-list' }, headers: defaultHeaders() });
    checkAndTrack(list, 'products-list');

    // 2) 목록에서 랜덤 아이템 하나 골라서 상세 조회 (있으면)
    try {
      const data = list.json();
      const products = Array.isArray(data) ? data : (data.products || data.items || []);
      if (products.length > 0) {
        const pick = products[Math.floor(Math.random() * products.length)];
        if (pick && pick.id) {
          sleep(randomBetween(1, 2));
          const detail = http.get(`${BASE_URL}/api/products/${pick.id}`, { tags: { name: 'product-detail' }, headers: defaultHeaders() });
          checkAndTrack(detail, 'product-detail');
        }
      }
    } catch { /* ignore parse error */ }

    sleep(randomBetween(1, 3));
  });
}

// 카테고리 페이지들 (렌탈/레슨/숙소/스키샵)
export function categoryBrowseFlow() {
  const categories = [
    { path: '/api/rentals', name: 'rentals' },
    { path: '/api/lessons', name: 'lessons' },
    { path: '/api/accommodations', name: 'accommodations' },
    { path: '/api/ski-shops', name: 'ski-shops' },
  ];
  const pick = categories[Math.floor(Math.random() * categories.length)];

  group('category-browse', () => {
    const res = http.get(`${BASE_URL}${pick.path}`, { tags: { name: pick.name }, headers: defaultHeaders() });
    checkAndTrack(res, pick.name);
    sleep(randomBetween(1, 2));
  });
}

// 검색 플로우
export function searchFlow() {
  const queries = ['버튼', '스키', '보드', '부츠', '헬멧', '강남', '용평'];
  const q = queries[Math.floor(Math.random() * queries.length)];

  group('search', () => {
    const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}`, { tags: { name: 'search' }, headers: defaultHeaders() });
    checkAndTrack(res, 'search');
    sleep(randomBetween(1, 2));
  });
}

// Health check (스모크 전용)
export function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`, { tags: { name: 'health' }, headers: defaultHeaders() });
  checkAndTrack(res, 'health');
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
