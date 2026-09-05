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

echo "===== STEP 3: 상세조회 → 채팅(REST+소켓) ====="
# Buyer views detail
api GET "/products/$P1" "" "$BUYER_TOKEN"
[ "$CODE" = "200" ] && ok "구매자 매물 상세 조회 (200)" || bad "구매자 상세 CODE=$CODE"

# Start chat (REST) with product inquiry
api POST /chat/rooms "{\"targetUserId\":\"$SELLER_ID\",\"productName\":\"E2Eski 살로몬 스키 170\",\"productPath\":\"/used/$P1\"}" "$BUYER_TOKEN"
ROOM_ID=$(echo "$RESP" | jq -r '.id')
echo "[create room] CODE=$CODE room=$ROOM_ID"
[ "$CODE" = "200" ] && [ "$ROOM_ID" != "null" ] && ok "채팅방 생성 (REST, 200)" || bad "채팅방 생성 CODE=$CODE RESP=$RESP"

# REST: room list shows room with seller nickname
api GET /chat/rooms "" "$BUYER_TOKEN"
OTHER=$(echo "$RESP" | jq -r ".[] | select(.id==\"$ROOM_ID\") | (if .user1Id==\"$BUYER_ID\" then .user2.name else .user1.name end)")
echo "[rooms buyer] other party name=$OTHER"
[ "$OTHER" = "판매왕철수" ] && ok "REST 채팅방 목록 — 상대 표시=닉네임(판매왕철수)" || bad "상대 표시명=$OTHER"

# REST: room detail
api GET "/chat/rooms/$ROOM_ID" "" "$BUYER_TOKEN"
[ "$CODE" = "200" ] && ok "REST 채팅방 상세 조회 (200)" || bad "채팅방 상세 CODE=$CODE"

# REST: messages (should contain product_inquiry)
api GET "/chat/rooms/$ROOM_ID/messages" "" "$BUYER_TOKEN"
PINQ=$(echo "$RESP" | jq -r '[.[]|select(.type=="product_inquiry")]|length')
echo "[messages] product_inquiry count=$PINQ code=$CODE"
[ "$CODE" = "200" ] && [ "$PINQ" -ge 1 ] && ok "REST 메시지 목록 — product_inquiry 자동메시지 존재" || bad "product_inquiry count=$PINQ"

# ===== SOCKET message exchange =====
echo "[socket] exchanging messages..."
SOUT=$(node "$(dirname "$0")/chat.js" "$BUYER_TOKEN" "$SELLER_TOKEN" "$ROOM_ID" "구매자영희" "판매왕철수" 2>&1)
echo "$SOUT"
CONN=$(echo "$SOUT" | jq -r '.connected' 2>/dev/null)
SREC_NAME=$(echo "$SOUT" | jq -r '.sellerReceived.senderName' 2>/dev/null)
SREC_CONTENT=$(echo "$SOUT" | jq -r '.sellerReceived.content' 2>/dev/null)
BREC_NAME=$(echo "$SOUT" | jq -r '.buyerReceived.senderName' 2>/dev/null)
[ "$CONN" = "true" ] && ok "소켓 인증 연결 (buyer+seller)" || bad "소켓 연결 실패: $(echo "$SOUT"|jq -r '.errors' 2>/dev/null)"
[ "$SREC_CONTENT" = "안녕하세요 스키 구매 문의드려요" ] && ok "소켓 메시지 수신(판매자) — 내용 일치" || bad "판매자 수신 내용=$SREC_CONTENT"
[ "$SREC_NAME" = "구매자영희" ] && ok "소켓 수신 sender.name=구매자 닉네임(구매자영희)" || bad "판매자쪽 sender.name=$SREC_NAME"
[ "$BREC_NAME" = "판매왕철수" ] && ok "소켓 응답 sender.name=판매자 닉네임(판매왕철수)" || bad "구매자쪽 sender.name=$BREC_NAME"

# Verify messages persisted via REST
api GET "/chat/rooms/$ROOM_ID/messages" "" "$SELLER_TOKEN"
TXT=$(echo "$RESP" | jq -r '[.[]|select(.type=="text")]|length')
echo "[persisted text msgs] $TXT"
[ "$TXT" -ge 2 ] && ok "소켓 메시지 DB 영속화 (REST에서 2건+ 조회)" || bad "영속 text 메시지=$TXT"

cat >> "$SP/state.env" <<EOF
export ROOM_ID="$ROOM_ID"
EOF
echo "----- STEP3: PASS=$PASS FAIL=$FAIL -----"
