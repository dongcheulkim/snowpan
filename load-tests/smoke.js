// 스모크 테스트 — "아무것도 깨지지 않았는지" 1분 확인
// 1 VU (가상 사용자) 1분 동안 모든 주요 엔드포인트 1~2회씩 히트
//
// 실행: k6 run smoke.js
// 커스텀 URL: BASE_URL=https://your-backend.example k6 run smoke.js

import { homeFlow, usedBrowseFlow, categoryBrowseFlow, searchFlow, healthCheck } from './flows.js';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],  // 1% 이상 실패 = FAIL
    http_req_duration: ['p(95)<2000'], // 95% 가 2초 이내
    errors: ['count<5'],
  },
};

export default function () {
  healthCheck();
  homeFlow();
  usedBrowseFlow();
  categoryBrowseFlow();
  searchFlow();
}
