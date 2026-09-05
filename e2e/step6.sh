#!/bin/bash
BASE="http://localhost:4001/api"; BYPASS="X-Loadtest-Key: e2e-local-bypass"
SP="${E2E_STATE_DIR:-$(cd "$(dirname "$0")" && pwd)/.state}"
source "$SP/state.env"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
api() {
  local method=$1 path=$2 body=$3 token=$4
  local hdr=(-H "$BYPASS" -H 'Content-Type: application/json')
  [ -n "$token" ] && hdr+=(-H "Authorization: Bearer $token")
  local out
  if [ -n "$body" ]; then out=$(curl -s -m 20 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path" -d "$body")
  else out=$(curl -s -m 20 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path"); fi
  CODE=$(printf '%s' "$out" | tail -n1); RESP=$(printf '%s' "$out" | sed '$d')
}

echo "===== STEP 6: 찜하기 → 찜목록 → 알림 ====="
# Wishlist toggle on (buyer likes P3)
api POST "/products/$P3/wishlist" "" "$BUYER_TOKEN"
echo "[wishlist toggle] CODE=$CODE RESP=$RESP"
WL=$(echo "$RESP" | jq -r '.wishlisted // .isWishlisted // .added // empty')
[ "$CODE" = "200" ] || [ "$CODE" = "201" ] && ok "찜하기 토글 (200)" || bad "찜하기 CODE=$CODE RESP=$RESP"

# Wishlist list
api GET "/products/wishlist" "" "$BUYER_TOKEN"
INWL=$(echo "$RESP" | jq -r "[.. | objects | select(.id==\"$P3\")] | length" 2>/dev/null)
echo "[wishlist list] CODE=$CODE P3 present=$INWL RESP_head=$(echo "$RESP"|head -c 200)"
[ "$CODE" = "200" ] && [ "$INWL" -ge 1 ] && ok "찜 목록에 P3 노출" || bad "찜목록 P3 present=$INWL CODE=$CODE"

# ----- Notifications: seller review notification (from step4) -----
api GET "/notifications" "" "$SELLER_TOKEN"
REVN=$(echo "$RESP" | jq -r '[.notifications[]|select(.title=="새 리뷰")]|length')
echo "[seller notif] total=$(echo "$RESP"|jq -r '.totalCount') 새리뷰=$REVN"
[ "$CODE" = "200" ] && [ "$REVN" -ge 1 ] && ok "판매자 리뷰 알림 수신('새 리뷰')" || bad "리뷰 알림 없음 REVN=$REVN"

# ----- Buyer sold/review-request notification (from step4 mark sold) -----
api GET "/notifications" "" "$BUYER_TOKEN"
SOLDN=$(echo "$RESP" | jq -r '[.notifications[]|select(.title|startswith("거래 완료"))]|length')
echo "[buyer notif] total=$(echo "$RESP"|jq -r '.totalCount') 거래완료=$SOLDN"
[ "$SOLDN" -ge 1 ] && ok "구매자 거래완료(리뷰요청) 알림 수신" || bad "거래완료 알림 없음 SOLDN=$SOLDN"

# ----- Chat notification: buyer sends while seller offline -----
node "$(dirname "$0")/chatnotif.js" "$BUYER_TOKEN" "$ROOM_ID"
sleep 1
api GET "/notifications" "" "$SELLER_TOKEN"
CHATN=$(echo "$RESP" | jq -r '[.notifications[]|select(.type=="chat")]|length')
echo "[seller chat notif] chat=$CHATN"
[ "$CHATN" -ge 1 ] && ok "판매자 채팅 알림 수신(type=chat, 오프라인 시)" || bad "채팅 알림 없음 CHATN=$CHATN"

# Unwishlist toggle off
api POST "/products/$P3/wishlist" "" "$BUYER_TOKEN"
api GET "/products/wishlist" "" "$BUYER_TOKEN"
INWL2=$(echo "$RESP" | jq -r "[.. | objects | select(.id==\"$P3\")] | length" 2>/dev/null)
[ "$INWL2" = "0" ] && ok "찜 해제 토글 — 목록에서 제거" || bad "찜 해제 실패 present=$INWL2"

echo "----- STEP6: PASS=$PASS FAIL=$FAIL -----"
