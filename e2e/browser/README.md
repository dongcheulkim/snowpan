# 프로덕션 브라우저 검사 (Playwright, 실제 snowpan.kr)

스크래치패드가 세션마다 지워져서 여기 보관. playwright 는 `/Users/jason/bada-now/node_modules/playwright` 를 씀.

```bash
cd e2e/browser
export U_EMAIL=reviewer@snowpan.kr U_PW='Snowpan-Review-2026' A_EMAIL=help.snowpan@gmail.com A_PW='snowpan12!'
node full_audit.cjs   # 홈→카테고리(모든 버튼)→채팅→알림→알람→검색→마이→관리자 (~25분)
node chat_test.cjs    # 고객센터 왕복 + 대화 삭제(내 쪽만 숨김) + 새 메시지로 재표시
node guide_test.cjs   # 안내 메뉴 전수: 6 카테고리 × 소분류 22개 자동답변
python3 img_scan.py   # 최근 커뮤니티·프로필·중고 사진 용량 (800KB 초과 표시)
node write_flows.cjs  # 실제 쓰기: 글·댓글·수정·삭제, 신고, 차단·해제, 닉네임 변경·원복, 중고 등록·예약중·삭제 (끝나면 전부 정리)
python3 fuzz_api.py   # API 퍼징: 이상한 입력에 500·스크립트 반영 없는지 (Cloudflare 403 HTML 은 오탐)
node polish_check.cjs # 360/390/1280px 가로 스크롤·느린 API
node edge_check.cjs   # 비로그인 → /login?next=, 상세 찜 → next, 404 문구, 18개 경로 직접 진입(에러바운더리·가로스크롤)
node feature_check.cjs # 2026-09-17 기능: 시합 등록 폼, 리조트 후기 작성·삭제, 홈 카운트다운, 렌탈 가격 정렬·예약 문의 폼, 공유 카드(봇 UA), 관리자 설정·시합 승인 탭
node deep_feature_check.cjs # 데이터 없어 건너뛰는 흐름 실제 실행: 렌탈 예약 문의(소유자를 관리자로 가로채 고객센터 방으로) → 자동 전송, 판매완료 구매자 선택 창, 시합 신청 제출→관리자 삭제, 글·스키샵 공유 카드
node offline_check.cjs # SW precache 유지 + 진짜 오프라인 새로고침(방문/미방문=app-shell)·앱 내 이동 (BASE=http://localhost:4173 로 로컬 preview 도 가능)
```

- full_audit 과 chat_test/guide_test 는 같은 고객센터 방을 써서 **동시에 돌리면 안 됨**(순서대로).
- "탈퇴 안내" 검사는 마이 → 회원 탈퇴 창을 열고 취소함(실제 탈퇴 안 함). 찜은 추가 후 해제.
