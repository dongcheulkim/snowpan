#!/bin/bash
# STEP 36: 외부 링크·사진·웹캠 자동 점검 (2026-10-02)
# - 관리자만 조회/실행, 실행하면 백그라운드로 돌고 결과(총수·죽은 목록·꺼진 웹캠)가 저장됨, 죽은 주소는 dead 로 잡힘
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
api() {
  local method=$1 path=$2 body=$3 token=$4
  local hdr=(-H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json')
  [ -n "$token" ] && hdr+=(-H "Authorization: Bearer $token")
  local out
  if [ -n "$body" ]; then out=$(curl -s -m 30 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path" -d "$body")
  else out=$(curl -s -m 30 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path"); fi
  CODE=$(printf '%s' "$out" | tail -n1); RESP=$(printf '%s' "$out" | sed '$d')
}
echo "===== STEP 36: 외부 링크 점검 ====="
USER=$(register_verified "01099990361" "lh_user@s36.test" "일반회원36" "일반회원36"); [ -z "$USER" ] && USER=$(login "lh_user@s36.test" 'Re!pass1234')
ADM=$(register_verified "01099990362" "lh_admin@s36.test" "점검관리자" "점검관리자")
pq "UPDATE users SET role='admin' WHERE email='lh_admin@s36.test'" >/dev/null
ADM=$(login "lh_admin@s36.test" 'Re!pass1234')
[ -n "$USER" ] && [ -n "$ADM" ] && ok "유저 준비" || bad "유저 준비 실패"
# 죽은 주소를 가진 배너 하나 심기 (DNS 없는 도메인) → dead 로 잡혀야 함
pq "INSERT INTO banners (id, title, description, tag, url, image, \"order\", active, \"createdAt\") VALUES (gen_random_uuid(), 'E2E 죽은 링크 배너 36', 'E2E', 'E2E', 'https://this-domain-does-not-exist-e2e36.invalid/', NULL, 99, true, now())" >/dev/null
api GET /admin/jobs/link-health "" "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 조회 거부" || bad "일반 조회 CODE=$CODE"
api GET /admin/jobs/link-health "" ""; [ "$CODE" = "401" ] && ok "비로그인 조회 거부" || bad "비로그인 CODE=$CODE"
api GET /admin/jobs/link-health "" "$ADM"; [ "$CODE" = "200" ] && ok "관리자 조회 (점검 전: $(echo "$RESP" | jq -r 'if .report==null then "기록 없음" else "기록 있음" end'))" || bad "관리자 조회 CODE=$CODE"
api POST /admin/jobs/link-health/run '{}' "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 실행 거부" || bad "일반 실행 CODE=$CODE"
api POST /admin/jobs/link-health/run '{}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.started')" = "true" ] && ok "점검 시작" || bad "점검 시작 CODE=$CODE RESP=$RESP"
DONE=0
for i in $(seq 1 60); do
  sleep 3; api GET /admin/jobs/link-health "" "$ADM"
  if [ "$(echo "$RESP" | jq -r '.running')" = "false" ] && [ "$(echo "$RESP" | jq -r '.report != null')" = "true" ]; then DONE=1; break; fi
done
[ "$DONE" = "1" ] && ok "점검 완료 ($(echo "$RESP" | jq -r '.report.durationMs')ms)" || bad "점검이 3분 안에 안 끝남"
[ "$(echo "$RESP" | jq -r '.report.total | has("links") and has("images") and has("streams")')" = "true" ] && ok "결과에 링크·사진·웹캠 총수" || bad "총수 없음"
[ "$(echo "$RESP" | jq -r '[.report.dead[] | select(.url | test("e2e36.invalid"))] | length')" -ge "1" ] && ok "DNS 없는 배너 링크를 죽음으로 분류" || bad "죽은 링크 못 잡음: $(echo "$RESP" | jq -c '.report.dead' | cut -c1-200)"
[ "$(echo "$RESP" | jq -r '.report | has("blocked") and has("offlineStreams") and has("unknown")')" = "true" ] && ok "차단·꺼진 웹캠·확인불가 목록 있음" || bad "목록 키 없음"
# 관리자 알림 생성됨 (새로 죽은 링크)
[ "$(pq "SELECT count(*) FROM notifications WHERE type='link_health'")" -ge "1" ] && ok "관리자에게 죽은 링크 알림" || bad "알림 없음"
# 저장 키
[ "$(pq "SELECT count(*) FROM admin_settings WHERE key='link_health_last'")" = "1" ] && ok "결과 저장(admin_settings)" || bad "저장 안 됨"
# 매장 정보 보강(네이버 키 없는 로컬에선 configured=false, 관리자만)
api POST /admin/jobs/shop-enrich '{"dryRun":true}' "$USER"; [ "$CODE" = "403" ] && ok "보강: 일반 회원 거부" || bad "보강 일반 CODE=$CODE"
api POST /admin/jobs/shop-enrich '{"dryRun":true}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.dryRun')" = "true" ] && [ "$(echo "$RESP" | jq -r 'has("plan") and has("unmatched") and has("configured")')" = "true" ] && ok "보강: 관리자 dryRun 응답 형식 (configured=$(echo "$RESP" | jq -r '.configured'))" || bad "보강 CODE=$CODE RESP=$RESP"
# 쿠팡 파트너스 카드 — 공개 목록, 관리자 등록(링크 검증), 클릭 집계, 삭제
api GET /coupang-ads "" ""; [ "$CODE" = "200" ] && ok "쿠팡 카드 공개 목록" || bad "쿠팡 목록 CODE=$CODE"
api POST /coupang-ads/admin '{"title":"E2E 고글","link":"https://link.coupang.com/a/e2e36","price":12345}' "$USER"; [ "$CODE" = "403" ] && ok "쿠팡 카드: 일반 회원 등록 거부" || bad "쿠팡 일반 CODE=$CODE"
api POST /coupang-ads/admin '{"title":"E2E 나쁜링크","link":"https://example.com/x"}' "$ADM"; [ "$CODE" = "400" ] && ok "쿠팡 카드: 쿠팡 아닌 링크 거부" || bad "링크검증 CODE=$CODE"
api POST /coupang-ads/admin '{"title":"E2E 고글","link":"https://link.coupang.com/a/e2e36","price":12345,"image":"https://snowpankr.b-cdn.net/x.jpg"}' "$ADM"; CP_ID=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && [ -n "$CP_ID" ] && ok "쿠팡 카드 등록" || bad "쿠팡 등록 CODE=$CODE RESP=$RESP"
api GET /coupang-ads "" ""; [ "$(echo "$RESP" | jq -r "[.[] | select(.id==\"$CP_ID\")] | length")" = "1" ] && [ "$(echo "$RESP" | jq -r ".[0] | has(\"clickCount\")")" = "false" ] && ok "공개 목록에 노출 (클릭수는 비공개)" || bad "공개 목록 불일치"
api POST "/coupang-ads/$CP_ID/click" "" ""; [ "$CODE" = "200" ] && [ "$(pq "SELECT \"clickCount\" FROM coupang_ads WHERE id='$CP_ID'")" = "1" ] && ok "클릭 집계" || bad "클릭 CODE=$CODE"
api PUT "/coupang-ads/admin/$CP_ID" '{"active":false}' "$ADM"; api GET /coupang-ads "" ""; [ "$(echo "$RESP" | jq -r "[.[] | select(.id==\"$CP_ID\")] | length")" = "0" ] && ok "숨김 처리 시 공개 목록에서 제외" || bad "숨김 실패"
api DELETE "/coupang-ads/admin/$CP_ID" "" "$ADM"; [ "$CODE" = "200" ] && ok "쿠팡 카드 삭제" || bad "삭제 CODE=$CODE"
# 피드 광고 슬롯이 문의형(셀프 신청 불가)인지
api POST /ad-booking/create '{"slotType":"feed","category":"used","title":"E2E","description":"E2E","url":"https://snowpan.kr","periodMonths":1,"payMethod":"transfer"}' "$USER"; [ "$CODE" = "403" ] || [ "$CODE" = "400" ] && ok "피드 광고 슬롯은 셀프 신청 불가 (CODE=$CODE)" || bad "피드 셀프신청 CODE=$CODE"
pq "DELETE FROM banners WHERE title='E2E 죽은 링크 배너 36'" >/dev/null
echo "----- STEP36: PASS=$PASS FAIL=$FAIL -----"
