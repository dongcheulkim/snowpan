#!/bin/bash
# STEP 27: 매장 찜 (2026-09-24) — 찜/해제/상태/찜 수/찜 목록, 소식 올리면 찜한 손님에게 알림(사장님·직원 제외), 없는 매장 404, 현황 찜 수
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
notif_count() { api GET "/notifications" "" "$1"; echo "$RESP" | jq -r "[.notifications[] | select(.title==\"$2\")] | length"; }

echo "===== STEP 27: 매장 찜 + 소식 알림 ====="
OWNER=$(register_verified "01099990271" "fl_owner@s27.test" "찜사장" "찜사장"); [ -z "$OWNER" ] && OWNER=$(login "fl_owner@s27.test" 'Re!pass1234')
STAFF=$(register_verified "01099990272" "fl_staff@s27.test" "찜직원" "찜직원"); [ -z "$STAFF" ] && STAFF=$(login "fl_staff@s27.test" 'Re!pass1234')
CUST=$(register_verified "01099990273" "fl_cust@s27.test" "찜손님" "찜손님"); [ -z "$CUST" ] && CUST=$(login "fl_cust@s27.test" 'Re!pass1234')
CUST2=$(register_verified "01099990274" "fl_cust2@s27.test" "찜손님둘" "찜손님둘"); [ -z "$CUST2" ] && CUST2=$(login "fl_cust2@s27.test" 'Re!pass1234')
ADM=$(register_verified "01099990275" "fl_admin@s27.test" "찜관리자" "찜관리자")
pq "UPDATE users SET role='admin' WHERE email='fl_admin@s27.test'" >/dev/null
ADM=$(login "fl_admin@s27.test" 'Re!pass1234')
IDS="'$(pq "SELECT id FROM users WHERE email='fl_owner@s27.test'")','$(pq "SELECT id FROM users WHERE email='fl_staff@s27.test'")','$(pq "SELECT id FROM users WHERE email='fl_cust@s27.test'")','$(pq "SELECT id FROM users WHERE email='fl_cust2@s27.test'")'"
pq "DELETE FROM notifications WHERE \"userId\" IN ($IDS)" >/dev/null; pq "DELETE FROM shop_follows WHERE \"userId\" IN ($IDS)" >/dev/null
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$CUST" ] && [ -n "$CUST2" ] && [ -n "$ADM" ] && ok "유저 5명 준비" || bad "유저 준비 실패"

api POST /rentals '{"name":"S27렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; RENTAL=$(echo "$RESP" | jq -r '.id // empty')
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && [ -n "$RENTAL" ] && ok "렌탈 등록·승인" || bad "렌탈 CODE=$CODE"
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty'); api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "201" ] && ok "직원 참여" || bad "직원 참여 CODE=$CODE"

# 상태(비로그인·로그인), 찜, 중복 찜, 찜 수
api GET "/shop-follows/status/rental/$RENTAL" ""; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.following')" = "false" ] && [ "$(echo "$RESP" | jq -r '.count')" = "0" ] && ok "비로그인 상태 조회: 찜 0" || bad "비로그인 상태 CODE=$CODE RESP=$RESP"
api POST "/shop-follows/rental/$RENTAL" "" "$CUST"; [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.following')" = "true" ] && [ "$(echo "$RESP" | jq -r '.count')" = "1" ] && ok "손님 찜 201 (찜 1)" || bad "찜 CODE=$CODE RESP=$RESP"
api POST "/shop-follows/rental/$RENTAL" "" "$CUST"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.count')" = "1" ] && ok "다시 찜해도 200, 수 그대로" || bad "중복 찜 CODE=$CODE RESP=$RESP"
api POST "/shop-follows/rental/$RENTAL" "" "$CUST2"; api POST "/shop-follows/rental/$RENTAL" "" "$STAFF"
api GET "/shop-follows/status/rental/$RENTAL" "" "$CUST"; [ "$(echo "$RESP" | jq -r '.following')" = "true" ] && [ "$(echo "$RESP" | jq -r '.count')" = "3" ] && ok "로그인 상태 조회: 찜함, 찜 3(손님 둘+직원)" || bad "상태 RESP=$RESP"
api GET "/shop-follows/mine" "" "$CUST"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r "[.[] | select(.shopId==\"$RENTAL\")][0].name")" = "S27렌탈" ] && [ "$(echo "$RESP" | jq -r "[.[] | select(.shopId==\"$RENTAL\")][0].path")" = "/rental/$RENTAL" ] && ok "찜 목록: 매장명·경로" || bad "찜 목록 CODE=$CODE RESP=$(echo $RESP | head -c 150)"
api POST "/shop-follows/rental/00000000-0000-0000-0000-000000000000" "" "$CUST"; [ "$CODE" = "404" ] && ok "없는 매장 찜 404" || bad "없는 매장 CODE=$CODE"
api POST "/shop-follows/rental/not-a-uuid" "" "$CUST"; [ "$CODE" = "400" ] && ok "잘못된 id 400" || bad "잘못된 id CODE=$CODE"
api POST "/shop-follows/rental/$RENTAL" ""; [ "$CODE" = "401" ] && ok "비로그인 찜 401" || bad "비로그인 찜 CODE=$CODE"

# 소식 올리면 찜한 손님에게 알림, 직원(찜했어도)·사장님은 제외
pq "DELETE FROM notifications WHERE \"userId\" IN ($IDS)" >/dev/null
api POST /shop-posts "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"title\":\"시즌 오픈 이벤트\",\"content\":\"찜 알림 테스트 소식이에요\"}" "$OWNER"; POST=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && ok "소식 등록" || bad "소식 CODE=$CODE"
sleep 1
[ "$(notif_count "$CUST" "S27렌탈 새 소식")" = "1" ] && [ "$(notif_count "$CUST2" "S27렌탈 새 소식")" = "1" ] && ok "찜한 손님 둘에게 새 소식 알림" || bad "손님 알림 c1=$(notif_count "$CUST" "S27렌탈 새 소식") c2=$(notif_count "$CUST2" "S27렌탈 새 소식")"
api GET /notifications "" "$CUST"; L=$(echo "$RESP" | jq -r '[.notifications[] | select(.title=="S27렌탈 새 소식")][0] | "\(.message)|\(.link)"'); [ "$L" = "시즌 오픈 이벤트|/shop-post/$POST" ] && ok "알림 내용=소식 제목, 링크=소식 페이지" || bad "알림 내용 $L"
[ "$(notif_count "$STAFF" "S27렌탈 새 소식")" = "0" ] && [ "$(notif_count "$OWNER" "S27렌탈 새 소식")" = "0" ] && ok "직원·사장님은 알림 없음" || bad "직원/사장님 알림 s=$(notif_count "$STAFF" "S27렌탈 새 소식") o=$(notif_count "$OWNER" "S27렌탈 새 소식")"

# 해제 후엔 알림 없음
api DELETE "/shop-follows/rental/$RENTAL" "" "$CUST2"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.following')" = "false" ] && [ "$(echo "$RESP" | jq -r '.count')" = "2" ] && ok "찜 해제 (찜 2)" || bad "해제 CODE=$CODE RESP=$RESP"
api POST /shop-posts "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"title\":\"두 번째 소식\",\"content\":\"해제한 손님은 못 받아요\"}" "$OWNER"; sleep 1
[ "$(notif_count "$CUST" "S27렌탈 새 소식")" = "2" ] && [ "$(notif_count "$CUST2" "S27렌탈 새 소식")" = "1" ] && ok "해제한 손님은 새 소식 알림 없음" || bad "해제 후 알림 c1=$(notif_count "$CUST" "S27렌탈 새 소식") c2=$(notif_count "$CUST2" "S27렌탈 새 소식")"
api GET "/shop-follows/mine" "" "$CUST2"; [ "$(echo "$RESP" | jq -r "[.[] | select(.shopId==\"$RENTAL\")] | length")" = "0" ] && ok "해제하면 목록에서 빠짐" || bad "해제 후 목록에 남음"

# 사장님 현황에 찜 수
api GET /owner/summary "" "$OWNER"; [ "$(echo "$RESP" | jq -r "[.shops[] | select(.shopId==\"$RENTAL\")][0].followers")" = "2" ] && ok "현황 매장별 찜 2" || bad "현황 찜 수=$(echo "$RESP" | jq -r "[.shops[] | select(.shopId==\"$RENTAL\")][0].followers")"
# 매장을 지우면 찜·직원·답장 문구·답장 속도 행이 같이 정리된다
api POST "/shop-replies/shops/rental/$RENTAL" '{"text":"정리 검사용 문구"}' "$OWNER"
api DELETE "/rentals/$RENTAL" "" "$OWNER"; [ "$CODE" = "200" ] && ok "렌탈 삭제" || bad "렌탈 삭제 CODE=$CODE"; sleep 1
LEFT=$(pq "SELECT (SELECT count(*) FROM shop_follows WHERE \"shopId\"='$RENTAL') + (SELECT count(*) FROM shop_staff WHERE \"shopId\"='$RENTAL') + (SELECT count(*) FROM shop_reply_templates WHERE \"shopId\"='$RENTAL') + (SELECT count(*) FROM chat_room_shops WHERE \"shopId\"='$RENTAL')")
[ "$LEFT" = "0" ] && ok "삭제된 매장의 찜·직원·문구·채팅 연결 0" || bad "남은 행 $LEFT"
api GET "/shop-follows/mine" "" "$CUST"; [ "$(echo "$RESP" | jq -r "[.[] | select(.shopId==\"$RENTAL\")] | length")" = "0" ] && ok "찜 목록에서도 사라짐" || bad "찜 목록에 남음"
# 고아 행 정리 작업 — 직접 남긴 고아 행이 지워지는지
pq "INSERT INTO shop_follows (id, \"shopType\", \"shopId\", \"userId\") VALUES (gen_random_uuid()::text, 'rental', '$RENTAL', '$(pq "SELECT id FROM users WHERE email='fl_cust@s27.test'")')" >/dev/null
api POST /admin/jobs/cleanup-shop-rows "{}" "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.removed')" -ge 1 ] && [ "$(pq "SELECT count(*) FROM shop_follows WHERE \"shopId\"='$RENTAL'")" = "0" ] && ok "관리자 고아 행 정리 작업" || bad "고아 정리 CODE=$CODE RESP=$RESP left=$(pq "SELECT count(*) FROM shop_follows WHERE \"shopId\"='$RENTAL'")"
echo "----- STEP27: PASS=$PASS FAIL=$FAIL -----"
