# 스노우판 부하 테스트 (k6)

로컬에서 실제 프로덕션 백엔드를 대상으로 부하 테스트를 실행합니다.

## 설치
```bash
brew install k6
```

## 시나리오

| 파일 | 목적 | 동시 사용자 | 소요 |
|---|---|---|---|
| `smoke.js` | 배포 직후 헬스체크 (CI 용) | 1 VU | 1분 |
| `load.js` | 평상시 부하 (50명 유지) | 50 VU | 5분 |
| `stress.js` | 브레이킹 포인트 탐색 | 최대 200 VU | 10분 |
| `spike.js` | 급증 트래픽 시뮬레이션 | 150 VU 버스트 | 2분 |

## 실행

```bash
cd load-tests

# 기본 (프로덕션 백엔드 대상)
k6 run smoke.js
k6 run load.js
k6 run stress.js
k6 run spike.js

# VU 조정
k6 run -e MAX_VUS=20 load.js     # 소규모 테스트
k6 run -e MAX_VUS=500 stress.js  # 공격적 스트레스

# 로컬 백엔드 대상
BASE_URL=http://localhost:3000 k6 run smoke.js

# 결과를 JSON으로 저장 (그래프 분석용)
k6 run --out json=results.json load.js
```

## 확인할 지표

- **http_req_failed** — 에러율. `0.01 미만` 이상적, `0.05` 넘으면 문제
- **http_req_duration p(95)** — 사용자 95%의 응답 시간. `<2000ms` 목표
- **endpoint 태그별 상세** — `page_load_time` 메트릭에서 어떤 API가 느린지 확인
- **errors** — 우리가 기대한 status code 아닌 경우 카운트

## ⚠️ 주의사항

1. **프로덕션 DB에 쓰기 작업 없음** — 모든 플로우는 읽기 전용 (`GET` 만). 로그인/회원가입/상품등록은 테스트 안 함.
2. **Render 티어 확인**:
   - Free tier: 15분 idle 후 슬립 (첫 요청 30초 걸림)
   - Hobby ($7/mo): 512MB RAM / 0.5 CPU — **동시 100명 정도가 한계**
   - Starter ($25/mo): 2GB RAM / 1 CPU — 동시 500~1000명 가능
3. **Prisma 커넥션 풀**: 기본 10. 동접이 이보다 많으면 쿼리가 큐잉됨 → `DATABASE_URL`에 `?connection_limit=30` 추가해서 늘릴 수 있음
4. **실사용자 영향**: stress/spike는 실제 사용자 응답 지연 유발 가능. 트래픽 적은 시간 (새벽 2-6시) 권장

## 병목 해석 가이드

- **p95 응답 시간 > 3s** → Prisma 쿼리 N+1 문제 또는 인덱스 부재 의심
- **에러율 > 5%** → Render RAM/CPU 부족 (대시보드 Metrics 탭에서 확인)
- **`ECONNREFUSED` 대량 발생** → Render 재시작 중 (OOM kill)
- **health check는 빠른데 다른 API만 느림** → DB 연결 풀 포화
- **처음엔 빠르다가 점점 느려짐** → 메모리 누수 의심

## 다음 단계 제안

로드 테스트 후 결과에 따라:
- 응답 느린 엔드포인트 → 쿼리 최적화 + 캐싱 추가
- 에러율 높음 → Render 티어 업그레이드 또는 수평 확장
- DB 커넥션 고갈 → `connection_limit` 증가 또는 연결 풀러 (pgBouncer) 도입
