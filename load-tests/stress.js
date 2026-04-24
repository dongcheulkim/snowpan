// 스트레스 테스트 — "이 서버가 몇 명까지 버티나?" 브레이킹 포인트 탐색
// 0 → 200 VU로 점진 증가, 어디서 에러율 급증하는지 관찰
//
// ⚠️  경고: 실제 프로덕션 백엔드에 부하 발생. Render 무료/Hobby 티어면 다른 사용자 영향 가능.
//    테스트 전에 알림받는 Render 팀원에게 공유하고, 밤/새벽 등 트래픽 적은 시간에 실행 권장.
//
// 실행: k6 run stress.js
// 더 공격적: k6 run -e MAX_VUS=500 stress.js

import { homeFlow, usedBrowseFlow, categoryBrowseFlow, searchFlow } from './flows.js';

const MAX_VUS = parseInt(__ENV.MAX_VUS || '200', 10);

export const options = {
  stages: [
    { duration: '1m', target: Math.ceil(MAX_VUS * 0.1) },  // 10%
    { duration: '2m', target: Math.ceil(MAX_VUS * 0.3) },  // 30%
    { duration: '2m', target: Math.ceil(MAX_VUS * 0.6) },  // 60%
    { duration: '2m', target: MAX_VUS },                    // 100%
    { duration: '2m', target: MAX_VUS },                    // 유지
    { duration: '1m', target: 0 },                          // 쿨다운
  ],
  thresholds: {
    // 스트레스라서 threshold 관대하게. 그냥 지표 관찰용.
    http_req_failed: ['rate<0.30'],   // 30% 이상 실패면 진짜 터진 것
    http_req_duration: ['p(95)<10000'],
  },
};

export default function () {
  const r = Math.random();
  if (r < 0.5) {
    homeFlow();
    usedBrowseFlow();
  } else if (r < 0.8) {
    homeFlow();
    categoryBrowseFlow();
  } else {
    searchFlow();
  }
}
