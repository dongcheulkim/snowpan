// 공통 사용자 플로우 — 스모크/로드/스트레스 시나리오가 함께 사용.
// 실제 프로덕션 DB에 쓰기 작업을 하지 않는 "읽기 전용" 플로우만 정의.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// 기본 엔드포인트 (env로 오버라이드 가능)
export const BASE_URL = __ENV.BASE_URL || 'https://snowpan.onrender.com';

// 엔드포인트별 응답 시간 추적 (대시보드에서 어떤 API가 느린지 확인용)
export const pageLoadTrend = new Trend('page_load_time', true);
export const errorCount = new Counter('errors');

function checkAndTrack(res, name, expectedStatus = 200) {
  const ok = check(res, {
    [`${name} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name} body non-empty`]: (r) => (r.body || '').length > 0,
  });
  pageLoadTrend.add(res.timings.duration, { endpoint: name });
  if (!ok) errorCount.add(1, { endpoint: name });
  return ok;
}

// 홈 진입 플로우 — 배너 + 인기매물
export function homeFlow() {
  group('home', () => {
    const res = http.get(`${BASE_URL}/api/banners`, { tags: { name: 'banners' } });
    checkAndTrack(res, 'banners');

    const hot = http.get(`${BASE_URL}/api/home/hot-deals`, { tags: { name: 'hot-deals' } });
    checkAndTrack(hot, 'hot-deals');

    sleep(randomBetween(1, 3));
  });
}

// 중고매물 검색 → 상세 플로우
export function usedBrowseFlow() {
  group('used-browse', () => {
    // 1) 목록 조회
    const list = http.get(`${BASE_URL}/api/products?category=used&limit=12`, { tags: { name: 'products-list' } });
    checkAndTrack(list, 'products-list');

    // 2) 목록에서 랜덤 아이템 하나 골라서 상세 조회 (있으면)
    try {
      const data = list.json();
      const products = Array.isArray(data) ? data : (data.products || data.items || []);
      if (products.length > 0) {
        const pick = products[Math.floor(Math.random() * products.length)];
        if (pick && pick.id) {
          sleep(randomBetween(1, 2));
          const detail = http.get(`${BASE_URL}/api/products/${pick.id}`, { tags: { name: 'product-detail' } });
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
    const res = http.get(`${BASE_URL}${pick.path}`, { tags: { name: pick.name } });
    checkAndTrack(res, pick.name);
    sleep(randomBetween(1, 2));
  });
}

// 검색 플로우
export function searchFlow() {
  const queries = ['버튼', '스키', '보드', '부츠', '헬멧', '강남', '용평'];
  const q = queries[Math.floor(Math.random() * queries.length)];

  group('search', () => {
    const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}`, { tags: { name: 'search' } });
    checkAndTrack(res, 'search');
    sleep(randomBetween(1, 2));
  });
}

// Health check (스모크 전용)
export function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`, { tags: { name: 'health' } });
  checkAndTrack(res, 'health');
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
