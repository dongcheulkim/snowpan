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

echo "===== STEP 4: 판매완료 → 리뷰 → 평점 → 중복거부 ====="
# review before sold (P2 still selling) should fail
api POST /reviews "{\"sellerId\":\"$SELLER_ID\",\"rating\":5,\"content\":\"미리 리뷰\",\"productId\":\"$P2\"}" "$BUYER_TOKEN"
[ "$CODE" = "400" ] && ok "판매완료 전 리뷰 거부 (400)" || bad "판매전 리뷰 CODE=$CODE RESP=$RESP"

# Seller marks P1 sold
api PUT "/products/$P1" '{"status":"sold"}' "$SELLER_TOKEN"
ST=$(echo "$RESP" | jq -r '.status')
echo "[mark sold] CODE=$CODE status=$ST"
[ "$CODE" = "200" ] && [ "$ST" = "sold" ] && ok "판매완료 처리 (status=sold)" || bad "판매완료 CODE=$CODE status=$ST"

# Buyer2 (no chat history) tries review -> 403
api POST /reviews "{\"sellerId\":\"$SELLER_ID\",\"rating\":5,\"content\":\"채팅없음\",\"productId\":\"$P1\"}" "$BUYER2_TOKEN"
[ "$CODE" = "403" ] && ok "채팅 이력 없는 유저 리뷰 거부 (403)" || bad "무채팅 리뷰 CODE=$CODE RESP=$RESP"

# invalid rating
api POST /reviews "{\"sellerId\":\"$SELLER_ID\",\"rating\":9,\"content\":\"별점초과\",\"productId\":\"$P1\"}" "$BUYER_TOKEN"
[ "$CODE" = "400" ] && ok "별점 범위초과(9) 거부 (400)" || bad "별점초과 CODE=$CODE"

# Buyer writes valid review (rating 4)
api POST /reviews "{\"sellerId\":\"$SELLER_ID\",\"rating\":4,\"content\":\"거래 친절하게 잘 했습니다. 스키 상태 좋아요.\",\"productId\":\"$P1\"}" "$BUYER_TOKEN"
RID=$(echo "$RESP" | jq -r '.id'); RRATE=$(echo "$RESP" | jq -r '.rating'); RBUYER=$(echo "$RESP" | jq -r '.buyer.name')
echo "[review] CODE=$CODE id=$RID rating=$RRATE buyer=$RBUYER"
[ "$CODE" = "201" ] && [ "$RRATE" = "4" ] && ok "구매자 리뷰 작성 (201, 별점4)" || bad "리뷰 작성 CODE=$CODE RESP=$RESP"
[ "$RBUYER" = "구매자영희" ] && ok "리뷰 응답 buyer.name=닉네임" || bad "리뷰 buyer.name=$RBUYER"

# Seller rating reflected
api GET "/reviews?sellerId=$SELLER_ID"
AVG=$(echo "$RESP" | jq -r '.averageRating'); TC=$(echo "$RESP" | jq -r '.totalCount')
echo "[seller reviews] avg=$AVG total=$TC"
[ "$CODE" = "200" ] && [ "$AVG" = "4" ] && [ "$TC" = "1" ] && ok "판매자 평점 반영 (avg=4, total=1)" || bad "평점 반영 avg=$AVG total=$TC"

# Duplicate review -> 400
api POST /reviews "{\"sellerId\":\"$SELLER_ID\",\"rating\":3,\"content\":\"중복 리뷰 시도\",\"productId\":\"$P1\"}" "$BUYER_TOKEN"
echo "[dup review] CODE=$CODE msg=$(echo "$RESP"|jq -r '.error')"
[ "$CODE" = "400" ] && ok "중복 리뷰 거부 (400)" || bad "중복 리뷰 CODE=$CODE RESP=$RESP"

cat >> "$SP/state.env" <<EOF
export REVIEW_ID="$RID"
EOF
echo "----- STEP4: PASS=$PASS FAIL=$FAIL -----"
