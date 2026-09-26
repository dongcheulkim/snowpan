#!/bin/bash
# STEP 35: 관리자 열람 기록 + 보관 기간 만료 자동 파기 (2026-09-26)
# - 지운 매물 기록·로그인 기록 조회 시 열람 기록, 열람 기록 목록 조회(관리자만)
# - 파기: 탈퇴 5년 지난 회원 원래 신원 삭제, 지운 지 5년 지난 매물 완전 삭제, 2년 지난 열람 기록 삭제. 기간 안 지난 건 그대로.
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
api() {
  local method=$1 path=$2 body=$3 token=$4
  local hdr=(-H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json')
  [ -n "$token" ] && hdr+=(-H "Authorization: Bearer $token")
  local out
  if [ -n "$body" ]; then out=$(curl -s -m 20 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path" -d "$body")
  else out=$(curl -s -m 20 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path"); fi
  CODE=$(printf '%s' "$out" | tail -n1); RESP=$(printf '%s' "$out" | sed '$d')
}
echo "===== STEP 35: 열람 기록 + 자동 파기 ====="
OLD=$(register_verified "01099990351" "rt_old@s35.test" "오래된탈퇴" "오래된탈퇴"); [ -z "$OLD" ] && OLD=$(login "rt_old@s35.test" 'Re!pass1234')
NEW=$(register_verified "01099990352" "rt_new@s35.test" "최근탈퇴" "최근탈퇴"); [ -z "$NEW" ] && NEW=$(login "rt_new@s35.test" 'Re!pass1234')
USER=$(register_verified "01099990353" "rt_user@s35.test" "일반회원35" "일반회원35"); [ -z "$USER" ] && USER=$(login "rt_user@s35.test" 'Re!pass1234')
ADM=$(register_verified "01099990355" "rt_admin@s35.test" "파기관리자" "파기관리자")
pq "UPDATE users SET role='admin' WHERE email='rt_admin@s35.test'" >/dev/null
ADM=$(login "rt_admin@s35.test" 'Re!pass1234')
[ -n "$OLD" ] && [ -n "$NEW" ] && [ -n "$USER" ] && [ -n "$ADM" ] && ok "유저 준비" || bad "유저 준비 실패"
api GET /auth/profile "" "$OLD"; OLD_ID=$(echo "$RESP" | jq -r '.id // .user.id')
api GET /auth/profile "" "$NEW"; NEW_ID=$(echo "$RESP" | jq -r '.id // .user.id')
IMG="https://snowpankr.b-cdn.net/snowpan/202609/e2e35aaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"
api POST /products/used "{\"name\":\"파기 테스트 매물 35\",\"brand\":\"E2E\",\"price\":50000,\"category\":\"ski\",\"condition\":\"good\",\"description\":\"E2E35\",\"image\":\"$IMG\",\"location\":\"서울\"}" "$OLD"
P_OLD=$(echo "$RESP" | jq -r '.id // .product.id // empty')
api POST /products/used "{\"name\":\"최근 삭제 매물 35\",\"brand\":\"E2E\",\"price\":60000,\"category\":\"board\",\"condition\":\"good\",\"description\":\"E2E35b\",\"image\":\"$IMG\",\"location\":\"서울\"}" "$OLD"
P_NEW=$(echo "$RESP" | jq -r '.id // .product.id // empty')
[ -n "$P_OLD" ] && [ -n "$P_NEW" ] && ok "매물 2개 등록" || bad "매물 등록 실패"
api DELETE "/products/$P_OLD" "" "$OLD"; api DELETE "/products/$P_NEW" "" "$OLD"
api DELETE /auth/account '{"password":"Re!pass1234"}' "$OLD"; [ "$CODE" = "200" ] && ok "오래된탈퇴 회원 탈퇴" || bad "탈퇴1 CODE=$CODE"
api DELETE /auth/account '{"password":"Re!pass1234"}' "$NEW"; [ "$CODE" = "200" ] && ok "최근탈퇴 회원 탈퇴" || bad "탈퇴2 CODE=$CODE"
# 열람 기록: 지운 매물 조회·로그인 기록 조회
api GET "/admin/products/deleted?q=35" "" "$ADM"; [ "$CODE" = "200" ] && ok "지운 매물 기록 조회" || bad "지운 매물 CODE=$CODE"
api GET "/admin/users/$NEW_ID/logins" "" "$ADM"; [ "$CODE" = "200" ] && ok "로그인 기록 조회" || bad "로그인 기록 CODE=$CODE"
api GET "/admin/users/$OLD_ID/identity" "" "$ADM"; [ "$CODE" = "200" ] && ok "원래 신원 조회" || bad "identity CODE=$CODE"
api GET "/admin/access-logs?limit=10" "" "$ADM"
[ "$CODE" = "200" ] && ACTS=$(echo "$RESP" | jq -r '[.items[].action] | unique | join(",")') && echo "$ACTS" | grep -q deleted_products_view && echo "$ACTS" | grep -q login_history_view && echo "$ACTS" | grep -q withdrawn_identity_view && [ "$(echo "$RESP" | jq -r '.items[0].admin.email')" = "rt_admin@s35.test" ] && ok "열람 기록 목록: 3종 기록 + 관리자 이름" || bad "열람 기록 목록 CODE=$CODE ACTS=$ACTS"
api GET "/admin/access-logs" "" "$USER"; [ "$CODE" = "403" ] && ok "열람 기록 비관리자 403" || bad "열람 기록 비관리자 CODE=$CODE"
# 시간 조작: 오래된탈퇴 → 6년 전 탈퇴, P_OLD → 6년 전 삭제, 열람 기록 하나 → 3년 전
pq "UPDATE users SET \"withdrawnAt\"=now()-interval '6 years' WHERE id='$OLD_ID'" >/dev/null
pq "UPDATE products SET \"deletedAt\"=now()-interval '6 years' WHERE id='$P_OLD'" >/dev/null
pq "UPDATE admin_access_logs SET \"createdAt\"=now()-interval '3 years' WHERE action='login_history_view' AND \"targetId\"='$NEW_ID'" >/dev/null
api POST /admin/jobs/retention-purge '{"at":"nope"}' "$ADM"; [ "$CODE" = "400" ] && ok "파기 잘못된 시각 400" || bad "파기 시각 CODE=$CODE"
api POST /admin/jobs/retention-purge '{}' "$USER"; [ "$CODE" = "403" ] && ok "파기 비관리자 403" || bad "파기 비관리자 CODE=$CODE"
api POST /admin/jobs/retention-purge '{}' "$ADM"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.identities')" = "1" ] && [ "$(echo "$RESP" | jq -r '.products')" = "1" ] && [ "$(echo "$RESP" | jq -r '.accessLogs')" = "1" ] && ok "파기 실행: 신원 1·매물 1·열람기록 1" || bad "파기 CODE=$CODE RESP=$RESP"
ROW=$(pq "SELECT COALESCE(\"withdrawnName\",'NULL')||'|'||COALESCE(\"withdrawnEmail\",'NULL')||'|'||COALESCE(\"withdrawnPhone\",'NULL')||'|'||role FROM users WHERE id='$OLD_ID'"); [ "$ROW" = "NULL|NULL|NULL|deleted" ] && ok "5년 지난 탈퇴 회원: 원래 신원 삭제, 행은 유지" || bad "오래된 신원 ROW=$ROW"
ROW=$(pq "SELECT COALESCE(\"withdrawnEmail\",'NULL') FROM users WHERE id='$NEW_ID'"); [ "$ROW" = "rt_new@s35.test" ] && ok "최근 탈퇴 회원: 원래 신원 유지" || bad "최근 신원 ROW=$ROW"
[ "$(pq "SELECT count(*) FROM products WHERE id='$P_OLD'")" = "0" ] && ok "5년 지난 지운 매물: 완전 삭제" || bad "오래된 매물 남음"
[ "$(pq "SELECT count(*) FROM products WHERE id='$P_NEW' AND \"deletedAt\" IS NOT NULL")" = "1" ] && ok "최근 지운 매물: 유지" || bad "최근 매물 사라짐"
[ "$(pq "SELECT count(*) FROM admin_access_logs WHERE action='login_history_view' AND \"targetId\"='$NEW_ID'")" = "0" ] && [ "$(pq "SELECT count(*) FROM admin_access_logs WHERE action='withdrawn_identity_view'")" -ge "1" ] && ok "2년 지난 열람 기록만 삭제" || bad "열람 기록 파기 불일치"
api POST /admin/jobs/retention-purge '{}' "$ADM"; [ "$(echo "$RESP" | jq -r '.identities + .products + .accessLogs')" = "0" ] && ok "다시 실행하면 0건" || bad "재실행 RESP=$RESP"
echo "----- STEP35: PASS=$PASS FAIL=$FAIL -----"
