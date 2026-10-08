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
# ── 공개 범위 '전체'(sport=all): 일반 유저도 가능, 스키·보드 필터 양쪽에 노출, 목록 무필터 조회
api POST /community '{"title":"E2E 전체 공개 글","content":"스키 보드 모두","category":"free","sport":"all","vertical":"snow"}' "$BUYER_TOKEN"
AP=$(echo "$RESP" | jq -r '.id // empty'); AS=$(echo "$RESP" | jq -r '.sport'); [ "$CODE" = "201" ] && [ "$AS" = "all" ] && ok "일반 유저 전체 공개 글 201 (sport=all)" || bad "전체 공개 CODE=$CODE sport=$AS $(echo $RESP|head -c 100)"
api GET "/community?sport=board&category=free" ""; AB=$(echo "$RESP" | jq -r "[.posts[] | select(.id==\"$AP\")] | length"); [ "$AB" = "1" ] && ok "전체 공개 글이 보드 필터에도 노출" || bad "보드 필터 n=$AB"
api GET "/community?category=free" ""; AN=$(echo "$RESP" | jq -r "[.posts[] | select(.id==\"$AP\")] | length"); [ "$AN" = "1" ] && ok "종목 무필터 목록에 노출" || bad "무필터 n=$AN"
api PUT "/community/$AP" '{"sport":"ski"}' "$BUYER_TOKEN"; PS=$(echo "$RESP" | jq -r '.sport'); [ "$CODE" = "200" ] && [ "$PS" = "ski" ] && ok "공개 범위 수정 (all → ski)" || bad "공개 범위 수정 CODE=$CODE $PS"
api PUT "/community/$AP" '{"sport":"golf"}' "$BUYER_TOKEN"; [ "$CODE" = "400" ] && ok "잘못된 공개 범위 400" || bad "공개 범위 400 기대, CODE=$CODE"

# ── 관리자가 남의 글 카테고리·종목 옮기기 (잘못 올린 글 정리, 2026-10-08) — 글쓴이가 아닌 일반 회원은 403
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
MV_ADM=$(register_verified "01099990071" "mv_admin@s7.test" "글옮김관리자" "글옮김관리자"); pq "UPDATE users SET role='admin' WHERE email='mv_admin@s7.test'" >/dev/null; MV_ADM=$(login "mv_admin@s7.test" 'Re!pass1234')
api PUT "/community/$AP" '{"category":"carpool"}' "$SELLER_TOKEN"; [ "$CODE" = "403" ] && ok "남의 글 카테고리 변경은 403" || bad "남의 글 변경 CODE=$CODE"
api PUT "/community/$AP" '{"category":"carpool","sport":"board"}' "$MV_ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.category')" = "carpool" ] && [ "$(echo "$RESP" | jq -r '.sport')" = "board" ] && ok "관리자가 카테고리·종목 옮김 (free/ski → carpool/board)" || bad "관리자 옮김 CODE=$CODE $(echo "$RESP" | head -c 120)"
api GET "/community?sport=board&category=carpool" ""; [ "$(echo "$RESP" | jq -r "[.posts[] | select(.id==\"$AP\")] | length")" = "1" ] && ok "옮긴 뒤 보드·카풀 목록에 노출" || bad "옮긴 목록 노출 안 됨"
api PUT "/community/$AP" '{"category":"bogus"}' "$MV_ADM"; [ "$CODE" = "400" ] && ok "없는 카테고리 400" || bad "없는 카테고리 CODE=$CODE"
api PUT "/community/$AP" '{"category":"notice"}' "$MV_ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.sport')" = "all" ] && [ "$(echo "$RESP" | jq -r '.pinned')" = "true" ] && ok "공지로 옮기면 공용·상단 고정" || bad "공지 옮김 CODE=$CODE $(echo "$RESP" | head -c 120)"
api PUT "/community/$AP" '{"category":"free"}' "$MV_ADM"; [ "$(echo "$RESP" | jq -r '.pinned')" = "false" ] && ok "공지에서 되돌리면 고정 해제" || bad "고정 해제 안 됨"

echo "----- STEP7: PASS=$PASS FAIL=$FAIL -----"
