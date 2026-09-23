#!/bin/bash
# STEP 22: 사장님 현황 (GET /owner/summary) — 오늘 할 일(예약 요청·답글 없는 리뷰·새 신청), 앞으로 2주 일정, 최근 30일 통계, 매장별 숫자, 직원도 조회
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

echo "===== STEP 22: 사장님 현황 ====="
OWNER=$(register_verified "01099990221" "sm_owner@s22.test" "현황사장" "현황사장"); [ -z "$OWNER" ] && OWNER=$(login "sm_owner@s22.test" 'Re!pass1234')
STAFF=$(register_verified "01099990222" "sm_staff@s22.test" "현황직원" "현황직원"); [ -z "$STAFF" ] && STAFF=$(login "sm_staff@s22.test" 'Re!pass1234')
CUST=$(register_verified "01099990223" "sm_cust@s22.test" "현황손님" "현황손님"); [ -z "$CUST" ] && CUST=$(login "sm_cust@s22.test" 'Re!pass1234')
CUST2=$(register_verified "01099990224" "sm_cust2@s22.test" "현황손님둘" "현황손님둘"); [ -z "$CUST2" ] && CUST2=$(login "sm_cust2@s22.test" 'Re!pass1234')
ADM=$(register_verified "01099990225" "sm_admin@s22.test" "현황관리자" "현황관리자")
pq "UPDATE users SET role='admin' WHERE email='sm_admin@s22.test'" >/dev/null
ADM=$(login "sm_admin@s22.test" 'Re!pass1234')
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$CUST" ] && [ -n "$CUST2" ] && [ -n "$ADM" ] && ok "유저 5명 준비" || bad "유저 준비 실패"

api GET /owner/summary "" "$OWNER"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.shops | length')" = "0" ] && ok "매장 없으면 빈 현황" || bad "빈 현황 CODE=$CODE RESP=$(echo $RESP|head -c 100)"

# ── 렌탈 등록·승인
api POST /rentals '{"name":"S22렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; RENTAL=$(echo "$RESP" | jq -r '.id // empty')
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && [ -n "$RENTAL" ] && ok "렌탈 등록·승인" || bad "렌탈 CODE=$CODE"

# ── 예약 2건 (요청 1 + 확정 1), 리뷰 1(답글 없음), 모집 + 신청 1
D3=$(date -v+3d +%F 2>/dev/null || date -d '+3 days' +%F); D5=$(date -v+5d +%F 2>/dev/null || date -d '+5 days' +%F)
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$D3\",\"time\":\"10:00\",\"adults\":2,\"details\":{\"ski\":2}}" "$CUST"; R1=$(echo "$RESP" | jq -r '.reservation.id // empty')
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$D5\",\"time\":\"14:00\",\"adults\":1}" "$CUST2"; R2=$(echo "$RESP" | jq -r '.reservation.id // empty')
api PUT "/reservations/$R2/confirm" '{"message":"확정"}' "$OWNER"; [ "$CODE" = "200" ] && [ -n "$R1" ] && ok "예약 요청 1 + 확정 1" || bad "예약 준비 CODE=$CODE"
api POST /shop-reviews "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"rating\":4,\"content\":\"현황 테스트 리뷰예요\"}" "$CUST"; [ "$CODE" = "201" ] && ok "리뷰 1" || bad "리뷰 CODE=$CODE"
api POST /recruits "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"title\":\"시즌 직원 모집\",\"description\":\"현황 테스트 모집이에요\"}" "$OWNER"; RC=$(echo "$RESP" | jq -r '.id // empty')
api POST "/recruits/$RC/apply" '{"name":"손님둘","phone":"01012345678"}' "$CUST2"; [ "$CODE" = "201" ] && ok "모집 신청 1" || bad "신청 CODE=$CODE"

# ── 사장님 현황
api GET /owner/summary "" "$OWNER"
[ "$CODE" = "200" ] && ok "현황 200" || bad "현황 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
TR=$(echo "$RESP" | jq -r '.todo.requested'); TU=$(echo "$RESP" | jq -r '.todo.unrepliedReviews'); TA=$(echo "$RESP" | jq -r '.todo.newApplications7d'); TC=$(echo "$RESP" | jq -r '.todo.unreadChats')
[ "$TR" = "1" ] && [ "$TU" = "1" ] && [ "$TA" = "1" ] && [ "$TC" -ge 0 ] && ok "오늘 할 일: 요청 1·답글 없는 리뷰 1·새 신청 1" || bad "todo r=$TR u=$TU a=$TA c=$TC"
SD=$(echo "$RESP" | jq -r '.schedule | length'); S0=$(echo "$RESP" | jq -r '.schedule[0].date'); S0S=$(echo "$RESP" | jq -r '.schedule[0].items[0].status'); S0C=$(echo "$RESP" | jq -r '.schedule[0].items[0].customer'); S1S=$(echo "$RESP" | jq -r '.schedule[1].items[0].status'); SK=$(echo "$RESP" | jq -r '.schedule[0].items[0].details.ski')
[ "$SD" = "2" ] && [ "$S0" = "$D3" ] && [ "$S0S" = "requested" ] && [ "$S0C" = "현황손님" ] && [ "$S1S" = "confirmed" ] && [ "$SK" = "2" ] && ok "일정: 날짜 2개, 요청→확정 순, 손님 이름·장비" || bad "schedule n=$SD d0=$S0 s0=$S0S c0=$S0C s1=$S1S ski=$SK"
LR=$(echo "$RESP" | jq -r '.last30d.requests'); LC=$(echo "$RESP" | jq -r '.last30d.confirmed'); LV=$(echo "$RESP" | jq -r '.last30d.reviews'); LA=$(echo "$RESP" | jq -r '.last30d.applications')
[ "$LR" = "2" ] && [ "$LC" = "1" ] && [ "$LV" = "1" ] && [ "$LA" = "1" ] && ok "최근 30일: 요청 2·확정 1·리뷰 1·신청 1" || bad "last30d r=$LR c=$LC v=$LV a=$LA"
SN=$(echo "$RESP" | jq -r "[.shops[] | select(.shopId==\"$RENTAL\")][0] | \"\\(.reservations.total)/\\(.reservations.requested)/\\(.reviews.count)/\\(.reviews.avg)/\\(.reviews.unreplied)/\\(.applications)/\\(.label)\"")
[ "$SN" = "2/1/1/4/1/1/렌탈샵" ] && ok "매장별: 예약 2(대기 1)·리뷰 1 ★4(답글 1)·신청 1" || bad "shop stats=$SN"
LEAK=$(echo "$RESP" | grep -c '"phone"'); [ "$LEAK" = "0" ] && ok "현황 응답에 전화번호 없음" || bad "현황 개인정보 노출"

# ── 답글 달면 할 일에서 빠짐
RV=$(pq "SELECT id FROM shop_reviews WHERE \"shopId\"='$RENTAL' LIMIT 1")
api PUT "/shop-reviews/$RV/reply" '{"content":"감사합니다"}' "$OWNER"
api GET /owner/summary "" "$OWNER"; [ "$(echo "$RESP" | jq -r '.todo.unrepliedReviews')" = "0" ] && ok "답글 후 답글 없는 리뷰 0" || bad "답글 후 unreplied=$(echo "$RESP" | jq -r '.todo.unrepliedReviews')"

# ── 손님은 빈 현황, 직원은 같은 현황
api GET /owner/summary "" "$CUST"; [ "$(echo "$RESP" | jq -r '.shops | length')" = "0" ] && [ "$(echo "$RESP" | jq -r '.schedule | length')" = "0" ] && ok "손님 현황은 비어 있음" || bad "손님 현황 RESP=$(echo $RESP|head -c 100)"
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty'); api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"
api GET /owner/summary "" "$STAFF"; SR=$(echo "$RESP" | jq -r "[.shops[] | select(.shopId==\"$RENTAL\")][0].staffRole // empty"); SS=$(echo "$RESP" | jq -r '.schedule | length')
[ "$SR" = "staff" ] && [ "$SS" = "2" ] && ok "직원도 같은 현황 (staffRole·일정 2)" || bad "직원 현황 role=$SR sched=$SS"
echo "----- STEP22: PASS=$PASS FAIL=$FAIL -----"
