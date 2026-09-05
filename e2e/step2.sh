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
mkprod() { # name brand price size subcat
  api POST /products/used "{\"name\":\"$1\",\"brand\":\"$2\",\"price\":$3,\"size\":\"$4\",\"subcategory\":\"$5\",\"image\":\"/uploads/e2e.jpg\",\"condition\":\"상급\",\"description\":\"E2E 테스트 매물\"}" "$SELLER_TOKEN"
}

echo "===== STEP 2: 매물 등록 / 정렬 / 필터 ====="
mkprod "E2Eski 살로몬 스키 170" "Salomon" 500000 "170cm" "ski"
P1=$(echo "$RESP" | jq -r '.id'); echo "[P1] CODE=$CODE id=$P1 price=$(echo "$RESP"|jq -r .price) sub=$(echo "$RESP"|jq -r .subcategory)"
[ "$CODE" = "201" ] && [ "$P1" != "null" ] && ok "매물1 등록 (ski/Salomon/500000/170cm)" || bad "매물1 등록 CODE=$CODE RESP=$RESP"

mkprod "E2Eski 아토믹 스키 165" "Atomic" 150000 "165cm" "ski"
P2=$(echo "$RESP" | jq -r '.id'); echo "[P2] CODE=$CODE id=$P2"
[ "$CODE" = "201" ] && [ "$P2" != "null" ] && ok "매물2 등록 (ski/Atomic/150000/165cm)" || bad "매물2 등록 CODE=$CODE RESP=$RESP"

mkprod "E2Eski 살로몬 스키 168" "Salomon" 300000 "168cm" "ski"
P3=$(echo "$RESP" | jq -r '.id'); echo "[P3] CODE=$CODE id=$P3"
[ "$CODE" = "201" ] && [ "$P3" != "null" ] && ok "매물3 등록 (ski/Salomon/300000/168cm)" || bad "매물3 등록 CODE=$CODE RESP=$RESP"

# size 170cm 저장 확인
SZ=$(psql "postgresql://snowtest@localhost:5433/snowpan_test" -tA -c "SELECT size FROM products WHERE id='$P1';")
[ "$SZ" = "170cm" ] && ok "size 필드 '170cm' 저장 확인" || bad "size 저장값=$SZ"

# 목록 노출 (seller listing)
api GET "/products?userId=$SELLER_ID"
CNT=$(echo "$RESP" | jq -r '[.products[]|select(.name|startswith("E2Eski"))]|length')
echo "[list userId] CODE=$CODE E2Eski count=$CNT total=$(echo "$RESP"|jq -r '.totalCount')"
[ "$CODE" = "200" ] && [ "$CNT" = "3" ] && ok "판매자 목록에 3개 매물 노출" || bad "목록 노출 count=$CNT CODE=$CODE"

# 공개 검색 노출
api GET "/products?search=E2Eski&vertical=snow"
SCNT=$(echo "$RESP" | jq -r '[.products[]|select(.name|startswith("E2Eski"))]|length')
[ "$CODE" = "200" ] && [ "$SCNT" -ge 3 ] && ok "공개 검색(search=E2Eski) 노출 ($SCNT건)" || bad "공개 검색 노출 count=$SCNT CODE=$CODE"

# ===== price_asc =====
api GET "/products?userId=$SELLER_ID&sort=price_asc"
ASC=$(echo "$RESP" | jq -c '[.products[]|select(.name|startswith("E2Eski"))|.price]')
echo "[price_asc] $ASC"
[ "$ASC" = "[150000,300000,500000]" ] && ok "price_asc 실제 가격 오름차순 [150000,300000,500000]" || bad "price_asc 순서 오류: $ASC"

# ===== price_desc =====
api GET "/products?userId=$SELLER_ID&sort=price_desc"
DESC=$(echo "$RESP" | jq -c '[.products[]|select(.name|startswith("E2Eski"))|.price]')
echo "[price_desc] $DESC"
[ "$DESC" = "[500000,300000,150000]" ] && ok "price_desc 실제 가격 내림차순 [500000,300000,150000]" || bad "price_desc 순서 오류: $DESC"

# ===== brand filter =====
api GET "/products?userId=$SELLER_ID&brand=Salomon"
BSAL=$(echo "$RESP" | jq -c '[.products[]|select(.name|startswith("E2Eski"))|.brand]|sort')
echo "[brand=Salomon] $BSAL"
[ "$BSAL" = '["Salomon","Salomon"]' ] && ok "브랜드 필터 Salomon → 2건 모두 Salomon" || bad "브랜드 Salomon 결과: $BSAL"

api GET "/products?userId=$SELLER_ID&brand=Atomic"
BATO=$(echo "$RESP" | jq -c '[.products[]|select(.name|startswith("E2Eski"))|.brand]')
echo "[brand=Atomic] $BATO"
[ "$BATO" = '["Atomic"]' ] && ok "브랜드 필터 Atomic → 1건" || bad "브랜드 Atomic 결과: $BATO"

# 부분일치(대소문자 무시) 확인
api GET "/products?userId=$SELLER_ID&brand=salo"
BSUB=$(echo "$RESP" | jq -r '[.products[]|select(.name|startswith("E2Eski"))]|length')
[ "$BSUB" = "2" ] && ok "브랜드 부분일치(소문자 salo) → 2건" || bad "브랜드 부분일치 결과=$BSUB"

# ===== length filter 170~ =====
api GET "/products?userId=$SELLER_ID&lengthMin=170"
L170=$(echo "$RESP" | jq -c '[.products[]|select(.name|startswith("E2Eski"))|.size]|sort')
echo "[lengthMin=170] $L170"
[ "$L170" = '["170cm"]' ] && ok "길이필터 170~ → 170cm 매물만 (1건)" || bad "길이 170~ 결과: $L170"

# ===== length filter 160-169 =====
api GET "/products?userId=$SELLER_ID&lengthMin=160&lengthMax=169"
L160=$(echo "$RESP" | jq -c '[.products[]|select(.name|startswith("E2Eski"))|.size]|sort')
echo "[length 160-169] $L160"
[ "$L160" = '["165cm","168cm"]' ] && ok "길이필터 160~169 → 165cm,168cm (2건)" || bad "길이 160-169 결과: $L160"

# 상세 조회
api GET "/products/$P1"
DNAME=$(echo "$RESP" | jq -r '.name'); DUSER=$(echo "$RESP" | jq -r '.user.name // .user.nickname')
[ "$CODE" = "200" ] && [ "$DNAME" != "null" ] && ok "매물 상세 조회 (200)" || bad "매물 상세 CODE=$CODE"

cat >> "$SP/state.env" <<EOF
export P1="$P1"
export P2="$P2"
export P3="$P3"
EOF
echo "----- STEP2: PASS=$PASS FAIL=$FAIL -----"
