#!/bin/bash
# STEP 41: 중고 거래 약속 (2026-10-09) — 매물 채팅방에서 제안 → 채팅 카드(type trade_meeting) + 상대 알림,
#          수락 → 확정 + 매물 '예약중', 판매자 '거래 확정' → '판매완료' + 구매자 지정 + 후기 요청,
#          취소(파기) → '판매중' 복귀, 거절, 새 제안이 기존 제안 대체, 권한(제3자 404·구매자 거래확정 403), 검증 400, 리마인더, 개인정보 비노출
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
no_pii() { echo "$RESP" | grep -Eqi '"(email|phone)"' && bad "$1 응답에 email/phone 노출" || ok "$1 응답 개인정보 없음"; }
product_status() { api GET "/products/$1" "" "$SELLER_TOKEN"; echo "$RESP" | jq -r '.status // empty'; }

echo "===== STEP 41: 중고 거래 약속 (제안·수락·거래 확정·취소) ====="

SELLER_TOKEN=$(register_verified "01099994101" "tm_seller@s41.test" "약속판매자" "약속판매자")
BUYER_TOKEN=$(register_verified "01099994102" "tm_buyer@s41.test" "약속구매자" "약속구매자")
OTHER_TOKEN=$(register_verified "01099994103" "tm_other@s41.test" "약속남남" "약속남남")
ADM_TOKEN=$(register_verified "01099994104" "tm_admin@s41.test" "약속관리자" "약속관리자")
pq "UPDATE users SET role='admin' WHERE email='tm_admin@s41.test'" >/dev/null
ADM_TOKEN=$(login "tm_admin@s41.test" 'Re!pass1234')
SELLER_ID=$(pq "SELECT id FROM users WHERE email='tm_seller@s41.test'")
BUYER_ID=$(pq "SELECT id FROM users WHERE email='tm_buyer@s41.test'")
[ -n "$SELLER_TOKEN" ] && [ -n "$BUYER_TOKEN" ] && [ -n "$OTHER_TOKEN" ] && [ -n "$ADM_TOKEN" ] && ok "유저 4명 준비" || bad "유저 준비 실패"

# 날짜: 내일(D1)·모레(D2) — KST 기준 YYYY-MM-DD
D1=$(TZ=Asia/Seoul date -v+1d +%F 2>/dev/null || TZ=Asia/Seoul date -d '+1 day' +%F)
D2=$(TZ=Asia/Seoul date -v+2d +%F 2>/dev/null || TZ=Asia/Seoul date -d '+2 day' +%F)
D0=$(TZ=Asia/Seoul date +%F)

# ── 매물 2개 + 채팅방
api POST /products/used '{"name":"S41 살로몬 스키 170","brand":"살로몬","price":300000,"size":"170","subcategory":"스키","image":"/uploads/e2e.jpg","condition":"상급","description":"약속 테스트 매물"}' "$SELLER_TOKEN"
P1=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && [ -n "$P1" ] && ok "매물1 등록" || bad "매물1 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST /products/used '{"name":"S41 버튼 보드 155","brand":"버튼","price":250000,"size":"155","subcategory":"보드","image":"/uploads/e2e.jpg","condition":"중급","description":"약속 테스트 매물2"}' "$SELLER_TOKEN"
P2=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && [ -n "$P2" ] && ok "매물2 등록" || bad "매물2 등록 CODE=$CODE"
api POST /chat/rooms "{\"targetUserId\":\"$SELLER_ID\",\"productName\":\"S41 살로몬 스키 170\",\"productPath\":\"/used/$P1\"}" "$BUYER_TOKEN"
ROOM=$(echo "$RESP" | jq -r '.id // .room.id // .roomId // empty'); [ -n "$ROOM" ] && ok "매물 채팅방 생성" || bad "채팅방 CODE=$CODE RESP=$(echo $RESP|head -c 160)"

# ── 검증·권한
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P1\",\"date\":\"$D1\",\"place\":\"곤지암 정문\"}" "$OTHER_TOKEN"
[ "$CODE" = "404" ] && ok "제3자 제안 404" || bad "제3자 제안 CODE=$CODE"
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P1\",\"date\":\"2020-01-01\",\"place\":\"곤지암 정문\"}" "$BUYER_TOKEN"
[ "$CODE" = "400" ] && ok "지난 날짜 400" || bad "지난 날짜 CODE=$CODE"
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P1\",\"date\":\"$D1\",\"place\":\"\"}" "$BUYER_TOKEN"
[ "$CODE" = "400" ] && ok "장소 없음 400" || bad "장소 없음 CODE=$CODE"
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P1\",\"date\":\"$D1\",\"time\":\"25:00\",\"place\":\"곤지암\"}" "$BUYER_TOKEN"
[ "$CODE" = "400" ] && ok "시간 형식 400" || bad "시간 형식 CODE=$CODE"
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P1\",\"date\":\"$D1\",\"place\":\"<script>alert(1)</script>곤지암\"}" "$BUYER_TOKEN"
echo "$RESP" | grep -q "<script>" && bad "장소 XSS 저장됨" || ok "장소 XSS 제거"
M0=$(echo "$RESP" | jq -r '.meeting.id // empty')

# ── 구매자 제안 → 새 제안이 기존 제안 대체 → 판매자 수락 → 매물 예약중
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P1\",\"date\":\"$D2\",\"time\":\"14:00\",\"place\":\"곤지암리조트 정문\",\"note\":\"검은 패딩\"}" "$BUYER_TOKEN"
M1=$(echo "$RESP" | jq -r '.meeting.id // empty'); ST=$(echo "$RESP" | jq -r '.meeting.status // empty'); REPL=$(echo "$RESP" | jq -r '.meeting.replaced // empty')
[ "$CODE" = "201" ] && [ -n "$M1" ] && [ "$ST" = "proposed" ] && ok "구매자 제안 201 proposed" || bad "구매자 제안 CODE=$CODE RESP=$(echo $RESP|head -c 160)"
[ "$REPL" = "$M0" ] && ok "새 제안이 기존 제안 대체(replaced)" || bad "replaced=$REPL 기대 $M0"
no_pii "제안"
api GET "/trade-meetings/$M0" "" "$BUYER_TOKEN"; [ "$(echo "$RESP" | jq -r '.status')" = "cancelled" ] && ok "대체된 내 제안은 cancelled" || bad "대체 제안 status=$(echo "$RESP" | jq -r '.status')"
api GET "/chat/rooms/$ROOM/messages" "" "$SELLER_TOKEN"
N=$(echo "$RESP" | jq '[.[] | select(.type=="trade_meeting")] | length'); [ "$N" -ge 2 ] && ok "채팅방에 약속 카드 $N장" || bad "약속 카드 수 $N"
api GET "/notifications" "" "$SELLER_TOKEN"; echo "$RESP" | grep -q "거래 약속 제안" && ok "판매자 알림: 약속 제안" || bad "판매자 알림 없음"
api GET "/trade-meetings/$M1" "" "$OTHER_TOKEN"; [ "$CODE" = "404" ] && ok "제3자 상세 404" || bad "제3자 상세 CODE=$CODE"
api PUT "/trade-meetings/$M1/accept" "" "$BUYER_TOKEN"; [ "$CODE" = "400" ] && ok "내 제안 내가 수락 400" || bad "자기 수락 CODE=$CODE"
api PUT "/trade-meetings/$M1/complete" "" "$SELLER_TOKEN"; [ "$CODE" = "400" ] && ok "확정 전 거래 확정 400" || bad "확정 전 거래확정 CODE=$CODE"
api PUT "/trade-meetings/$M1/accept" "" "$SELLER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.meeting.status')" = "confirmed" ] && ok "판매자 수락 → confirmed" || bad "수락 CODE=$CODE RESP=$(echo $RESP|head -c 160)"
[ "$(product_status $P1)" = "reserved" ] && ok "매물1 자동 예약중" || bad "매물1 status=$(product_status $P1)"
api GET "/notifications" "" "$BUYER_TOKEN"; echo "$RESP" | grep -q "약속이 확정" && ok "구매자 알림: 확정" || bad "구매자 확정 알림 없음"
api PUT "/trade-meetings/$M1/accept" "" "$SELLER_TOKEN"; [ "$CODE" = "400" ] && ok "중복 수락 400" || bad "중복 수락 CODE=$CODE"
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P1\",\"date\":\"$D2\",\"place\":\"다른 곳\"}" "$BUYER_TOKEN"
[ "$CODE" = "400" ] && ok "확정 중 새 제안 400" || bad "확정 중 새 제안 CODE=$CODE"

# ── 리마인더: 전날 저녁(D1 20:00) → eve 1 / 당일 아침(D2 09:00) → day 1 / 약속 2시간 뒤(D2 17:00) → followUp 1
api POST /admin/jobs/trade-meeting-reminders "{\"at\":\"${D1}T20:00:00+09:00\"}" "$ADM_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.eve')" = "1" ] && ok "전날 저녁 리마인더 1건" || bad "eve 리마인더 CODE=$CODE RESP=$RESP"
api POST /admin/jobs/trade-meeting-reminders "{\"at\":\"${D2}T09:00:00+09:00\"}" "$ADM_TOKEN"
[ "$(echo "$RESP" | jq -r '.day')" = "1" ] && ok "당일 아침 리마인더 1건" || bad "day 리마인더 RESP=$RESP"
api POST /admin/jobs/trade-meeting-reminders "{\"at\":\"${D2}T17:00:00+09:00\"}" "$ADM_TOKEN"
[ "$(echo "$RESP" | jq -r '.followUp')" = "1" ] && ok "약속 뒤 거래 확정 안내 1건" || bad "followUp RESP=$RESP"
api POST /admin/jobs/trade-meeting-reminders "{\"at\":\"${D2}T17:30:00+09:00\"}" "$ADM_TOKEN"
[ "$(echo "$RESP" | jq -r '.followUp')" = "0" ] && ok "후속 안내 중복 없음" || bad "followUp 중복 RESP=$RESP"
api GET "/notifications" "" "$SELLER_TOKEN"; echo "$RESP" | grep -q "거래는 잘 끝나셨나요" && ok "판매자 후속 알림" || bad "판매자 후속 알림 없음"

# ── 거래 확정: 구매자 403, 판매자 200 → 판매완료 + 구매자 지정 + 후기 요청
api PUT "/trade-meetings/$M1/complete" "" "$BUYER_TOKEN"; [ "$CODE" = "403" ] && ok "구매자 거래 확정 403" || bad "구매자 거래확정 CODE=$CODE"
api PUT "/trade-meetings/$M1/complete" "" "$SELLER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.meeting.status')" = "done" ] && ok "판매자 거래 확정 → done" || bad "거래 확정 CODE=$CODE RESP=$(echo $RESP|head -c 160)"
api GET "/products/$P1" "" "$SELLER_TOKEN"
[ "$(echo "$RESP" | jq -r '.status')" = "sold" ] && [ "$(echo "$RESP" | jq -r '.buyerId')" = "$BUYER_ID" ] && ok "매물1 판매완료 + 구매자 지정" || bad "매물1 $(echo "$RESP" | jq -c '{status,buyerId}')"
api GET "/notifications" "" "$BUYER_TOKEN"; echo "$RESP" | grep -q "판매자 평가해주세요" && ok "구매자 후기 요청 알림" || bad "구매자 후기 요청 없음"
api PUT "/trade-meetings/$M1/cancel" "" "$BUYER_TOKEN"; [ "$CODE" = "400" ] && ok "끝난 약속 취소 400" || bad "끝난 약속 취소 CODE=$CODE"
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P1\",\"date\":\"$D2\",\"place\":\"곤지암\"}" "$BUYER_TOKEN"
[ "$CODE" = "400" ] && ok "판매완료 매물 제안 400" || bad "판매완료 제안 CODE=$CODE"

# ── 매물2: 판매자 제안 → 구매자 거절 / 구매자 제안 → 수락(예약중) → 구매자 취소(파기) → 판매중 복귀
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P2\",\"date\":\"$D1\",\"time\":\"10:00\",\"place\":\"지산 주차장\"}" "$SELLER_TOKEN"
M2=$(echo "$RESP" | jq -r '.meeting.id // empty'); [ "$CODE" = "201" ] && [ -n "$M2" ] && ok "판매자 제안 201" || bad "판매자 제안 CODE=$CODE RESP=$(echo $RESP|head -c 160)"
api PUT "/trade-meetings/$M2/cancel" "" "$BUYER_TOKEN"; [ "$CODE" = "400" ] && ok "제안받은 쪽 취소 대신 거절 안내 400" || bad "제안받은 쪽 취소 CODE=$CODE"
api PUT "/trade-meetings/$M2/decline" '{"reason":"그날 일이 있어요"}' "$BUYER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.meeting.status')" = "declined" ] && ok "구매자 거절 → declined" || bad "거절 CODE=$CODE"
[ "$(product_status $P2)" = "selling" ] && ok "거절 후 매물2 판매중 유지" || bad "매물2 status=$(product_status $P2)"
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P2\",\"date\":\"$D2\",\"time\":\"11:00\",\"place\":\"지산리조트 매표소\"}" "$BUYER_TOKEN"
M3=$(echo "$RESP" | jq -r '.meeting.id // empty'); [ "$CODE" = "201" ] && ok "거절 뒤 재제안 201" || bad "재제안 CODE=$CODE"
api PUT "/trade-meetings/$M3/accept" "" "$SELLER_TOKEN"; [ "$CODE" = "200" ] && ok "재제안 수락" || bad "재제안 수락 CODE=$CODE"
[ "$(product_status $P2)" = "reserved" ] && ok "매물2 예약중" || bad "매물2 status=$(product_status $P2)"
api PUT "/trade-meetings/$M3/cancel" '{"reason":"갑자기 일정이 바뀌었어요"}' "$BUYER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.meeting.status')" = "cancelled" ] && [ "$(echo "$RESP" | jq -r '.meeting.productStatus')" = "selling" ] && ok "구매자 약속 취소(파기) → cancelled" || bad "취소 CODE=$CODE RESP=$(echo $RESP|head -c 160)"
[ "$(product_status $P2)" = "selling" ] && ok "취소 후 매물2 판매중 복귀" || bad "매물2 status=$(product_status $P2)"
api GET "/notifications" "" "$SELLER_TOKEN"; echo "$RESP" | grep -q "약속이 취소" && ok "판매자 알림: 취소" || bad "판매자 취소 알림 없음"
# 판매자가 미리 예약중으로 둔 매물은 약속 취소해도 건드리지 않는다 (약속이 바꾼 게 아니므로)
api PUT "/products/$P2" '{"status":"reserved"}' "$SELLER_TOKEN"; [ "$CODE" = "200" ] && ok "매물2 수동 예약중" || bad "수동 예약중 CODE=$CODE"
api POST /trade-meetings "{\"roomId\":\"$ROOM\",\"productId\":\"$P2\",\"date\":\"$D2\",\"place\":\"지산\"}" "$BUYER_TOKEN"; M4=$(echo "$RESP" | jq -r '.meeting.id // empty')
api PUT "/trade-meetings/$M4/accept" "" "$SELLER_TOKEN"; api PUT "/trade-meetings/$M4/cancel" "" "$SELLER_TOKEN"
[ "$CODE" = "200" ] && [ "$(product_status $P2)" = "reserved" ] && ok "수동 예약중 매물은 취소해도 예약중 유지" || bad "수동 예약중 유지 실패 status=$(product_status $P2) CODE=$CODE"

# ── 목록·개인정보
api GET /trade-meetings/mine "" "$BUYER_TOKEN"
N=$(echo "$RESP" | jq '.items | length'); [ "$CODE" = "200" ] && [ "$N" -ge 4 ] && ok "내 약속 목록 $N건" || bad "목록 CODE=$CODE N=$N"
no_pii "내 약속 목록"
echo "$RESP" | jq -e '.items[0].other.name' >/dev/null && ok "목록에 상대 표시명" || bad "상대 표시명 없음"
api GET /trade-meetings/mine "" "$OTHER_TOKEN"; [ "$(echo "$RESP" | jq '.items | length')" = "0" ] && ok "남의 약속은 목록에 없음" || bad "제3자 목록 노출"
api GET "/trade-meetings/not-a-uuid" "" "$BUYER_TOKEN"; [ "$CODE" = "400" ] && ok "잘못된 id 400" || bad "잘못된 id CODE=$CODE"
api POST /trade-meetings "" ""; [ "$CODE" = "401" ] && ok "무토큰 401" || bad "무토큰 CODE=$CODE"

echo "----- STEP41: PASS=$PASS FAIL=$FAIL -----"
