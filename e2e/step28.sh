#!/bin/bash
# STEP 28: 정비샵 작업 현황 (2026-09-24) — 확정된 정비 예약에서 사장님·직원이 접수→작업 중→완료를 누르면 손님 알림 + 채팅 카드. 손님·미확정·정비 아님·잘못된 값 거부
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

echo "===== STEP 28: 정비샵 작업 현황 ====="
OWNER=$(register_verified "01099990281" "wk_owner@s28.test" "정비사장" "정비사장"); [ -z "$OWNER" ] && OWNER=$(login "wk_owner@s28.test" 'Re!pass1234')
STAFF=$(register_verified "01099990282" "wk_staff@s28.test" "정비직원" "정비직원"); [ -z "$STAFF" ] && STAFF=$(login "wk_staff@s28.test" 'Re!pass1234')
CUST=$(register_verified "01099990283" "wk_cust@s28.test" "정비손님" "정비손님"); [ -z "$CUST" ] && CUST=$(login "wk_cust@s28.test" 'Re!pass1234')
ADM=$(register_verified "01099990285" "wk_admin@s28.test" "정비관리자" "정비관리자")
pq "UPDATE users SET role='admin' WHERE email='wk_admin@s28.test'" >/dev/null
ADM=$(login "wk_admin@s28.test" 'Re!pass1234')
CUST_ID=$(pq "SELECT id FROM users WHERE email='wk_cust@s28.test'")
pq "DELETE FROM notifications WHERE \"userId\"='$CUST_ID'" >/dev/null
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$CUST" ] && [ -n "$ADM" ] && ok "유저 4명 준비" || bad "유저 준비 실패"

api POST /repair-shops "{\"name\":\"S28정비\",\"area\":\"강원\",\"address\":\"평창\",\"description\":\"왁싱 전문\",\"businessLicense\":\"/uploads/e2e.jpg\",\"resortId\":\"$YONGPYONG\"}" "$OWNER"; RS=$(echo "$RESP" | jq -r '.id // empty')
api PUT "/admin/repair-shops/$RS/approve" "{}" "$ADM"; [ "$CODE" = "200" ] || pq "UPDATE repair_shops SET approved=true WHERE id='$RS'" >/dev/null
[ -n "$RS" ] && [ "$(pq "SELECT approved FROM repair_shops WHERE id='$RS'")" = "t" ] && ok "정비샵 등록·승인" || bad "정비샵 RS=$RS"
api POST "/shop-staff/shops/repair/$RS/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty'); api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "201" ] && ok "직원 참여" || bad "직원 참여 CODE=$CODE"
api POST /rentals '{"name":"S28렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; RENTAL=$(echo "$RESP" | jq -r '.id // empty'); api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"

D2=$(date -v+2d +%F 2>/dev/null || date -d '+2 days' +%F)
api POST /reservations "{\"shopType\":\"repair\",\"shopId\":\"$RS\",\"date\":\"$D2\",\"time\":\"10:00\",\"adults\":1,\"details\":{\"equipment\":\"스키\",\"qty\":1,\"options\":[\"왁싱\"]}}" "$CUST"; R=$(echo "$RESP" | jq -r '.reservation.id // empty'); ROOM=$(echo "$RESP" | jq -r '.roomId // empty')
[ "$CODE" = "201" ] && [ -n "$R" ] && ok "정비 예약 요청" || bad "정비 예약 CODE=$CODE"
api PUT "/reservations/$R/work-status" '{"status":"received"}' "$OWNER"; [ "$CODE" = "400" ] && ok "미확정 예약은 작업 현황 400" || bad "미확정 CODE=$CODE"
api PUT "/reservations/$R/confirm" '{}' "$OWNER"; [ "$CODE" = "200" ] && ok "확정" || bad "확정 CODE=$CODE"
api PUT "/reservations/$R/work-status" '{"status":"received"}' "$CUST"; [ "$CODE" = "403" ] && ok "손님은 작업 현황 403" || bad "손님 CODE=$CODE"
api PUT "/reservations/$R/work-status" '{"status":"flying"}' "$OWNER"; [ "$CODE" = "400" ] && ok "잘못된 값 400" || bad "잘못된 값 CODE=$CODE"
pq "DELETE FROM notifications WHERE \"userId\"='$CUST_ID'" >/dev/null
api PUT "/reservations/$R/work-status" '{"status":"received"}' "$OWNER"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.reservation.workStatus')" = "received" ] && ok "사장님: 접수" || bad "접수 CODE=$CODE RESP=$(echo $RESP | head -c 120)"
[ "$(notif_count "$CUST" "장비를 접수했어요")" = "1" ] && ok "손님 알림: 장비를 접수했어요" || bad "접수 알림 없음"
api PUT "/reservations/$R/work-status" '{"status":"received"}' "$OWNER"; [ "$CODE" = "400" ] && ok "같은 상태 다시 400" || bad "같은 상태 CODE=$CODE"
api PUT "/reservations/$R/work-status" '{"status":"working"}' "$STAFF"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.reservation.workStatus')" = "working" ] && ok "직원: 작업 중" || bad "직원 작업 중 CODE=$CODE"
[ "$(notif_count "$CUST" "작업 중이에요")" = "1" ] && ok "손님 알림: 작업 중" || bad "작업 중 알림 없음"
api PUT "/reservations/$R/work-status" '{"status":"done"}' "$OWNER"; [ "$CODE" = "200" ] && ok "사장님: 완료" || bad "완료 CODE=$CODE"
api GET /notifications "" "$CUST"; M=$(echo "$RESP" | jq -r '[.notifications[] | select(.title=="작업이 끝났어요")][0].message // empty'); echo "$M" | grep -q "S28정비: 작업이 끝났어요. 찾아가세요." && ok "손님 알림: 작업이 끝났어요, 찾아가세요" || bad "완료 알림 '$M'"
api GET "/chat/rooms/$ROOM/messages" "" "$CUST"; N=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation") | .content | fromjson | select(.event=="work_received" or .event=="work_working" or .event=="work_done")] | length'); WS=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")] | last | .content | fromjson | .workStatus')
[ "$N" = "3" ] && [ "$WS" = "done" ] && ok "채팅 카드 3장 (접수·작업 중·완료), 마지막 카드 workStatus=done" || bad "카드 n=$N ws=$WS"
api GET "/reservations/$R" "" "$CUST"; [ "$(echo "$RESP" | jq -r '.workStatus')" = "done" ] && [ "$(echo "$RESP" | jq -r '.viewerRole')" = "customer" ] && ok "예약 조회에 workStatus·viewerRole" || bad "예약 조회 $(echo $RESP | jq -c '{workStatus,viewerRole}')"
# 정비가 아닌 예약엔 없음
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$D2\",\"adults\":1}" "$CUST"; R2=$(echo "$RESP" | jq -r '.reservation.id // empty'); api PUT "/reservations/$R2/confirm" '{}' "$OWNER"
api PUT "/reservations/$R2/work-status" '{"status":"received"}' "$OWNER"; [ "$CODE" = "400" ] && ok "렌탈 예약엔 작업 현황 400" || bad "렌탈 CODE=$CODE"
echo "----- STEP28: PASS=$PASS FAIL=$FAIL -----"
