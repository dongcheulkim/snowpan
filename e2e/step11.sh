#!/bin/bash
# STEP 11: 채팅 요청 게이트 — 요청 → 수락 전 전송 차단 → 수락 → 대화 / 거절 → 재요청 차단 → 매물 문의 승격
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
SP="${E2E_STATE_DIR:-$(cd "$(dirname "$0")" && pwd)/.state}"
E2E_DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
api() {
  local method=$1 path=$2 body=$3 token=$4
  local hdr=(-H 'Content-Type: application/json')
  [ -n "$token" ] && hdr+=(-H "Authorization: Bearer $token")
  local out
  if [ -n "$body" ]; then out=$(curl -s -m 20 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path" -d "$body")
  else out=$(curl -s -m 20 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path"); fi
  CODE=$(printf '%s' "$out" | tail -n1); RESP=$(printf '%s' "$out" | sed '$d')
}

echo "===== STEP 11: 채팅 요청 게이트 (커뮤 콜드 DM) ====="

# 깨끗한 유저 3명 — A(요청자) B(수신자) C(거절 흐름용)
A_TOKEN=$(register_verified "01077770001" "dmreq_a@re.test" "요청자에이" "요청자에이")
B_TOKEN=$(register_verified "01077770002" "dmreq_b@re.test" "수신자비" "수신자비")
C_TOKEN=$(register_verified "01077770003" "dmreq_c@re.test" "거절자씨" "거절자씨")
A_ID=$(pq "SELECT id FROM users WHERE email='dmreq_a@re.test'")
B_ID=$(pq "SELECT id FROM users WHERE email='dmreq_b@re.test'")
C_ID=$(pq "SELECT id FROM users WHERE email='dmreq_c@re.test'")
[ -n "$A_TOKEN" ] && [ -n "$B_TOKEN" ] && [ -n "$C_TOKEN" ] && ok "테스트 유저 3명 등록" || bad "유저 등록 실패"

# ── A → B 채팅 요청
api POST /chat/requests "{\"targetUserId\":\"$B_ID\",\"message\":\"안녕하세요! 커뮤 보고 채팅 요청드려요\"}" "$A_TOKEN"
ROOM=$(echo "$RESP" | jq -r '.id // empty')
ST=$(echo "$RESP" | jq -r '.status // empty')
[ "$CODE" = "201" ] && [ "$ST" = "pending" ] && [ -n "$ROOM" ] && ok "채팅 요청 생성 (201 pending)" || bad "요청 생성 CODE=$CODE RESP=$RESP"

# 빈 메시지 요청 거부
api POST /chat/requests "{\"targetUserId\":\"$B_ID\",\"message\":\"\"}" "$A_TOKEN"
[ "$CODE" = "400" ] && ok "빈 메시지 요청 거부 (400)" || bad "빈 메시지 CODE=$CODE"

# 중복 요청 409
api POST /chat/requests "{\"targetUserId\":\"$B_ID\",\"message\":\"또 보내기\"}" "$A_TOKEN"
[ "$CODE" = "409" ] && ok "중복 요청 차단 (409)" || bad "중복 요청 CODE=$CODE RESP=$RESP"

# 첫 메시지가 방에 저장됨 + B 알림 수신
MC=$(pq "SELECT count(*) FROM messages WHERE \"roomId\"='$ROOM'")
[ "$MC" = "1" ] && ok "요청 첫 메시지 저장 (1건)" || bad "메시지 수=$MC"
NC=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$B_ID' AND title='새 채팅 요청'")
[ "$NC" = "1" ] && ok "수신자에게 요청 알림 생성" || bad "알림 수=$NC"

# B 목록에 pending 노출
api GET /chat/rooms "" "$B_TOKEN"
BST=$(echo "$RESP" | jq -r ".[] | select(.id==\"$ROOM\") | .status")
[ "$BST" = "pending" ] && ok "수신자 목록에 pending 방 노출" || bad "수신자 목록 status=$BST"

# ── 수락 전 소켓 전송 차단 (요청자)
GATE=$(node "$E2E_DIR/chatgate.js" "$A_TOKEN" "$ROOM")
case "$GATE" in RESULT:BLOCKED*) ok "수락 전 요청자 전송 차단 ($GATE)";; *) bad "수락 전 전송 게이트: $GATE";; esac

# 요청자가 수락 시도 → 403
api POST "/chat/rooms/$ROOM/accept" "{}" "$A_TOKEN"
[ "$CODE" = "403" ] && ok "요청자 셀프 수락 차단 (403)" || bad "셀프 수락 CODE=$CODE"

# ── B 수락 → 대화 가능
api POST "/chat/rooms/$ROOM/accept" "{}" "$B_TOKEN"
[ "$CODE" = "200" ] && ok "수신자 수락 (200)" || bad "수락 CODE=$CODE RESP=$RESP"
GATE=$(node "$E2E_DIR/chatgate.js" "$A_TOKEN" "$ROOM")
case "$GATE" in RESULT:DELIVERED) ok "수락 후 전송 정상 (DELIVERED)";; *) bad "수락 후 전송: $GATE";; esac
NC=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$A_ID' AND title='채팅 요청 수락'")
[ "$NC" = "1" ] && ok "요청자에게 수락 알림" || bad "수락 알림 수=$NC"

# ── 거절 흐름: C → A 요청, A 거절
api POST /chat/requests "{\"targetUserId\":\"$A_ID\",\"message\":\"저도 채팅 요청이요\"}" "$C_TOKEN"
ROOM2=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && ok "C→A 요청 생성" || bad "C 요청 CODE=$CODE"
api POST "/chat/rooms/$ROOM2/decline" "{}" "$A_TOKEN"
[ "$CODE" = "200" ] && ok "A 거절 (200)" || bad "거절 CODE=$CODE RESP=$RESP"

# 거절 후: C 재요청 차단(409, 거절 사실 비노출), A 목록에서 방 숨김
api POST /chat/requests "{\"targetUserId\":\"$A_ID\",\"message\":\"다시 요청\"}" "$C_TOKEN"
[ "$CODE" = "409" ] && ok "거절 후 재요청 차단 (409)" || bad "재요청 CODE=$CODE RESP=$RESP"
api GET /chat/rooms "" "$A_TOKEN"
HID=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$ROOM2\")] | length")
[ "$HID" = "0" ] && ok "거절한 방은 목록에서 숨김" || bad "거절 방 노출=$HID"

# 거절된 방 소켓 전송도 차단
GATE=$(node "$E2E_DIR/chatgate.js" "$C_TOKEN" "$ROOM2")
case "$GATE" in RESULT:BLOCKED*) ok "거절된 방 전송 차단" ;; *) bad "거절 방 전송: $GATE";; esac

# ── [게이트 강화] 요청자(C)가 productName 으로 승격 우회 시도 → 차단 + 응답은 pending 위장
api POST /chat/rooms "{\"targetUserId\":\"$A_ID\",\"productName\":\"우회시도\",\"productPath\":\"/used/x\"}" "$C_TOKEN"
RSTAT=$(echo "$RESP" | jq -r '.status')
DBST=$(pq "SELECT status FROM chat_rooms WHERE id='$ROOM2'")
[ "$DBST" = "declined" ] && [ "$RSTAT" = "pending" ] && ok "요청자 productName 우회 차단 (DB=declined, 응답 pending 위장)" || bad "우회 차단 실패 DB=$DBST 응답=$RSTAT"
MC2=$(pq "SELECT count(*) FROM messages WHERE \"roomId\"='$ROOM2' AND type='product_inquiry'")
[ "$MC2" = "0" ] && ok "우회 시도 시 매물문의 메시지 미생성" || bad "우회 메시지 생성됨 ($MC2)"

# 요청자는 성사 전 방 삭제 불가 (삭제→재요청 스팸 루프 차단)
api DELETE "/chat/rooms/$ROOM2" "" "$C_TOKEN"
[ "$CODE" = "403" ] && ok "요청자 성사전 방 삭제 차단 (403)" || bad "삭제 차단 CODE=$CODE"

# 요청자 목록엔 거절 방이 pending 으로 위장 노출 (사라짐=거절 신호 차단)
api GET /chat/rooms "" "$C_TOKEN"
LSTAT=$(echo "$RESP" | jq -r ".[] | select(.id==\"$ROOM2\") | .status")
[ "$LSTAT" = "pending" ] && ok "요청자 목록에 거절 방 pending 위장" || bad "요청자 목록 status=$LSTAT"

# ── 매물 문의 승격: A(수신자였던 쪽)가 C 에게 매물 문의 → declined 방이 accepted 로 (동의)
api POST /chat/rooms "{\"targetUserId\":\"$C_ID\",\"productName\":\"E2E 매물\",\"productPath\":\"/used/x\"}" "$A_TOKEN"
UST=$(pq "SELECT status FROM chat_rooms WHERE id='$ROOM2'")
[ "$CODE" = "200" ] && [ "$UST" = "accepted" ] && ok "수신자 매물 문의로 방 승격 (accepted)" || bad "승격 CODE=$CODE status=$UST"

echo "----- STEP11: PASS=$PASS FAIL=$FAIL -----"
