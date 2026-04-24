// 로드 테스트 — 실제 "평상시 트래픽" 시뮬레이션
// 50 VU로 5분 유지 → 일반적인 서비스 부하 수준
//
// 실행: k6 run load.js
// 더 낮게: k6 run -e MAX_VUS=20 load.js
// 더 높게: k6 run -e MAX_VUS=100 load.js

import { homeFlow, usedBrowseFlow, categoryBrowseFlow, searchFlow } from './flows.js';

const MAX_VUS = parseInt(__ENV.MAX_VUS || '50', 10);

export const options = {
  stages: [
    { duration: '30s', target: Math.ceil(MAX_VUS * 0.2) }, // 워밍업
    { duration: '30s', target: Math.ceil(MAX_VUS * 0.6) }, // 증가
    { duration: '3m', target: MAX_VUS },                    // 유지
    { duration: '30s', target: 0 },                         // 쿨다운
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],  // 5% 이상 실패 = FAIL
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    errors: ['count<50'],
  },
};

// 실제 사용자 행동 가중치:
// 40% 홈 → 중고매물 탐색
// 30% 홈 → 카테고리 둘러보기
// 20% 검색
// 10% 그냥 홈만 보고 이탈
export default function () {
  const r = Math.random();
  if (r < 0.4) {
    homeFlow();
    usedBrowseFlow();
  } else if (r < 0.7) {
    homeFlow();
    categoryBrowseFlow();
  } else if (r < 0.9) {
    searchFlow();
    usedBrowseFlow();
  } else {
    homeFlow();
  }
}
