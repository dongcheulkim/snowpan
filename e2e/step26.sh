#!/bin/bash
# STEP 26: 예약 자동 알림 (2026-09-24) — 전날 저녁 리마인더(손님 건별·매장 묶음), 당일 아침 리마인더, 방문 다음 날 리뷰 요청.
# 관리자 즉시 실행(POST /admin/jobs/reservation-reminders {at}) 으로 KST 시간 창을 흉내낸다. 중복 발송 없음, 취소·요청 상태 제외, 이미 리뷰 쓴 손님 제외.
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
notif_msg() { api GET "/notifications" "" "$1"; echo "$RESP" | jq -r "[.notifications[] | select(.title==\"$2\")][0].message // empty"; }
notif_link() { api GET "/notifications" "" "$1"; echo "$RESP" | jq -r "[.notifications[] | select(.title==\"$2\")][0].link // empty"; }
run_job() { api POST /admin/jobs/reservation-reminders "{\"at\":\"$1\"}" "$ADM"; }

echo "===== STEP 26: 예약 자동 알림 ====="
OWNER=$(register_verified "01099990261" "rm_owner@s26.test" "알림사장" "알림사장"); [ -z "$OWNER" ] && OWNER=$(login "rm_owner@s26.test" 'Re!pass1234')
STAFF=$(register_verified "01099990262" "rm_staff@s26.test" "알림직원" "알림직원"); [ -z "$STAFF" ] && STAFF=$(login "rm_staff@s26.test" 'Re!pass1234')
CUST=$(register_verified "01099990263" "rm_cust@s26.test" "알림손님" "알림손님"); [ -z "$CUST" ] && CUST=$(login "rm_cust@s26.test" 'Re!pass1234')
CUST2=$(register_verified "01099990264" "rm_cust2@s26.test" "알림손님둘" "알림손님둘"); [ -z "$CUST2" ] && CUST2=$(login "rm_cust2@s26.test" 'Re!pass1234')
ADM=$(register_verified "01099990265" "rm_admin@s26.test" "알림관리자" "알림관리자")
pq "UPDATE users SET role='admin' WHERE email='rm_admin@s26.test'" >/dev/null
ADM=$(login "rm_admin@s26.test" 'Re!pass1234')
IDS="'$(pq "SELECT id FROM users WHERE email='rm_owner@s26.test'")','$(pq "SELECT id FROM users WHERE email='rm_staff@s26.test'")','$(pq "SELECT id FROM users WHERE email='rm_cust@s26.test'")','$(pq "SELECT id FROM users WHERE email='rm_cust2@s26.test'")'"
pq "DELETE FROM notifications WHERE \"userId\" IN ($IDS)" >/dev/null
pq "DELETE FROM reservations WHERE \"customerId\" IN ($IDS)" >/dev/null
pq "DELETE FROM shop_reviews WHERE \"userId\" IN ($IDS)" >/dev/null
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$CUST" ] && [ -n "$CUST2" ] && [ -n "$ADM" ] && ok "유저 5명 준비" || bad "유저 준비 실패"

api POST /rentals '{"name":"S26렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; RENTAL=$(echo "$RESP" | jq -r '.id // empty')
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && [ -n "$RENTAL" ] && ok "렌탈 등록·승인" || bad "렌탈 CODE=$CODE"
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty'); api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "201" ] && ok "직원 참여" || bad "직원 참여 CODE=$CODE"

D1=$(date -v+1d +%F 2>/dev/null || date -d '+1 days' +%F); D2=$(date -v+2d +%F 2>/dev/null || date -d '+2 days' +%F); D3=$(date -v+3d +%F 2>/dev/null || date -d '+3 days' +%F)
# R1 확정(D2 10:00), R2 확정 후 취소(D2), R3 요청만(D3)
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$D2\",\"time\":\"10:00\",\"adults\":2}" "$CUST"; R1=$(echo "$RESP" | jq -r '.reservation.id // empty')
api PUT "/reservations/$R1/confirm" '{"message":"확정"}' "$OWNER"; [ "$CODE" = "200" ] && [ -n "$R1" ] && ok "예약 R1 확정 (모레 10:00)" || bad "R1 CODE=$CODE"
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$D2\",\"adults\":1}" "$CUST2"; R2=$(echo "$RESP" | jq -r '.reservation.id // empty')
api PUT "/reservations/$R2/confirm" '{}' "$OWNER"; api PUT "/reservations/$R2/cancel" '{}' "$CUST2"; [ "$CODE" = "200" ] && ok "예약 R2 확정 후 취소" || bad "R2 취소 CODE=$CODE"
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$D3\",\"adults\":1}" "$CUST"; R3=$(echo "$RESP" | jq -r '.reservation.id // empty'); [ -n "$R3" ] && ok "예약 R3 요청 상태" || bad "R3 없음"
pq "DELETE FROM notifications WHERE \"userId\" IN ($IDS)" >/dev/null  # 예약 요청·확정 알림은 지우고 자동 알림만 센다

# ── 창 밖(모레 13:00): 아무것도 안 보냄
run_job "${D2}T13:00:00+09:00"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '[.customerEve,.ownerEve,.customerDay,.ownerDay,.reviewRequests] | add')" = "0" ] && ok "시간 창 밖이면 발송 0" || bad "창 밖 CODE=$CODE RESP=$RESP"

# ── 전날 저녁 (D1 19:30): 손님 건별 1 + 매장 묶음 1 (취소·요청 상태 제외)
run_job "${D1}T19:30:00+09:00"
[ "$(echo "$RESP" | jq -r '.customerEve')" = "1" ] && [ "$(echo "$RESP" | jq -r '.ownerEve')" = "1" ] && ok "전날 저녁: 손님 1·매장 1" || bad "전날 저녁 RESP=$RESP"
M=$(notif_msg "$CUST" "내일 예약 안내"); echo "$M" | grep -q "내일 10:00 S26렌탈 예약이 있어요" && [ "$(notif_link "$CUST" "내일 예약 안내")" = "/chat/$(pq "SELECT \"roomId\" FROM reservations WHERE id='$R1'")" ] && ok "손님 알림: 내일 10:00 매장명 + 채팅방 링크" || bad "손님 전날 알림 '$M' link=$(notif_link "$CUST" "내일 예약 안내")"
[ "$(notif_count "$OWNER" "내일 예약 1건")" = "1" ] && [ "$(notif_count "$STAFF" "내일 예약 1건")" = "1" ] && echo "$(notif_msg "$OWNER" "내일 예약 1건")" | grep -q "S26렌탈: 내일 예약 1건" && ok "매장 묶음 알림: 사장님 + 직원 (1건)" || bad "매장 알림 owner=$(notif_count "$OWNER" "내일 예약 1건") staff=$(notif_count "$STAFF" "내일 예약 1건")"
[ "$(notif_count "$CUST2" "내일 예약 안내")" = "0" ] && ok "취소된 예약은 알림 없음" || bad "취소 예약 알림 있음"
run_job "${D1}T21:00:00+09:00"; [ "$(echo "$RESP" | jq -r '[.customerEve,.ownerEve] | add')" = "0" ] && [ "$(notif_count "$CUST" "내일 예약 안내")" = "1" ] && ok "같은 창에서 다시 돌려도 중복 발송 없음" || bad "중복 RESP=$RESP n=$(notif_count "$CUST" "내일 예약 안내")"

# ── 당일 아침 (D2 08:30)
run_job "${D2}T08:30:00+09:00"
[ "$(echo "$RESP" | jq -r '.customerDay')" = "1" ] && [ "$(echo "$RESP" | jq -r '.ownerDay')" = "1" ] && echo "$(notif_msg "$CUST" "오늘 예약 안내")" | grep -q "오늘 10:00 S26렌탈" && [ "$(notif_count "$STAFF" "오늘 예약 1건")" = "1" ] && ok "당일 아침: 손님 '오늘 10:00' + 매장 묶음" || bad "당일 RESP=$RESP msg='$(notif_msg "$CUST" "오늘 예약 안내")'"
# 새 예약을 확정하면 묶음이 '총 2건 (새로 확정 1건)'
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$D2\",\"time\":\"15:00\",\"adults\":1}" "$CUST2"; R5=$(echo "$RESP" | jq -r '.reservation.id // empty'); api PUT "/reservations/$R5/confirm" '{}' "$OWNER"
run_job "${D2}T09:30:00+09:00"; M=$(notif_msg "$OWNER" "오늘 예약 2건")
[ "$(echo "$RESP" | jq -r '.ownerDay')" = "1" ] && echo "$M" | grep -q "오늘 예약 2건이 있어요. (새로 확정 1건)" && ok "추가 확정 → 매장 묶음 '총 2건 (새로 확정 1건)'" || bad "추가 확정 RESP=$RESP msg='$M'"

# ── 방문 다음 날 (D3 11:30): 리뷰 요청 — 손님둘은 미리 리뷰를 써서 제외
api POST /shop-reviews "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"rating\":5,\"content\":\"미리 쓴 리뷰예요 좋아요\"}" "$CUST2"; [ "$CODE" = "201" ] && ok "손님둘 리뷰 작성" || bad "리뷰 CODE=$CODE"
run_job "${D3}T11:30:00+09:00"
[ "$(echo "$RESP" | jq -r '.reviewRequests')" = "1" ] && [ "$(notif_count "$CUST" "S26렌탈 방문은 어떠셨어요?")" = "1" ] && [ "$(notif_link "$CUST" "S26렌탈 방문은 어떠셨어요?")" = "/rental/$RENTAL#reviews" ] && [ "$(notif_count "$CUST2" "S26렌탈 방문은 어떠셨어요?")" = "0" ] && ok "리뷰 요청: 리뷰 안 쓴 손님만, 리뷰 칸 링크" || bad "리뷰 요청 RESP=$RESP cust=$(notif_count "$CUST" "S26렌탈 방문은 어떠셨어요?") cust2=$(notif_count "$CUST2" "S26렌탈 방문은 어떠셨어요?") link=$(notif_link "$CUST" "S26렌탈 방문은 어떠셨어요?")"
run_job "${D3}T15:00:00+09:00"; [ "$(echo "$RESP" | jq -r '.reviewRequests')" = "0" ] && ok "리뷰 요청 중복 없음" || bad "리뷰 요청 중복 RESP=$RESP"
api POST /admin/jobs/reservation-reminders '{"at":"not-a-date"}' "$ADM"; [ "$CODE" = "400" ] && ok "잘못된 at 400" || bad "잘못된 at CODE=$CODE"
api POST /admin/jobs/reservation-reminders '{}' "$OWNER"; [ "$CODE" = "403" ] && ok "관리자 아니면 403" || bad "비관리자 CODE=$CODE"
echo "----- STEP26: PASS=$PASS FAIL=$FAIL -----"
