#!/bin/bash
BASE="http://localhost:4001/api"; BYPASS="X-Loadtest-Key: e2e-local-bypass"
SP="${E2E_STATE_DIR:-$(cd "$(dirname "$0")" && pwd)/.state}"
source "$SP/state.env"
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"  # register_verified·login·pq (관리자 계정 생성용)
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

# 탈퇴 전 식별자 확보 (재가입 제한 검사용)
api GET /auth/profile "" "$BUYER_TOKEN"
BUYER_PHONE=$(echo "$RESP" | jq -r '.phone // .user.phone // empty')
[ -n "$BUYER_PHONE" ] && ok "탈퇴 전 전화번호 확보" || bad "탈퇴 전 전화번호 없음 RESP=$(echo "$RESP" | head -c 120)"

# Delete buyer account
api DELETE /auth/account '{"password":"Re!pass1234"}' "$BUYER_TOKEN"
echo "[delete account] CODE=$CODE RESP=$RESP"
[ "$CODE" = "200" ] && ok "구매자 회원 탈퇴 (200)" || bad "탈퇴 CODE=$CODE RESP=$RESP"
echo "$RESP" | jq -e '.reregisterAfter | strings' >/dev/null 2>&1 && ok "탈퇴 응답에 재가입 가능일(reregisterAfter)" || bad "reregisterAfter 없음 RESP=$RESP"

# ── 탈퇴 후 재가입 제한 (90일): 같은 전화번호·이메일로 가입 불가, 인증문자도 발송 전 차단
api POST /auth/phone/send "{\"phone\":\"$BUYER_PHONE\"}"
[ "$CODE" = "403" ] && echo "$RESP" | grep -q "다시 가입할 수 없" && ok "탈퇴 번호 휴대폰 인증 요청 403 (재가입 제한)" || bad "탈퇴 번호 phone/send CODE=$CODE RESP=$(echo "$RESP" | head -c 120)"
api POST /auth/register "{\"email\":\"buyer_e2e@re.test\",\"password\":\"Re!pass1234\",\"name\":\"재가입\",\"nickname\":\"재가입시도\",\"phone\":\"$BUYER_PHONE\"}"
[ "$CODE" = "403" ] && echo "$RESP" | grep -q "다시 가입할 수 없" && ok "탈퇴 이메일·번호로 재가입 403 (재가입 제한)" || bad "재가입 CODE=$CODE RESP=$(echo "$RESP" | head -c 120)"
api POST /auth/register "{\"email\":\"buyer_e2e@re.test\",\"password\":\"Re!pass1234\",\"name\":\"재가입\",\"nickname\":\"재가입시도\",\"phone\":\"01099990099\"}"
[ "$CODE" = "403" ] && echo "$RESP" | grep -q "다시 가입할 수 없" && ok "탈퇴 이메일 + 새 번호도 403 (이메일 잠금)" || bad "이메일 잠금 CODE=$CODE RESP=$(echo "$RESP" | head -c 120)"

# ── 관리자 화면엔 원래 이름·이메일·전화가 남는다 (사기 대응, 사장님 결정 2026-09-26). 공개 프로필엔 절대 안 나감.
ADM8=$(register_verified "01099990085" "wd_admin@s8.test" "탈퇴관리자" "탈퇴관리자"); pq "UPDATE users SET role='admin' WHERE email='wd_admin@s8.test'" >/dev/null; ADMIN_TOKEN=$(login "wd_admin@s8.test" 'Re!pass1234')
api GET /admin/users "" "$ADMIN_TOKEN"
WROW=$(echo "$RESP" | jq -r --arg id "$BUYER_ID" '.[] | select(.id==$id) | [.role, .email, (.withdrawnEmail // ""), (.withdrawnName // ""), (.withdrawnPhone // ""), (.hasWithdrawnIdentity|tostring)] | join("|")')
echo "[admin row] $WROW"
case "$WROW" in "deleted|deleted_"*"|bu***@re.test|"*"|true") ok "관리자 목록: 탈퇴 회원 원래 이메일·이름 마스킹 표시 + 보존 표시" ;; *) bad "관리자 목록 마스킹: $WROW" ;; esac
echo "$WROW" | grep -qE '\|010\*\*\*\*[0-9]{4}\|' && ok "관리자 목록: 원래 전화번호 가운데 마스킹" || bad "전화 마스킹: $WROW"
api GET "/admin/users/$BUYER_ID/identity" "" "$ADMIN_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.withdrawnEmail')" = "buyer_e2e@re.test" ] && [ "$(echo "$RESP" | jq -r '.withdrawnPhone')" = "$BUYER_PHONE" ] && [ "$(echo "$RESP" | jq -r '.withdrawnProviders')" = "email" ] && ok "관리자 단건 조회: 원래 이메일·전화·로그인 수단" || bad "identity CODE=$CODE RESP=$(echo $RESP | head -c 150)"
api GET "/admin/users/$BUYER_ID/identity" "" "$BUYER2_TOKEN"; [ "$CODE" = "403" ] && ok "일반 회원의 원래 신원 조회 403" || bad "비관리자 identity CODE=$CODE"
LOGN=$(pq "SELECT count(*) FROM admin_access_logs WHERE action='withdrawn_identity_view' AND \"targetId\"='$BUYER_ID'"); [ "$LOGN" = "1" ] && ok "열람 기록 1건 남음" || bad "열람 기록 LOGN=$LOGN"
api GET "/auth/seller/$BUYER_ID" ""
echo "$RESP" | grep -qiE "withdrawn|buyer_e2e@re.test|$BUYER_PHONE" && bad "공개 프로필에 원래 신원 노출" || ok "공개 프로필엔 원래 신원 없음"

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

# 탈퇴 시 게시물 삭제 (사용자 결정 2026-09-13) — 글·투표는 사라지고, 후기·채팅은 익명으로 남는다
api GET "/community/$POST_ID"
[ "$CODE" = "404" ] && ok "탈퇴 회원의 커뮤니티 글 삭제됨 (404)" || bad "탈퇴 글 CODE=$CODE"
api GET "/polls/$POLL_ID"
[ "$CODE" = "404" ] && ok "탈퇴 회원의 투표 삭제됨 (404)" || bad "탈퇴 투표 CODE=$CODE"
api GET "/community?limit=50"
echo "$RESP" | jq -e --arg u "$BUYER_ID" '.posts[] | select(.userId==$u)' >/dev/null 2>&1 && bad "목록에 탈퇴 회원 글 남음" || ok "커뮤니티 목록에 탈퇴 회원 글 없음"

# Chat room other party (seller viewpoint)
api GET "/chat/rooms/$ROOM_ID" "" "$SELLER_TOKEN"
CHATOTHER=$(echo "$RESP" | jq -r "if .user1Id==\"$SELLER_ID\" then .user2.name else .user1.name end")
echo "[chat other] name=$CHATOTHER"
[ "$CHATOTHER" = "탈퇴한 회원" ] && ok "채팅 상대 → '탈퇴한 회원' 익명화" || bad "채팅 상대=$CHATOTHER"

# DB confirm
DBROW=$(psql "postgresql://snowtest@localhost:5433/snowpan_test" -tA -c "SELECT name||'|'||role||'|'||COALESCE(nickname,'NULL')||'|'||email FROM users WHERE id='$BUYER_ID';")
echo "[db row] $DBROW"
case "$DBROW" in "탈퇴한 회원|deleted|NULL|deleted_"*) ok "DB 익명화(name·nickname=탈퇴한회원, role=deleted, email 마스킹)";; *) bad "DB 익명화 미흡: $DBROW";; esac

# New chat to deleted user blocked
api POST /chat/rooms "{\"targetUserId\":\"$BUYER_ID\"}" "$SELLER_TOKEN"
echo "[chat to deleted] CODE=$CODE"
[ "$CODE" = "410" ] && ok "탈퇴 유저에게 새 채팅 차단 (410)" || bad "탈퇴 유저 채팅 CODE=$CODE"

echo "----- STEP8: PASS=$PASS FAIL=$FAIL -----"
