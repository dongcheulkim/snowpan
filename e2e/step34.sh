#!/bin/bash
# STEP 34: 중고 매물 기록 보관 (2026-09-26) — 지워도 행은 남고(deletedAt) 화면에서만 숨김. 목록·상세·검색·찜에서 사라지고, 관리자 지운 기록 조회에 보임. 탈퇴해도 행 유지.
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
echo "===== STEP 34: 중고 매물 기록 보관 ====="
SELLER=$(register_verified "01099990341" "pd_seller@s34.test" "기록판매자" "기록판매자"); [ -z "$SELLER" ] && SELLER=$(login "pd_seller@s34.test" 'Re!pass1234')
BUYER=$(register_verified "01099990342" "pd_buyer@s34.test" "기록구매자" "기록구매자"); [ -z "$BUYER" ] && BUYER=$(login "pd_buyer@s34.test" 'Re!pass1234')
ADM=$(register_verified "01099990345" "pd_admin@s34.test" "기록관리자" "기록관리자")
pq "UPDATE users SET role='admin' WHERE email='pd_admin@s34.test'" >/dev/null
ADM=$(login "pd_admin@s34.test" 'Re!pass1234')
[ -n "$SELLER" ] && [ -n "$BUYER" ] && [ -n "$ADM" ] && ok "유저 준비" || bad "유저 준비 실패"
IMG="https://snowpankr.b-cdn.net/snowpan/202609/e2e34aaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"
api GET /auth/profile "" "$SELLER"; SELLER_ID=$(echo "$RESP" | jq -r '.id // .user.id // empty')
api POST /products/used "{\"name\":\"기록보관 테스트 스키 34\",\"brand\":\"E2E\",\"price\":123000,\"category\":\"ski\",\"condition\":\"good\",\"description\":\"E2E34\",\"image\":\"$IMG\",\"location\":\"서울\"}" "$SELLER"
PID=$(echo "$RESP" | jq -r '.id // .product.id // empty'); [ "$CODE" = "201" ] || [ "$CODE" = "200" ] && [ -n "$PID" ] && ok "매물 등록 ($PID)" || bad "등록 CODE=$CODE RESP=$(echo $RESP | head -c 200)"
api POST "/products/$PID/wishlist" "" "$BUYER"; [ "$CODE" = "200" ] || [ "$CODE" = "201" ] && ok "구매자 찜" || bad "찜 CODE=$CODE RESP=$(echo $RESP | head -c 120)"
api DELETE "/products/$PID" "" "$SELLER"; [ "$CODE" = "200" ] && ok "판매자 삭제 200" || bad "삭제 CODE=$CODE RESP=$RESP"
ROW=$(pq "SELECT count(*) FROM products WHERE id='$PID' AND \"deletedAt\" IS NOT NULL"); [ "$ROW" = "1" ] && ok "DB 행은 남고 deletedAt 기록" || bad "DB 행 ROW=$ROW"
api GET "/products/$PID" ""; [ "$CODE" = "404" ] && ok "상세 404 (숨김)" || bad "상세 CODE=$CODE"
api GET "/products?limit=100" ""; echo "$RESP" | grep -q "$PID" && bad "목록에 아직 보임" || ok "목록에서 사라짐"
api GET "/search?q=%EA%B8%B0%EB%A1%9D%EB%B3%B4%EA%B4%80" ""; echo "$RESP" | grep -q "$PID" && bad "검색에 아직 보임" || ok "검색에서 사라짐"
api GET "/products/wishlist" "" "$BUYER"; [ "$CODE" = "200" ] && ! echo "$RESP" | grep -q "$PID" && ok "구매자 찜 목록에서 사라짐" || bad "찜 목록 CODE=$CODE $(echo $RESP | head -c 120)"
api GET "/products?userId=$SELLER_ID&limit=100" "" "$SELLER"; [ "$CODE" = "200" ] && ! echo "$RESP" | grep -q "$PID" && ok "판매자 판매내역에서 사라짐" || bad "판매내역 CODE=$CODE $(echo $RESP | head -c 120)"
api GET "/admin/products/deleted?q=$PID" "" "$SELLER"; [ "$CODE" = "403" ] && ok "지운 기록 조회 비관리자 403" || bad "비관리자 CODE=$CODE"
api GET "/admin/products/deleted?q=$PID" "" "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.items[0].id')" = "$PID" ] && [ "$(echo "$RESP" | jq -r '.items[0].user.email')" = "pd_seller@s34.test" ] && [ "$(echo "$RESP" | jq -r '.items[0].image')" = "$IMG" ] && ok "관리자 지운 기록 조회 (판매자·사진 포함)" || bad "관리자 조회 CODE=$CODE RESP=$(echo $RESP | head -c 200)"
# 탈퇴해도 행 유지
api POST /products/used "{\"name\":\"기록보관 테스트 보드 34\",\"brand\":\"E2E\",\"price\":99000,\"category\":\"board\",\"condition\":\"good\",\"description\":\"E2E34b\",\"image\":\"$IMG\",\"location\":\"서울\"}" "$SELLER"
PID2=$(echo "$RESP" | jq -r '.id // .product.id // empty'); [ -n "$PID2" ] && ok "두 번째 매물 등록" || bad "두 번째 등록 CODE=$CODE"
api DELETE /auth/account '{"password":"Re!pass1234"}' "$SELLER"; [ "$CODE" = "200" ] && ok "판매자 탈퇴 200" || bad "탈퇴 CODE=$CODE RESP=$(echo $RESP | head -c 150)"
ROW2=$(pq "SELECT count(*) FROM products WHERE id IN ('$PID','$PID2')"); [ "$ROW2" = "2" ] && ok "탈퇴 후에도 매물 행 2개 유지" || bad "탈퇴 후 행 ROW2=$ROW2"
api GET "/products/$PID2" ""; [ "$CODE" = "404" ] && ok "탈퇴자 매물 상세 404 (숨김)" || bad "탈퇴자 매물 CODE=$CODE"
echo "----- STEP34: PASS=$PASS FAIL=$FAIL -----"
