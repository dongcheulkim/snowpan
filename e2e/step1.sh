#!/bin/bash
BASE="http://localhost:4001/api"
BYPASS="X-Loadtest-Key: e2e-local-bypass"
PGURL="postgresql://snowtest@localhost:5433/snowpan_test"
SP="${E2E_STATE_DIR:-$(cd "$(dirname "$0")" && pwd)/.state}"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
api() {
  local method=$1 path=$2 body=$3 token=$4
  local hdr=(-H "$BYPASS" -H 'Content-Type: application/json')
  [ -n "$token" ] && hdr+=(-H "Authorization: Bearer $token")
  local out
  if [ -n "$body" ]; then
    out=$(curl -s -m 20 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path" -d "$body")
  else
    out=$(curl -s -m 20 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path")
  fi
  CODE=$(printf '%s' "$out" | tail -n1)
  RESP=$(printf '%s' "$out" | sed '$d')
}
pget() { psql "$PGURL" -tA -c "$1" 2>/dev/null; }
register_user() {
  local phone=$1 email=$2 name=$3 nick=$4 pass=$5
  curl -s -m 20 -H "$BYPASS" -H 'Content-Type: application/json' -X POST "$BASE/auth/phone/send" -d "{\"phone\":\"$phone\"}" >/dev/null
  local code; code=$(pget "SELECT code FROM phone_verifications WHERE phone='$phone' ORDER BY \"createdAt\" DESC LIMIT 1;")
  curl -s -m 20 -H "$BYPASS" -H 'Content-Type: application/json' -X POST "$BASE/auth/phone/verify" -d "{\"phone\":\"$phone\",\"code\":\"$code\"}" >/dev/null
  api POST /auth/register "{\"email\":\"$email\",\"password\":\"$pass\",\"name\":\"$name\",\"nickname\":\"$nick\",\"phone\":\"$phone\"}"
}

echo "===== STEP 1: 회원가입 → 로그인 → 프로필 ====="
register_user "01044440002" "seller_e2e@re.test" "김철수" "판매왕철수" "Re!pass1234"
echo "[register seller] CODE=$CODE"
SELLER_ID=$(echo "$RESP" | jq -r '.user.id'); SELLER_TOKEN=$(echo "$RESP" | jq -r '.token')
SNAME=$(echo "$RESP" | jq -r '.user.name')
[ "$CODE" = "201" ] && [ "$SELLER_ID" != "null" ] && ok "판매자 회원가입 (201, id 발급)" || bad "판매자 회원가입 CODE=$CODE RESP=$RESP"
[ "$SNAME" = "판매왕철수" ] && ok "가입 응답 name=닉네임" || bad "가입 응답 name=$SNAME"

register_user "01044440003" "buyer_e2e@re.test" "이영희" "구매자영희" "Re!pass1234"
echo "[register buyer] CODE=$CODE"
BUYER_ID=$(echo "$RESP" | jq -r '.user.id'); BUYER_TOKEN=$(echo "$RESP" | jq -r '.token')
[ "$CODE" = "201" ] && [ "$BUYER_ID" != "null" ] && ok "구매자 회원가입 (201, id 발급)" || bad "구매자 회원가입 CODE=$CODE RESP=$RESP"

register_user "01044440004" "buyer2_e2e@re.test" "박민수" "구매자민수" "Re!pass1234"
BUYER2_ID=$(echo "$RESP" | jq -r '.user.id'); BUYER2_TOKEN=$(echo "$RESP" | jq -r '.token')
[ "$CODE" = "201" ] && ok "추가 구매자 회원가입 (201)" || bad "추가 구매자 회원가입 CODE=$CODE RESP=$RESP"

register_user "01044440002" "dup_e2e@re.test" "중복" "중복닉" "Re!pass1234"
[ "$CODE" = "400" ] && ok "중복 전화번호 가입 거부 (400)" || bad "중복 전화 거부 CODE=$CODE RESP=$RESP"

api POST /auth/login '{"email":"seller_e2e@re.test","password":"Re!pass1234"}'
echo "[login seller] CODE=$CODE"
LT=$(echo "$RESP" | jq -r '.token')
[ "$CODE" = "200" ] && [ "$LT" != "null" ] && ok "판매자 로그인 (200, token)" || bad "판매자 로그인 CODE=$CODE RESP=$RESP"
SELLER_TOKEN="$LT"

api POST /auth/login '{"email":"seller_e2e@re.test","password":"WrongPass999"}'
[ "$CODE" = "401" ] && ok "잘못된 비번 로그인 거부 (401)" || bad "잘못된 비번 CODE=$CODE"

api GET /auth/profile "" "$SELLER_TOKEN"
echo "[profile] CODE=$CODE RESP=$RESP"
PNAME=$(echo "$RESP" | jq -r '.name'); PNICK=$(echo "$RESP" | jq -r '.nickname')
[ "$CODE" = "200" ] && [ "$PNAME" = "판매왕철수" ] && [ "$PNICK" = "판매왕철수" ] && ok "프로필 닉네임(판매왕철수) 표시" || bad "프로필 CODE=$CODE name=$PNAME nick=$PNICK"

cat > "$SP/state.env" <<EOF
export SELLER_ID="$SELLER_ID"
export SELLER_TOKEN="$SELLER_TOKEN"
export BUYER_ID="$BUYER_ID"
export BUYER_TOKEN="$BUYER_TOKEN"
export BUYER2_ID="$BUYER2_ID"
export BUYER2_TOKEN="$BUYER2_TOKEN"
EOF
echo "----- STEP1: PASS=$PASS FAIL=$FAIL -----"
echo "SELLER_ID=$SELLER_ID BUYER_ID=$BUYER_ID BUYER2_ID=$BUYER2_ID"
