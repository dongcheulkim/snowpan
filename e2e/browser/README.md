# 프로덕션 브라우저 검사 (Playwright, 실제 snowpan.kr)

스크래치패드가 세션마다 지워져서 여기 보관. playwright 는 `/Users/jason/bada-now/node_modules/playwright` 를 씀.

```bash
cd e2e/browser
export U_EMAIL=reviewer@snowpan.kr U_PW='Snowpan-Review-2026' A_EMAIL=help.snowpan@gmail.com A_PW='snowpan12!'
node full_audit.cjs   # 홈→카테고리(모든 버튼)→채팅→알림→알람→검색→마이→관리자 (~25분)
node chat_test.cjs    # 고객센터 왕복 + 대화 삭제(내 쪽만 숨김) + 새 메시지로 재표시
node guide_test.cjs   # 안내 메뉴 전수: 6 카테고리 × 소분류 22개 자동답변
python3 img_scan.py   # 최근 커뮤니티·프로필·중고 사진 용량 (800KB 초과 표시)
```

- full_audit 과 chat_test/guide_test 는 같은 고객센터 방을 써서 **동시에 돌리면 안 됨**(순서대로).
- "탈퇴 안내" 검사는 마이 → 회원 탈퇴 창을 열고 취소함(실제 탈퇴 안 함). 찜은 추가 후 해제.
