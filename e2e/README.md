# Snowpan E2E 테스트

로컬 전용 통합 테스트 — 프로덕션 DB/서버를 절대 건드리지 않는다.
격리된 Postgres(`~/.snowpan-e2e/pgdata`, 포트 5433)와 로컬 백엔드(포트 4001, DATABASE_URL 강제 주입)로 실행.

## 실행

```bash
./e2e/run.sh        # 전체 (DB 초기화 후 step1~10, 100+ 케이스)
./e2e/run.sh 9      # 특정 스텝만 (state 재사용, DB 초기화 안 함)
```

필요: `brew install postgresql@16`, `jq`, backend `npm install` 완료 상태.

## 스텝 구성

| 스텝 | 내용 |
|---|---|
| 1 | 회원가입 → 로그인 → 프로필 (닉네임 표시) |
| 2 | 매물 등록 / 정렬 / 브랜드·길이 필터 |
| 3 | 상세조회 → 채팅 (REST + Socket.IO 실왕복) |
| 4 | 판매완료 → 리뷰 → 평점 → 중복 거부 |
| 5 | 매물 수정 — subcategory XSS / 가격·상태 |
| 6 | 찜하기 → 찜목록 → 알림 (소켓 수신) |
| 7 | 커뮤니티 글/댓글/좋아요 + 투표 |
| 8 | 회원 탈퇴 → 익명화 (공개 표면 실명 비노출) |
| 9 | 광고 흐름 — 신청→승인→프리미엄 자동적용→클릭 추적→1년 계약 취소차단→배너 자동생성 |
| 10 | tokenVersion 세션 무효화 — 비번 변경 시 옛 토큰 즉시 거절 + 같은 초 재로그인 정상 |

## 구조

- `lib.sh` — 공용 헬퍼 (휴대폰 인증 우회 가입, 로그인, psql)
- `chat.js` / `chatnotif.js` — Socket.IO 실연결 헬퍼 (backend 의 socket.io-client 사용)
- `.state/` — 실행 간 상태 (토큰·ID·로그, gitignore)
- 시드 유지 테이블: `ski_resorts`(용평·곤지암 자동 시드)·`overseas_resorts`·`ad_slot_pricings` — 나머지는 전체 실행 시 초기화
