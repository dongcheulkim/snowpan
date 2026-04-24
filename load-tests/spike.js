// 스파이크 테스트 — 갑자기 트래픽 폭증 시 복구력 확인
// 마케팅 푸시나 바이럴 공유 후 수 분간 동시 유입 시뮬레이션
//
// 실행: k6 run spike.js

import { homeFlow, usedBrowseFlow } from './flows.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },    // 평상시
    { duration: '10s', target: 150 },  // 급증 💥
    { duration: '1m', target: 150 },   // 유지
    { duration: '10s', target: 5 },    // 복구
    { duration: '30s', target: 5 },    // 평상시 복귀
  ],
  thresholds: {
    http_req_failed: ['rate<0.20'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  homeFlow();
  if (Math.random() < 0.5) usedBrowseFlow();
}
