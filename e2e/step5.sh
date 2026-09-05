#!/bin/bash
BASE="http://localhost:4001/api"; BYPASS="X-Loadtest-Key: e2e-local-bypass"
PGURL="postgresql://snowtest@localhost:5433/snowpan_test"
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
pget() { psql "$PGURL" -tA -c "$1" 2>/dev/null; }

echo "===== STEP 5: 매물 수정 — subcategory XSS 검증 / 가격·상태 ====="

# subcategory에 <script> 주입 시도 -> 저장 안 됨(null)
api PUT "/products/$P2" '{"subcategory":"<script>alert(1)</script>"}' "$SELLER_TOKEN"
RSUB=$(echo "$RESP" | jq -r '.subcategory')
DBSUB=$(pget "SELECT COALESCE(subcategory,'<<null>>') FROM products WHERE id='$P2';")
echo "[subcat script] CODE=$CODE resp.subcategory=$RSUB db=$DBSUB"
[ "$CODE" = "200" ] && [ "$RSUB" = "null" ] && [ "$DBSUB" = "<<null>>" ] && ok "subcategory <script> 미저장(null) — 저장형 XSS 차단" || bad "subcategory 주입 방어 실패 resp=$RSUB db=$DBSUB CODE=$CODE"

# 임의 문자열 subcategory (화이트리스트 밖) -> null
api PUT "/products/$P2" '{"subcategory":"hacker_cat"}' "$SELLER_TOKEN"
RSUB2=$(echo "$RESP" | jq -r '.subcategory')
[ "$RSUB2" = "null" ] && ok "화이트리스트 밖 subcategory(hacker_cat) 미저장(null)" || bad "임의 subcategory 저장됨=$RSUB2"

# 유효 subcategory 수정 (board) -> 저장됨
api PUT "/products/$P2" '{"subcategory":"board"}' "$SELLER_TOKEN"
RSUB3=$(echo "$RESP" | jq -r '.subcategory')
[ "$RSUB3" = "board" ] && ok "유효 subcategory(board) 정상 저장" || bad "유효 subcategory 저장 실패=$RSUB3"

# 가격 수정
api PUT "/products/$P2" '{"price":99000}' "$SELLER_TOKEN"
RPRICE=$(echo "$RESP" | jq -r '.price')
echo "[price edit] CODE=$CODE price=$RPRICE"
[ "$CODE" = "200" ] && [ "$RPRICE" = "99000" ] && ok "가격 수정 (99000)" || bad "가격 수정 CODE=$CODE price=$RPRICE"

# 잘못된 가격(음수) 거부
api PUT "/products/$P2" '{"price":-5000}' "$SELLER_TOKEN"
[ "$CODE" = "400" ] && ok "음수 가격 수정 거부 (400)" || bad "음수 가격 CODE=$CODE"

# 상태 수정 reserved
api PUT "/products/$P2" '{"status":"reserved"}' "$SELLER_TOKEN"
RSTAT=$(echo "$RESP" | jq -r '.status')
echo "[status edit] CODE=$CODE status=$RSTAT"
[ "$CODE" = "200" ] && [ "$RSTAT" = "reserved" ] && ok "상태 수정 (reserved)" || bad "상태 수정 CODE=$CODE status=$RSTAT"

# 잘못된 상태 무시 (whitelist)
api PUT "/products/$P2" '{"status":"hacked"}' "$SELLER_TOKEN"
RSTAT2=$(echo "$RESP" | jq -r '.status')
[ "$CODE" = "200" ] && [ "$RSTAT2" = "reserved" ] && ok "허용밖 상태(hacked) 무시 — reserved 유지" || bad "잘못된 상태 처리 status=$RSTAT2"

# 타인 매물 수정 거부 (buyer가 seller 매물 수정 시도)
api PUT "/products/$P2" '{"price":1000}' "$BUYER_TOKEN"
[ "$CODE" = "403" ] && ok "타인 매물 수정 거부 (403)" || bad "타인 수정 CODE=$CODE"

# 이름에 <script> -> 태그 제거되어 저장 (sanitizeText)
api PUT "/products/$P2" '{"name":"<script>bad</script>정상이름"}' "$SELLER_TOKEN"
RNAME=$(echo "$RESP" | jq -r '.name')
echo "[name sanitize] name=$RNAME"
case "$RNAME" in *"<script>"*) bad "name에 script 태그 잔존=$RNAME";; *) ok "name sanitize — script 태그 제거됨('$RNAME')";; esac

echo "----- STEP5: PASS=$PASS FAIL=$FAIL -----"
