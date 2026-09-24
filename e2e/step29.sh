#!/bin/bash
# STEP 29: 답장 문구 (2026-09-24) — 매장별 공유(사장님+직원) 저장/수정/삭제, 20개·500자 제한, 남·손님 403
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
echo "===== STEP 29: 답장 문구 ====="
OWNER=$(register_verified "01099990291" "rp_owner@s29.test" "문구사장" "문구사장"); [ -z "$OWNER" ] && OWNER=$(login "rp_owner@s29.test" 'Re!pass1234')
STAFF=$(register_verified "01099990292" "rp_staff@s29.test" "문구직원" "문구직원"); [ -z "$STAFF" ] && STAFF=$(login "rp_staff@s29.test" 'Re!pass1234')
CUST=$(register_verified "01099990293" "rp_cust@s29.test" "문구손님" "문구손님"); [ -z "$CUST" ] && CUST=$(login "rp_cust@s29.test" 'Re!pass1234')
ADM=$(register_verified "01099990295" "rp_admin@s29.test" "문구관리자" "문구관리자")
pq "UPDATE users SET role='admin' WHERE email='rp_admin@s29.test'" >/dev/null
ADM=$(login "rp_admin@s29.test" 'Re!pass1234')
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$CUST" ] && [ -n "$ADM" ] && ok "유저 4명 준비" || bad "유저 준비 실패"
api POST /rentals '{"name":"S29렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; RENTAL=$(echo "$RESP" | jq -r '.id // empty')
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && ok "렌탈 등록·승인" || bad "렌탈 CODE=$CODE"
pq "DELETE FROM shop_reply_templates WHERE \"shopId\"='$RENTAL'" >/dev/null
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty'); api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "201" ] && ok "직원 참여" || bad "직원 참여 CODE=$CODE"

api POST "/shop-replies/shops/rental/$RENTAL" '{"text":"영업시간은 오전 8시부터 저녁 8시까지예요."}' "$OWNER"; T1=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && [ -n "$T1" ] && ok "사장님 문구 저장 201" || bad "저장 CODE=$CODE RESP=$RESP"
api POST "/shop-replies/shops/rental/$RENTAL" '{"text":"주차는 매장 앞에 무료로 하실 수 있어요."}' "$STAFF"; T2=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && ok "직원도 문구 저장" || bad "직원 저장 CODE=$CODE"
api GET "/shop-replies/shops/rental/$RENTAL" "" "$STAFF"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq 'length')" = "2" ] && [ "$(echo "$RESP" | jq -r '.[0].text')" = "영업시간은 오전 8시부터 저녁 8시까지예요." ] && ok "목록 2개, 오래된 순" || bad "목록 CODE=$CODE n=$(echo "$RESP" | jq 'length')"
api GET "/shop-replies/shops/rental/$RENTAL" "" "$CUST"; [ "$CODE" = "403" ] && ok "손님은 목록 403" || bad "손님 목록 CODE=$CODE"
api POST "/shop-replies/shops/rental/$RENTAL" '{"text":"남의 매장"}' "$CUST"; [ "$CODE" = "403" ] && ok "손님 저장 403" || bad "손님 저장 CODE=$CODE"
api POST "/shop-replies/shops/rental/$RENTAL" '{"text":"   "}' "$OWNER"; [ "$CODE" = "400" ] && ok "빈 문구 400" || bad "빈 문구 CODE=$CODE"
LONG=$(python3 -c "print('가'*501)"); api POST "/shop-replies/shops/rental/$RENTAL" "{\"text\":\"$LONG\"}" "$OWNER"; [ "$CODE" = "400" ] && ok "501자 400" || bad "긴 문구 CODE=$CODE"
api PUT "/shop-replies/$T1" '{"text":"영업시간은 오전 9시부터 저녁 9시까지예요."}' "$STAFF"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.text')" = "영업시간은 오전 9시부터 저녁 9시까지예요." ] && ok "직원이 사장님 문구 수정" || bad "수정 CODE=$CODE"
api PUT "/shop-replies/$T1" '{"text":"해킹"}' "$CUST"; [ "$CODE" = "403" ] && ok "손님 수정 403" || bad "손님 수정 CODE=$CODE"
api DELETE "/shop-replies/$T2" "" "$OWNER"; [ "$CODE" = "200" ] && ok "삭제" || bad "삭제 CODE=$CODE"
api GET "/shop-replies/shops/rental/$RENTAL" "" "$OWNER"; [ "$(echo "$RESP" | jq 'length')" = "1" ] && ok "삭제 후 1개" || bad "삭제 후 n=$(echo "$RESP" | jq 'length')"
api DELETE "/shop-replies/$T2" "" "$OWNER"; [ "$CODE" = "404" ] && ok "지운 문구 다시 삭제 404" || bad "재삭제 CODE=$CODE"
for i in $(seq 2 20); do api POST "/shop-replies/shops/rental/$RENTAL" "{\"text\":\"문구 $i\"}" "$OWNER"; done
api GET "/shop-replies/shops/rental/$RENTAL" "" "$OWNER"; N=$(echo "$RESP" | jq 'length')
api POST "/shop-replies/shops/rental/$RENTAL" '{"text":"21번째"}' "$OWNER"; [ "$N" = "20" ] && [ "$CODE" = "400" ] && ok "20개 제한 (21번째 400)" || bad "제한 n=$N CODE=$CODE"
echo "----- STEP29: PASS=$PASS FAIL=$FAIL -----"
