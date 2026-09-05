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

echo "===== STEP 7: 커뮤니티 글/댓글/좋아요 + 투표 ====="
# Create post
api POST /community '{"title":"E2E 스키 장비 질문","content":"170cm 스키 초보에게 괜찮을까요? 조언 부탁드려요.","category":"gear","sport":"ski","vertical":"snow"}' "$BUYER_TOKEN"
POST_ID=$(echo "$RESP" | jq -r '.id')
echo "[create post] CODE=$CODE id=$POST_ID"
[ "$CODE" = "201" ] && [ "$POST_ID" != "null" ] && ok "커뮤니티 글 작성 (201)" || bad "글 작성 CODE=$CODE RESP=$RESP"

# Comment
api POST "/community/$POST_ID/comments" '{"content":"초보에게 165~170 적당합니다!"}' "$SELLER_TOKEN"
CMT_ID=$(echo "$RESP" | jq -r '.id')
echo "[comment] CODE=$CODE id=$CMT_ID"
[ "$CODE" = "201" ] && [ "$CMT_ID" != "null" ] && ok "댓글 작성 (201)" || bad "댓글 CODE=$CODE RESP=$RESP"

# Like
api PUT "/community/$POST_ID/like" "" "$SELLER_TOKEN"
LIKED=$(echo "$RESP" | jq -r '.liked'); LIKES=$(echo "$RESP" | jq -r '.likes')
echo "[like] CODE=$CODE liked=$LIKED likes=$LIKES"
[ "$CODE" = "200" ] && [ "$LIKED" = "true" ] && [ "$LIKES" = "1" ] && ok "좋아요 (liked=true, likes=1)" || bad "좋아요 CODE=$CODE liked=$LIKED likes=$LIKES"

# Post detail reflects comment + like
api GET "/community/$POST_ID"
DLIKES=$(echo "$RESP" | jq -r '.likes'); DCMTS=$(echo "$RESP" | jq -r '(.comments|length) // (._count.comments) // 0')
echo "[post detail] likes=$DLIKES comments=$DCMTS author=$(echo "$RESP"|jq -r '.user.name // .user.nickname')"
[ "$DLIKES" = "1" ] && ok "글 상세 — 좋아요 반영(1)" || bad "글 상세 좋아요=$DLIKES"

# ===== Poll =====
api POST /polls '{"title":"이번 시즌 어디 갈까요?","options":["용평","하이원","곤지암"],"vertical":"snow"}' "$BUYER_TOKEN"
POLL_ID=$(echo "$RESP" | jq -r '.id')
OPT1=$(echo "$RESP" | jq -r '.options[0].id')
OPT2=$(echo "$RESP" | jq -r '.options[1].id')
echo "[create poll] CODE=$CODE id=$POLL_ID opt1=$OPT1"
[ "$CODE" = "201" ] && [ "$POLL_ID" != "null" ] && [ "$(echo "$RESP"|jq -r '.options|length')" = "3" ] && ok "투표 생성 (201, 옵션3개)" || bad "투표 생성 CODE=$CODE RESP=$RESP"

# Vote (buyer)
api POST "/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT1\"}" "$BUYER_TOKEN"
TV=$(echo "$RESP" | jq -r '.totalVotes'); MV=$(echo "$RESP" | jq -r '.myVote')
echo "[vote buyer] CODE=$CODE total=$TV myVote=$MV"
[ "$CODE" = "200" ] && [ "$TV" = "1" ] && [ "$MV" = "$OPT1" ] && ok "투표 참여 (totalVotes=1)" || bad "투표 CODE=$CODE total=$TV"

# Vote (seller different option)
api POST "/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT2\"}" "$SELLER_TOKEN"
TV2=$(echo "$RESP" | jq -r '.totalVotes')
[ "$CODE" = "200" ] && [ "$TV2" = "2" ] && ok "다른 유저 투표 참여 (totalVotes=2)" || bad "2번째 투표 CODE=$CODE total=$TV2"

# Duplicate vote -> 409
api POST "/polls/$POLL_ID/vote" "{\"optionId\":\"$OPT2\"}" "$BUYER_TOKEN"
echo "[dup vote] CODE=$CODE msg=$(echo "$RESP"|jq -r '.error')"
[ "$CODE" = "409" ] && ok "중복 투표 거부 (409, 1인1표)" || bad "중복 투표 CODE=$CODE"

# Poll like
api POST "/polls/$POLL_ID/like" "" "$SELLER_TOKEN"
PLIKED=$(echo "$RESP" | jq -r '.liked'); PLIKES=$(echo "$RESP" | jq -r '.likes')
[ "$CODE" = "200" ] && [ "$PLIKED" = "true" ] && ok "투표 좋아요 (liked=true, likes=$PLIKES)" || bad "투표 좋아요 CODE=$CODE liked=$PLIKED"

# Poll comment
api POST "/polls/$POLL_ID/comments" '{"content":"용평 설질 좋아요"}' "$SELLER_TOKEN"
[ "$CODE" = "200" ] || [ "$CODE" = "201" ] && ok "투표 댓글 작성 ($CODE)" || bad "투표 댓글 CODE=$CODE RESP=$RESP"

cat >> "$SP/state.env" <<EOF
export POST_ID="$POST_ID"
export POLL_ID="$POLL_ID"
export CMT_ID="$CMT_ID"
EOF
echo "----- STEP7: PASS=$PASS FAIL=$FAIL -----"
