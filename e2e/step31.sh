#!/bin/bash
# STEP 31: 검색 자동완성 (2026-09-25) — 매장·매물·리조트 이름 앞부분 일치 우선, 최대 8개, 빈 검색어 [], 이상한 입력 안전
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
echo "===== STEP 31: 검색 자동완성 ====="
OWNER=$(register_verified "01099990311" "sg_owner@s31.test" "완성사장" "완성사장"); [ -z "$OWNER" ] && OWNER=$(login "sg_owner@s31.test" 'Re!pass1234')
ADM=$(register_verified "01099990315" "sg_admin@s31.test" "완성관리자" "완성관리자")
pq "UPDATE users SET role='admin' WHERE email='sg_admin@s31.test'" >/dev/null
ADM=$(login "sg_admin@s31.test" 'Re!pass1234')
api POST /rentals '{"name":"자동완성렌탈샵","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; R1=$(echo "$RESP" | jq -r '.id // empty'); api PUT "/admin/rentals/$R1/approve" "{}" "$ADM"
api POST /rentals '{"name":"미승인자동완성","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; R2=$(echo "$RESP" | jq -r '.id // empty')
[ -n "$R1" ] && [ -n "$R2" ] && ok "렌탈 2개(승인 1, 미승인 1)" || bad "렌탈 준비 실패"
api GET "/search/suggest?q=" ""; [ "$CODE" = "200" ] && [ "$RESP" = "[]" ] && ok "빈 검색어 → []" || bad "빈 검색어 CODE=$CODE RESP=$RESP"
api GET "/search/suggest?q=%EC%9E%90%EB%8F%99%EC%99%84%EC%84%B1" ""; N=$(echo "$RESP" | jq 'length'); HAS=$(echo "$RESP" | jq -r '[.[] | select(.text=="자동완성렌탈샵")] | length'); NOAPP=$(echo "$RESP" | jq -r '[.[] | select(.text=="미승인자동완성")] | length'); T=$(echo "$RESP" | jq -r '[.[] | select(.text=="자동완성렌탈샵")][0].type')
[ "$CODE" = "200" ] && [ "$HAS" = "1" ] && [ "$NOAPP" = "0" ] && [ "$T" = "rental" ] && [ "$N" -le 8 ] && ok "'자동완성' → 승인 렌탈만, type=rental, 8개 이하" || bad "suggest CODE=$CODE n=$N has=$HAS noapp=$NOAPP type=$T"
api GET "/search/suggest?q=%EB%A0%8C%ED%83%88%EC%83%B5" ""; FIRST=$(echo "$RESP" | jq -r '.[0].text'); echo "$RESP" | jq -r '.[].text' | grep -q "자동완성렌탈샵" && ok "부분 일치('렌탈샵')도 찾음" || bad "부분 일치 실패 RESP=$(echo $RESP | head -c 120)"
api GET "/search/suggest?q=%EC%9A%A9%ED%8F%89" ""; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.[0].type')" = "resort" ] && ok "'용평' → 리조트가 먼저" || bad "리조트 우선 RESP=$(echo $RESP | head -c 120)"
api GET "/search/suggest?q=%27%3B%20DROP%20TABLE%20users%3B%20--" ""; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq 'length')" = "0" ] && ok "이상한 입력 → 빈 결과, 200" || bad "이상한 입력 CODE=$CODE"
api GET "/search/suggest?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('가'*100))")" ""; [ "$CODE" = "200" ] && ok "긴 입력(100자) 200 (40자로 잘라 처리)" || bad "긴 입력 CODE=$CODE"
api GET "/search/suggest?q=a&q=b" ""; [ "$CODE" = "200" ] && ok "q 배열 전달 200" || bad "q 배열 CODE=$CODE"
echo "----- STEP31: PASS=$PASS FAIL=$FAIL -----"
