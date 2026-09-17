#!/bin/bash
# STEP 18: 판매 완료 시 구매자 지정 → 지정 구매자에게만 후기 요청 알림, 후기 자격은 지정 구매자만
#   후보 조회(판매자 전용·채팅 상대만·개인정보 없음) → 무채팅 상대 지정 400 → 지정 판매완료(buyerId·soldAt)
#   → 알림(구매자·판매자만) → 후기(제3자 403·구매자 201) → pending-for-me 노출 범위 → 판매중 복귀 시 해제 → 미지정(레거시) 경로
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

echo "===== STEP 18: 판매 완료 구매자 지정·후기 요청 ====="

SELLER_TOKEN=$(register_verified "01099980001" "sale_seller@s18.test" "판매자" "판매자")
BUYER_TOKEN=$(register_verified "01099980002" "sale_buyer@s18.test" "구매자" "구매자")
OTHER_TOKEN=$(register_verified "01099980003" "sale_other@s18.test" "구경꾼" "구경꾼")
SELLER_ID=$(pq "SELECT id FROM users WHERE email='sale_seller@s18.test'")
BUYER_ID=$(pq "SELECT id FROM users WHERE email='sale_buyer@s18.test'")
OTHER_ID=$(pq "SELECT id FROM users WHERE email='sale_other@s18.test'")
[ -n "$SELLER_TOKEN" ] && [ -n "$BUYER_TOKEN" ] && [ -n "$OTHER_TOKEN" ] && [ -n "$SELLER_ID" ] && [ -n "$BUYER_ID" ] && [ -n "$OTHER_ID" ] \
  && ok "유저 3명(판매자·구매자·제3자) 준비" || bad "유저 준비 실패 seller=$SELLER_TOKEN buyer=$BUYER_TOKEN other=$OTHER_TOKEN"

# ── 매물 등록
PNAME="S18 살로몬 스키 170"
api POST /products/used "{\"name\":\"$PNAME\",\"brand\":\"살로몬\",\"price\":250000,\"size\":\"170\",\"subcategory\":\"스키\",\"image\":\"/uploads/e2e.jpg\",\"condition\":\"상급\",\"description\":\"구매자 지정 검증 매물\"}" "$SELLER_TOKEN"
P=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$P" ] && ok "매물 등록 201" || bad "매물 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"

# ── 구매자만 판매자와 채팅방 개설(매물 문의). 제3자는 채팅 없음
api POST /chat/rooms "{\"targetUserId\":\"$SELLER_ID\",\"productName\":\"$PNAME\",\"productPath\":\"/used/$P\"}" "$BUYER_TOKEN"
ROOM=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "200" ] && [ -n "$ROOM" ] && ok "구매자 → 판매자 채팅방 개설(매물 문의)" || bad "채팅방 CODE=$CODE RESP=$(echo $RESP|head -c 120)"

# ── 구매자 후보 조회
api GET "/products/$P/buyer-candidates" "" "$SELLER_TOKEN"
HASB=$(echo "$RESP" | jq -r --arg u "$BUYER_ID" '[.candidates[]? | select(.id==$u)] | length')
HASO=$(echo "$RESP" | jq -r --arg u "$OTHER_ID" '[.candidates[]? | select(.id==$u)] | length')
[ "$CODE" = "200" ] && [ "$HASB" = "1" ] && ok "판매자 후보 조회 200 — 채팅 상대(구매자) 포함" || bad "후보 CODE=$CODE buyer=$HASB RESP=$(echo $RESP|head -c 160)"
[ "$HASO" = "0" ] && ok "채팅 안 한 제3자는 후보에 없음" || bad "제3자 후보 포함 other=$HASO"
BNAME=$(echo "$RESP" | jq -r --arg u "$BUYER_ID" '.candidates[]? | select(.id==$u) | .name')
[ "$BNAME" = "구매자" ] && ok "후보 표시명=닉네임" || bad "후보 이름=$BNAME"
BLAST=$(echo "$RESP" | jq -r --arg u "$BUYER_ID" '.candidates[]? | select(.id==$u) | .lastMessageAt // empty')
[ -n "$BLAST" ] && ok "후보에 최근 대화 시각(lastMessageAt)" || bad "lastMessageAt 없음"
LEAK=$(echo "$RESP" | grep -c "sale_buyer@s18.test\|\"email\"\|\"phone\"\|01099980002")
[ "$LEAK" = "0" ] && ok "후보 응답에 이메일·전화 미노출" || bad "후보 응답 개인정보 노출"
api GET "/products/$P/buyer-candidates" "" "$BUYER_TOKEN"
[ "$CODE" = "403" ] && ok "비판매자 후보 조회 403" || bad "비판매자 후보 CODE=$CODE"
api GET "/products/$P/buyer-candidates" ""
[ "$CODE" = "401" ] && ok "비로그인 후보 조회 401" || bad "비로그인 후보 CODE=$CODE"
api GET "/products/00000000-0000-4000-8000-000000000000/buyer-candidates" "" "$SELLER_TOKEN"
[ "$CODE" = "404" ] && ok "없는 매물 후보 조회 404" || bad "없는 매물 후보 CODE=$CODE"

# ── 구매자 지정 검증
api PUT "/products/$P" "{\"status\":\"sold\",\"buyerId\":\"$OTHER_ID\"}" "$SELLER_TOKEN"
[ "$CODE" = "400" ] && echo "$RESP" | grep -q "채팅한 상대만" && ok "채팅 없는 상대 구매자 지정 400" || bad "무채팅 지정 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
ST=$(pq "SELECT status FROM products WHERE id='$P'")
[ "$ST" = "selling" ] && ok "거부 시 상태 그대로(selling)" || bad "거부 후 status=$ST"
api PUT "/products/$P" '{"status":"sold","buyerId":"not-a-uuid"}' "$SELLER_TOKEN"
[ "$CODE" = "400" ] && ok "buyerId 형식 오류 400" || bad "형식 오류 CODE=$CODE"
api PUT "/products/$P" "{\"status\":\"sold\",\"buyerId\":\"$SELLER_ID\"}" "$SELLER_TOKEN"
[ "$CODE" = "400" ] && ok "판매자 본인 지정 400" || bad "본인 지정 CODE=$CODE"
api PUT "/products/$P" "{\"status\":\"sold\",\"buyerId\":\"$BUYER_ID\"}" "$OTHER_TOKEN"
[ "$CODE" = "403" ] && ok "타인 매물 판매완료 시도 403 (IDOR)" || bad "타인 변경 CODE=$CODE"

# ── 구매자 지정 판매완료
api PUT "/products/$P" "{\"status\":\"sold\",\"buyerId\":\"$BUYER_ID\"}" "$SELLER_TOKEN"
RB=$(echo "$RESP" | jq -r '.buyerId'); RS=$(echo "$RESP" | jq -r '.status'); RSA=$(echo "$RESP" | jq -r '.soldAt')
[ "$CODE" = "200" ] && [ "$RS" = "sold" ] && [ "$RB" = "$BUYER_ID" ] && [ "$RSA" != "null" ] && ok "구매자 지정 판매완료 200 (buyerId·soldAt 응답)" || bad "지정 판매완료 CODE=$CODE status=$RS buyerId=$RB soldAt=$RSA"
DBB=$(pq "SELECT COALESCE(\"buyerId\",'NULL') || '|' || (\"soldAt\" IS NOT NULL)::text FROM products WHERE id='$P'")
[ "$DBB" = "$BUYER_ID|true" ] && ok "DB buyerId·soldAt 기록" || bad "DB buyerId/soldAt=$DBB"

# ── 알림: 구매자에게만 후기 요청, 판매자에겐 발송 확인, 제3자 없음, 문의자 일괄 알림은 안 감
NB=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$BUYER_ID' AND title='거래가 완료됐어요' AND message LIKE '%$PNAME%' AND link='/seller/$SELLER_ID'")
[ "$NB" = "1" ] && ok "구매자 후기 요청 알림 (링크=/seller/판매자 — 채팅의 후기 진입점과 동일)" || bad "구매자 알림 n=$NB"
NS=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$SELLER_ID' AND title='후기 요청을 보냈어요'")
[ "$NS" = "1" ] && ok "판매자 '후기 요청을 보냈어요' 알림" || bad "판매자 알림 n=$NS"
NO=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OTHER_ID' AND (title='거래가 완료됐어요' OR title LIKE '거래 완료 — %')")
[ "$NO" = "0" ] && ok "제3자에게 알림 없음" || bad "제3자 알림 n=$NO"
NLEG=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$BUYER_ID' AND title LIKE '거래 완료 — %'")
[ "$NLEG" = "0" ] && ok "구매자 지정 시 문의자 일괄 알림은 안 감" || bad "일괄 알림 n=$NLEG"

# ── 응답 노출 범위: 상세엔 buyerId, 판매자 판매내역엔 구매자 표시명, 타인 조회엔 구매자 이름 없음
api GET "/products/$P" "" "$BUYER_TOKEN"
DB=$(echo "$RESP" | jq -r '.buyerId')
[ "$CODE" = "200" ] && [ "$DB" = "$BUYER_ID" ] && ok "상세 응답 buyerId 포함" || bad "상세 buyerId=$DB"
api GET "/products?userId=$SELLER_ID&category=used" "" "$SELLER_TOKEN"
LB=$(echo "$RESP" | jq -r --arg p "$P" '.products[]? | select(.id==$p) | .buyer.name // empty')
[ "$CODE" = "200" ] && [ "$LB" = "구매자" ] && ok "판매자 판매내역에 구매자 표시명(buyer.name)" || bad "판매내역 buyer=$LB RESP=$(echo $RESP|head -c 160)"
api GET "/products?userId=$SELLER_ID&category=used" "" "$OTHER_TOKEN"
LB2=$(echo "$RESP" | jq -r --arg p "$P" '.products[]? | select(.id==$p) | .buyer // empty')
[ "$CODE" = "200" ] && [ -z "$LB2" ] && ok "타인 조회엔 구매자 이름 없음" || bad "타인 조회 buyer=$LB2"

# ── 후기 자격: 제3자 403(지정 구매자 아님), 구매자 201
api POST /reviews "{\"sellerId\":\"$SELLER_ID\",\"rating\":5,\"content\":\"남의 거래 후기\",\"productId\":\"$P\"}" "$OTHER_TOKEN"
[ "$CODE" = "403" ] && echo "$RESP" | grep -q "구매자로 지정된 분만" && ok "지정 구매자 아닌 유저 후기 403" || bad "제3자 후기 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api GET /reviews/pending-for-me "" "$OTHER_TOKEN"
PO=$(echo "$RESP" | jq -r --arg p "$P" '[.pending[]? | select(.productId==$p)] | length')
[ "$CODE" = "200" ] && [ "$PO" = "0" ] && ok "제3자 pending-for-me 에 없음" || bad "제3자 pending=$PO"
api GET /reviews/pending-for-me "" "$BUYER_TOKEN"
PB=$(echo "$RESP" | jq -r --arg p "$P" '[.pending[]? | select(.productId==$p)] | length')
[ "$CODE" = "200" ] && [ "$PB" = "1" ] && ok "지정 구매자 pending-for-me 에 있음" || bad "구매자 pending=$PB RESP=$(echo $RESP|head -c 160)"
api GET "/reviews/eligible?sellerId=$SELLER_ID" "" "$BUYER_TOKEN"
EB=$(echo "$RESP" | jq -r --arg p "$P" '[.products[]? | select(.id==$p)] | length')
[ "$CODE" = "200" ] && [ "$EB" = "1" ] && ok "지정 구매자 eligible 에 있음" || bad "구매자 eligible=$EB"
api POST /reviews "{\"sellerId\":\"$SELLER_ID\",\"rating\":5,\"content\":\"지정 구매자 후기예요. 친절했어요.\",\"productId\":\"$P\"}" "$BUYER_TOKEN"
[ "$CODE" = "201" ] && ok "지정 구매자 후기 201" || bad "구매자 후기 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api GET /reviews/pending-for-me "" "$BUYER_TOKEN"
PB2=$(echo "$RESP" | jq -r --arg p "$P" '[.pending[]? | select(.productId==$p)] | length')
[ "$PB2" = "0" ] && ok "후기 작성 후 pending-for-me 에서 사라짐" || bad "후기 후 pending=$PB2"

# ── 판매중으로 되돌리면 구매자·완료시각 해제
api PUT "/products/$P" '{"status":"selling"}' "$SELLER_TOKEN"
CB=$(echo "$RESP" | jq -r '.buyerId'); CS=$(echo "$RESP" | jq -r '.soldAt')
[ "$CODE" = "200" ] && [ "$CB" = "null" ] && [ "$CS" = "null" ] && ok "판매중 복귀 시 buyerId·soldAt 해제" || bad "복귀 CODE=$CODE buyerId=$CB soldAt=$CS"

# ── 구매자 미지정 판매완료(앱 밖 거래) → 200, buyerId null, 문의자 일괄 알림(기존 동작) 유지
api PUT "/products/$P" '{"status":"sold"}' "$SELLER_TOKEN"
LB3=$(echo "$RESP" | jq -r '.buyerId'); LS3=$(echo "$RESP" | jq -r '.status')
[ "$CODE" = "200" ] && [ "$LS3" = "sold" ] && [ "$LB3" = "null" ] && ok "미지정 판매완료 200 (buyerId null)" || bad "미지정 CODE=$CODE status=$LS3 buyerId=$LB3"
SA=$(pq "SELECT (\"soldAt\" IS NOT NULL)::text FROM products WHERE id='$P'")
[ "$SA" = "true" ] && ok "미지정도 soldAt 기록" || bad "미지정 soldAt=$SA"
NLEG2=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$BUYER_ID' AND title LIKE '거래 완료 — %'")
[ "$NLEG2" = "1" ] && ok "미지정 시 문의자 일괄 알림(기존 경로) 유지" || bad "일괄 알림 n=$NLEG2"
NS2=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$SELLER_ID' AND title='후기 요청을 보냈어요'")
[ "$NS2" = "1" ] && ok "미지정 시 판매자 확인 알림은 추가로 안 감" || bad "미지정 판매자 알림 n=$NS2"

# ── 이미 판매완료인 매물에 나중에 구매자 지정 → buyerId 갱신 + 후기 요청
api PUT "/products/$P" "{\"status\":\"sold\",\"buyerId\":\"$BUYER_ID\"}" "$SELLER_TOKEN"
LB4=$(echo "$RESP" | jq -r '.buyerId')
[ "$CODE" = "200" ] && [ "$LB4" = "$BUYER_ID" ] && ok "판매완료 후 구매자 나중 지정 200" || bad "나중 지정 CODE=$CODE buyerId=$LB4"
NB2=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$BUYER_ID' AND title='거래가 완료됐어요'")
[ "$NB2" = "2" ] && ok "나중 지정도 구매자 후기 요청 알림" || bad "나중 지정 알림 n=$NB2"
# 같은 구매자로 다시 저장하면 중복 알림 없음
api PUT "/products/$P" "{\"status\":\"sold\",\"buyerId\":\"$BUYER_ID\"}" "$SELLER_TOKEN"
NB3=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$BUYER_ID' AND title='거래가 완료됐어요'")
[ "$CODE" = "200" ] && [ "$NB3" = "2" ] && ok "같은 구매자 재저장 시 중복 알림 없음" || bad "재저장 CODE=$CODE 알림 n=$NB3"

echo "----- STEP18: PASS=$PASS FAIL=$FAIL -----"
