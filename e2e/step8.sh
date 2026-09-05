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

echo "===== STEP 8: 회원 탈퇴 → 익명화 ====="
# Wrong password delete -> 400
api DELETE /auth/account '{"password":"WrongPass000"}' "$BUYER_TOKEN"
[ "$CODE" = "400" ] && ok "잘못된 비번 탈퇴 거부 (400)" || bad "잘못된비번 탈퇴 CODE=$CODE RESP=$RESP"

# Delete buyer account
api DELETE /auth/account '{"password":"Re!pass1234"}' "$BUYER_TOKEN"
echo "[delete account] CODE=$CODE RESP=$RESP"
[ "$CODE" = "200" ] && ok "구매자 회원 탈퇴 (200)" || bad "탈퇴 CODE=$CODE RESP=$RESP"

# Old token invalidated
api GET /auth/profile "" "$BUYER_TOKEN"
echo "[deleted token profile] CODE=$CODE"
[ "$CODE" = "401" ] && ok "탈퇴 후 기존 토큰 무효화 (401)" || bad "탈퇴 토큰 여전히 유효 CODE=$CODE"

# Login blocked
api POST /auth/login '{"email":"buyer_e2e@re.test","password":"Re!pass1234"}'
echo "[deleted login] CODE=$CODE"
[ "$CODE" = "401" ] && ok "탈퇴 계정 로그인 차단 (401 — 이메일 익명화로 미존재 처리)" || bad "탈퇴 로그인 CODE=$CODE RESP=$RESP"

# ----- Anonymization checks -----
# Review buyer name
api GET "/reviews?sellerId=$SELLER_ID"
RVBUYER=$(echo "$RESP" | jq -r '.reviews[0].buyer.name')
echo "[review buyer] name=$RVBUYER"
[ "$RVBUYER" = "탈퇴한 회원" ] && ok "리뷰의 작성자 → '탈퇴한 회원' 익명화" || bad "리뷰 작성자=$RVBUYER"

# Community post author
api GET "/community/$POST_ID"
POAUTH=$(echo "$RESP" | jq -r '.user.name')
echo "[post author] name=$POAUTH"
[ "$POAUTH" = "탈퇴한 회원" ] && ok "커뮤니티 글 작성자 → '탈퇴한 회원' 익명화" || bad "글 작성자=$POAUTH"

# Poll author
api GET "/polls/$POLL_ID"
PLAUTH=$(echo "$RESP" | jq -r '.author')
echo "[poll author] author=$PLAUTH"
[ "$PLAUTH" = "탈퇴한 회원" ] && ok "투표 작성자 → '탈퇴한 회원' 익명화" || bad "투표 작성자=$PLAUTH"

# Chat room other party (seller viewpoint)
api GET "/chat/rooms/$ROOM_ID" "" "$SELLER_TOKEN"
CHATOTHER=$(echo "$RESP" | jq -r "if .user1Id==\"$SELLER_ID\" then .user2.name else .user1.name end")
echo "[chat other] name=$CHATOTHER"
[ "$CHATOTHER" = "탈퇴한 회원" ] && ok "채팅 상대 → '탈퇴한 회원' 익명화" || bad "채팅 상대=$CHATOTHER"

# DB confirm
DBROW=$(psql "postgresql://snowtest@localhost:5433/snowpan_test" -tA -c "SELECT name||'|'||role||'|'||COALESCE(nickname,'NULL')||'|'||email FROM users WHERE id='$BUYER_ID';")
echo "[db row] $DBROW"
case "$DBROW" in "탈퇴한 회원|deleted|탈퇴한 회원|deleted_"*) ok "DB 익명화(name·nickname=탈퇴한회원, role=deleted, email 마스킹)";; *) bad "DB 익명화 미흡: $DBROW";; esac

# New chat to deleted user blocked
api POST /chat/rooms "{\"targetUserId\":\"$BUYER_ID\"}" "$SELLER_TOKEN"
echo "[chat to deleted] CODE=$CODE"
[ "$CODE" = "410" ] && ok "탈퇴 유저에게 새 채팅 차단 (410)" || bad "탈퇴 유저 채팅 CODE=$CODE"

echo "----- STEP8: PASS=$PASS FAIL=$FAIL -----"
