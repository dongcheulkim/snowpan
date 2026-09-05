#!/bin/bash
# STEP 9: 광고 흐름 — 신청 → 승인(무료/입금) → 프리미엄 자동적용 → 클릭 추적 → 1년 계약 해지 차단
BASE="http://localhost:4001/api"
SP="${E2E_STATE_DIR:-$(cd "$(dirname "$0")" && pwd)/.state}"
source "$SP/state.env"
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
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

echo "===== STEP 9: 광고 흐름 (신청→승인→프리미엄→클릭→해지차단) ====="

# 어드민 확보 — buyer2 를 승격
pq "UPDATE users SET role='admin' WHERE id='$BUYER2_ID';" >/dev/null
ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"buyer2_e2e@re.test","password":"Re!pass1234"}' | jq -r '.token // empty')
[ -n "$ADMIN_TOKEN" ] && ok "어드민 승격+로그인" || bad "어드민 로그인 실패"

# 판매자 매물 하나 확보 (P3 — selling 상태)
api GET "/products/$P3" "" "$SELLER_TOKEN"
PST=$(echo "$RESP" | jq -r '.status')
echo "[P3] status=$PST"

# ---- 프리미엄 광고 신청 (판매자 본인 매물) ----
TODAY=$(date +%Y-%m-%d)
api POST /ad-booking/create "{\"slotType\":\"premium\",\"category\":\"used\",\"title\":\"E2E프리미엄\",\"description\":\"테스트\",\"url\":\"/used/$P3\",\"payMethod\":\"transfer\",\"periodMonths\":12,\"desiredStart\":\"$TODAY\"}" "$SELLER_TOKEN"
BK=$(echo "$RESP" | jq -r '.bookingId // .booking.id // .id // empty')
echo "[premium booking] CODE=$CODE id=$BK RESP=$(echo $RESP | head -c 200)"
[ "$CODE" = "201" ] && [ -n "$BK" ] && ok "프리미엄 광고 신청 (201)" || bad "프리미엄 신청 CODE=$CODE RESP=$RESP"

# 신청 직후 매물 프리미엄 아직 아님 (승인 전)
IP=$(pq "SELECT \"isPremium\" FROM products WHERE id='$P3';")
[ "$IP" = "f" ] && ok "승인 전 프리미엄 미적용 (isPremium=f)" || bad "승인 전 isPremium=$IP"

# 어드민 목록에서 보임 + 상태 pending_payment
api GET "/ad-booking/admin/bookings" "" "$ADMIN_TOKEN"
BST=$(echo "$RESP" | jq -r ".[] | select(.id==\"$BK\") | .status")
[ "$BST" = "pending_payment" ] && ok "어드민 목록 노출 (pending_payment)" || bad "어드민 목록 상태=$BST"

# 일반 유저는 어드민 목록 403
api GET "/ad-booking/admin/bookings" "" "$SELLER_TOKEN"
[ "$CODE" = "403" ] && ok "일반유저 어드민 광고목록 차단 (403)" || bad "권한 차단 실패 CODE=$CODE"

# ---- 무료 승인 (즉시 시작) ----
api POST "/ad-booking/admin/bookings/$BK/free" "{}" "$ADMIN_TOKEN"
echo "[free approve] CODE=$CODE RESP=$(echo $RESP | head -c 150)"
[ "$CODE" = "200" ] && ok "무료 승인 (200)" || bad "무료 승인 CODE=$CODE RESP=$RESP"

# 승인 즉시 프리미엄 적용 + premiumUntil 설정
IP=$(pq "SELECT \"isPremium\" FROM products WHERE id='$P3';")
PU=$(pq "SELECT \"premiumUntil\" FROM products WHERE id='$P3';")
[ "$IP" = "t" ] && [ -n "$PU" ] && ok "승인 즉시 프리미엄 적용 (isPremium=t, until=$PU)" || bad "프리미엄 적용 실패 isPremium=$IP until=$PU"

# 상태 active 확인
BST=$(pq "SELECT status FROM ad_bookings WHERE id='$BK';")
[ "$BST" = "active" ] && ok "예약 상태 active" || bad "예약 상태=$BST"

# ---- 클릭 추적 (공개, 비인증) ----
CC0=$(pq "SELECT \"clickCount\" FROM ad_bookings WHERE id='$BK';")
api POST "/ad-booking/$BK/click" "{}" ""
CC1=$(pq "SELECT \"clickCount\" FROM ad_bookings WHERE id='$BK';")
[ "$CC1" = "$((CC0+1))" ] && ok "클릭 추적 +1 ($CC0→$CC1)" || bad "클릭 추적 $CC0→$CC1 CODE=$CODE"

# 존재하지 않는 예약 클릭 — 500 아니어야
api POST "/ad-booking/00000000-0000-0000-0000-000000000000/click" "{}" ""
[ "$CODE" != "500" ] && ok "미존재 예약 클릭 무500 (CODE=$CODE)" || bad "미존재 클릭 500"

# ---- 1년 계약: 활성 광고 사용자 취소 차단 ----
api POST "/ad-booking/$BK/cancel" "{}" "$SELLER_TOKEN"
echo "[user cancel active] CODE=$CODE RESP=$(echo $RESP | head -c 150)"
[ "$CODE" = "400" ] || [ "$CODE" = "403" ] && ok "활성 광고 사용자 취소 차단 ($CODE)" || bad "활성 취소 차단 실패 CODE=$CODE RESP=$RESP"

# ---- 어드민 취소 → 프리미엄 즉시 해제 ----
api POST "/ad-booking/admin/bookings/$BK/cancel" '{"reason":"E2E 테스트 취소"}' "$ADMIN_TOKEN"
[ "$CODE" = "200" ] && ok "어드민 취소 (200)" || bad "어드민 취소 CODE=$CODE RESP=$RESP"
IP=$(pq "SELECT \"isPremium\" FROM products WHERE id='$P3';")
[ "$IP" = "f" ] && ok "취소 시 프리미엄 즉시 해제 (isPremium=f)" || bad "취소 후 isPremium=$IP"

# ---- 배너(메인) 광고 신청 → 입금 확인 승인 → 공개 배너 생성 ----
api POST /ad-booking/create "{\"slotType\":\"main_banner\",\"title\":\"E2E배너\",\"description\":\"테스트\",\"url\":\"https://snowpan.kr\",\"payMethod\":\"transfer\",\"periodMonths\":12,\"desiredStart\":\"$TODAY\"}" "$SELLER_TOKEN"
BK2=$(echo "$RESP" | jq -r '.bookingId // .booking.id // .id // empty')
[ "$CODE" = "201" ] && [ -n "$BK2" ] && ok "메인 배너 신청 (201)" || bad "배너 신청 CODE=$CODE RESP=$(echo $RESP|head -c 150)"
api POST "/ad-booking/admin/bookings/$BK2/approve" "{}" "$ADMIN_TOKEN"
[ "$CODE" = "200" ] && ok "입금 확인 승인 (200)" || bad "입금 승인 CODE=$CODE RESP=$(echo $RESP|head -c 150)"
BN=$(pq "SELECT count(*) FROM banners WHERE tag='ad:$BK2';")
[ "$BN" = "1" ] && ok "승인 즉시 공개 배너 자동 생성" || bad "배너 생성 안 됨 count=$BN"
# 공개 배너 API 에 adBookingId 포함 (클릭 추적용)
api GET "/banners" "" ""
ABID=$(echo "$RESP" | jq -r ".[] | select(.tag==\"ad:$BK2\" or .adBookingId==\"$BK2\") | .adBookingId // empty" 2>/dev/null | head -1)
[ "$ABID" = "$BK2" ] && ok "공개 배너에 adBookingId 포함" || bad "공개 배너 adBookingId=$ABID"

echo "----- STEP9: PASS=$PASS FAIL=$FAIL -----"
