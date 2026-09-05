#!/bin/bash
# STEP 10: tokenVersion 세션 무효화 — 비번 변경 시 옛 토큰 즉시 거절 + 같은 초 재로그인 정상
BASE="http://localhost:4001/api"
SP="${E2E_STATE_DIR:-$(cd "$(dirname "$0")" && pwd)/.state}"
export PATH="$(ls -d /opt/homebrew/opt/postgresql@*/bin 2>/dev/null | sort -V | tail -1):$PATH"
pq() { psql -h localhost -p 5433 -U snowtest -d snowpan_test -tA -c "$1"; }
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

jwt_tv() { printf '%s' "$1" | python3 -c "import sys,base64,json;p=sys.stdin.read().split('.')[1];p+='='*(-len(p)%4);print(json.loads(base64.urlsafe_b64decode(p)).get('tv','none'))" 2>/dev/null; }

echo "===== STEP 10: tokenVersion 세션 무효화 ====="
source "$SP/state.env"

# 판매자 토큰으로 시작 (state.env 의 SELLER_TOKEN)
api GET /auth/profile "" "$SELLER_TOKEN"
[ "$CODE" = "200" ] && ok "변경 전 기존 토큰 유효 (200)" || bad "사전 토큰 CODE=$CODE"

# tv 클레임 발급 확인 (JWT payload 디코드)
TV=$(jwt_tv "$SELLER_TOKEN")
[ "$TV" != "none" ] && ok "access 토큰에 tv 클레임 포함 (tv=$TV)" || bad "tv 클레임 없음"

# 비밀번호 변경 → tokenVersion +1
api PUT /auth/change-password '{"currentPassword":"Re!pass1234","newPassword":"Re!pass5678"}' "$SELLER_TOKEN"
[ "$CODE" = "200" ] && ok "비밀번호 변경 (200)" || bad "비번 변경 CODE=$CODE RESP=$RESP"
DBTV=$(pq "SELECT \"tokenVersion\" FROM users WHERE id='$SELLER_ID';")
[ "$DBTV" -ge 1 ] && ok "DB tokenVersion 증가 (=$DBTV)" || bad "tokenVersion=$DBTV"

# 옛 토큰 즉시 거절 (같은 초여도 tv 불일치라 무조건 401)
api GET /auth/profile "" "$SELLER_TOKEN"
[ "$CODE" = "401" ] && ok "변경 직후 옛 토큰 즉시 거절 (401)" || bad "옛 토큰 CODE=$CODE"

# 같은 초 재로그인 — 새 토큰은 새 tv 를 갖고 정상 동작해야 함 (이전 iat 경계 회귀 방지)
api POST /auth/login '{"email":"seller_e2e@re.test","password":"Re!pass5678"}'
NEWTOK=$(echo "$RESP" | jq -r '.token // empty')
[ "$CODE" = "200" ] && [ -n "$NEWTOK" ] && ok "변경 직후 재로그인 성공 (200)" || bad "재로그인 CODE=$CODE"
api GET /auth/profile "" "$NEWTOK"
[ "$CODE" = "200" ] && ok "새 토큰 즉시 유효 (200) — 같은-초 경계 회귀 없음" || bad "새 토큰 CODE=$CODE"
NEWTV=$(jwt_tv "$NEWTOK")
[ "$NEWTV" = "$DBTV" ] && ok "새 토큰 tv=DB tokenVersion (=$NEWTV)" || bad "새 tv=$NEWTV DB=$DBTV"

# 원상 복구 (다른 스텝 재실행 대비 비번 원복)
api PUT /auth/change-password '{"currentPassword":"Re!pass5678","newPassword":"Re!pass1234"}' "$NEWTOK"
[ "$CODE" = "200" ] && ok "비밀번호 원복 (200)" || bad "원복 CODE=$CODE"

echo "----- STEP10: PASS=$PASS FAIL=$FAIL -----"
