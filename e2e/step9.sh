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

YONGPYONG=2808048b-a13b-42da-bb92-b24e6ed990b5
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

# ---- 프리미엄 확장 (렌탈) — 신규 모델 apply/revoke 경로 검증 ----
api POST /rentals "{\"name\":\"E2E렌탈샵\",\"area\":\"용평\",\"businessLicense\":\"/uploads/e2e.jpg\",\"resortId\":\"$YONGPYONG\"}" "$SELLER_TOKEN"
RID=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$RID" ] && ok "렌탈 등록 (201)" || bad "렌탈 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST /ad-booking/create "{\"slotType\":\"premium\",\"category\":\"rental\",\"title\":\"E2E렌탈프리미엄\",\"description\":\"t\",\"url\":\"/rental/$RID\",\"payMethod\":\"transfer\",\"periodMonths\":12,\"desiredStart\":\"$TODAY\"}" "$SELLER_TOKEN"
RBK=$(echo "$RESP" | jq -r '.bookingId // .booking.id // .id // empty')
[ "$CODE" = "201" ] && [ -n "$RBK" ] && ok "렌탈 프리미엄 신청 (201)" || bad "렌탈 프리미엄 신청 CODE=$CODE RESP=$(echo $RESP|head -c 150)"
# 타인 등록물 프리미엄 시도 차단 (buyer2=admin 토큰으로 seller 렌탈)
api POST /ad-booking/create "{\"slotType\":\"premium\",\"category\":\"rental\",\"title\":\"x\",\"description\":\"t\",\"url\":\"/rental/$RID\",\"payMethod\":\"transfer\",\"periodMonths\":12}" "$ADMIN_TOKEN"
[ "$CODE" = "403" ] && ok "타인 등록물 프리미엄 차단 (403)" || bad "타인 프리미엄 CODE=$CODE"
# kind-category 불일치 차단 (category=used 인데 url 은 렌탈 → 회계 오염 방지)
api POST /ad-booking/create "{\"slotType\":\"premium\",\"category\":\"used\",\"title\":\"x\",\"description\":\"t\",\"url\":\"/rental/$RID\",\"payMethod\":\"transfer\",\"periodMonths\":12}" "$SELLER_TOKEN"
[ "$CODE" = "400" ] && ok "프리미엄 kind-category 불일치 차단 (400)" || bad "불일치 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST "/ad-booking/admin/bookings/$RBK/free" "{}" "$ADMIN_TOKEN"
[ "$CODE" = "200" ] && ok "렌탈 프리미엄 무료 승인" || bad "렌탈 승인 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
RIP=$(pq "SELECT \"isPremium\" FROM rentals WHERE id='$RID';")
[ "$RIP" = "t" ] && ok "렌탈 isPremium 적용" || bad "렌탈 isPremium=$RIP"
api POST "/ad-booking/admin/bookings/$RBK/cancel" '{"reason":"E2E"}' "$ADMIN_TOKEN"
RIP=$(pq "SELECT \"isPremium\" FROM rentals WHERE id='$RID';")
[ "$RIP" = "f" ] && ok "렌탈 프리미엄 취소 해제" || bad "취소 후 렌탈 isPremium=$RIP"

# ---- 배너(메인) 광고 신청 → 입금 확인 승인 → 공개 배너 생성 ----
# 메인 배너는 문의형 — 관리자가 전화 협의 후 대리 등록
api POST /ad-booking/create "{\"slotType\":\"main_banner\",\"title\":\"E2E배너\",\"description\":\"테스트\",\"url\":\"https://snowpan.kr\",\"payMethod\":\"transfer\",\"periodMonths\":12,\"desiredStart\":\"$TODAY\"}" "$ADMIN_TOKEN"
BK2=$(echo "$RESP" | jq -r '.bookingId // .booking.id // .id // empty')
[ "$CODE" = "201" ] && [ -n "$BK2" ] && ok "메인 배너 관리자 대리 등록 (201)" || bad "배너 신청 CODE=$CODE RESP=$(echo $RESP|head -c 150)"
api POST "/ad-booking/admin/bookings/$BK2/approve" "{}" "$ADMIN_TOKEN"
[ "$CODE" = "200" ] && ok "입금 확인 승인 (200)" || bad "입금 승인 CODE=$CODE RESP=$(echo $RESP|head -c 150)"
BN=$(pq "SELECT count(*) FROM banners WHERE tag='ad:$BK2';")
[ "$BN" = "1" ] && ok "승인 즉시 공개 배너 자동 생성" || bad "배너 생성 안 됨 count=$BN"
# 공개 배너 API 에 adBookingId 포함 (클릭 추적용)
api GET "/banners" "" ""
ABID=$(echo "$RESP" | jq -r ".[] | select(.tag==\"ad:$BK2\" or .adBookingId==\"$BK2\") | .adBookingId // empty" 2>/dev/null | head -1)
[ "$ABID" = "$BK2" ] && ok "공개 배너에 adBookingId 포함" || bad "공개 배너 adBookingId=$ABID"
# 날짜 규칙(KST, 2026-09-09): 날짜 없이 승인 → "지금" 시작(자정으로 내리지 않음), 종료는 KST 23:59:59
# (컬럼은 timestamp without tz 에 UTC 값 — 'UTC' 로 먼저 붙인 뒤 Seoul 로 바꿔야 한다)
SDN=$(pq "SELECT extract(epoch from ((now() at time zone 'UTC') - \"startDate\")) BETWEEN 0 AND 300 FROM ad_bookings WHERE id='$BK2'"); [ "$SDN" = "t" ] && ok "날짜 없이 승인 → 시작 시각 = 지금" || bad "승인 시작 시각 now 아님 ($SDN)"
EDK=$(pq "SELECT to_char((\"endDate\" at time zone 'UTC') at time zone 'Asia/Seoul', 'HH24:MI:SS') FROM ad_bookings WHERE id='$BK2'"); [ "$EDK" = "23:59:59" ] && ok "종료일은 한국 시간 23:59:59" || bad "종료 시각 KST=$EDK"
# 오늘(KST) 날짜를 적어 승인 → 즉시 active (예전엔 UTC 자정=KST 09:00 까지 paid 로 대기)
api POST /ad-booking/create "{\"slotType\":\"category\",\"category\":\"rental\",\"title\":\"E2E오늘시작\",\"description\":\"KST\",\"url\":\"https://snowpan.kr\",\"payMethod\":\"transfer\",\"periodMonths\":12}" "$ADMIN_TOKEN"
BK3=$(echo "$RESP" | jq -r '.bookingId // .booking.id // .id // empty'); [ "$CODE" = "201" ] && [ -n "$BK3" ] && ok "카테고리 배너 대리 등록 (날짜 없음 → 지금)" || bad "카테고리 신청 CODE=$CODE $(echo $RESP|head -c 120)"
api POST "/ad-booking/admin/bookings/$BK3/approve" '{"startDate":"2020-01-01"}' "$ADMIN_TOKEN"; ST3=$(pq "SELECT status FROM ad_bookings WHERE id='$BK3'"); [ "$CODE" = "400" ] && [ "$ST3" = "pending_payment" ] && ok "과거 날짜 승인 거부 (400, 상태 유지)" || bad "과거 날짜 CODE=$CODE status=$ST3"
api POST "/ad-booking/admin/bookings/$BK3/approve" "{\"startDate\":\"$TODAY\"}" "$ADMIN_TOKEN"; ST3=$(pq "SELECT status FROM ad_bookings WHERE id='$BK3'"); [ "$CODE" = "200" ] && [ "$ST3" = "active" ] && ok "오늘(KST) 날짜로 승인 → 즉시 active" || bad "오늘 승인 CODE=$CODE status=$ST3"
SD3=$(pq "SELECT to_char((\"startDate\" at time zone 'UTC') at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') FROM ad_bookings WHERE id='$BK3'"); [ "$SD3" = "$TODAY 00:00" ] && ok "날짜 지정 시작 = 그 날 00:00 KST" || bad "시작 KST=$SD3"
api POST "/ad-booking/admin/bookings/$BK3/cancel" '{"reason":"E2E"}' "$ADMIN_TOKEN"

# ---- 광고 초대 링크: 관리자가 조건(자리·기간·금액) 발급 → 광고주가 소재만 제출 → 협의 금액으로 예약 ----
api POST /ad-booking/admin/invites '{"slotType":"main_banner","periodMonths":3,"price":1500000,"advertiser":"E2E광고주"}' "$SELLER_TOKEN"; [ "$CODE" = "403" ] && ok "일반 유저 초대 발급 403" || bad "초대 403 기대 CODE=$CODE"
api POST /ad-booking/admin/invites '{"slotType":"main_banner","periodMonths":3,"price":1500000,"advertiser":"E2E광고주"}' "$ADMIN_TOKEN"
IV=$(echo "$RESP" | jq -r '.id // empty'); IL=$(echo "$RESP" | jq -r '.link // empty'); [ "$CODE" = "201" ] && [ -n "$IV" ] && echo "$IL" | grep -q "/ad-booking/invite/$IV" && ok "관리자 초대 링크 발급 (201, 링크 포함)" || bad "초대 발급 CODE=$CODE $(echo $RESP|head -c 120)"
api POST /ad-booking/admin/invites '{"slotType":"main_banner","periodMonths":13,"price":1}' "$ADMIN_TOKEN"; [ "$CODE" = "400" ] && ok "초대 기간 13개월 400" || bad "초대 기간 CODE=$CODE"
api GET "/ad-booking/invite/$IV" "" "$SELLER_TOKEN"; IP=$(echo "$RESP" | jq -r '.price'); [ "$CODE" = "200" ] && [ "$IP" = "1500000" ] && ok "광고주 초대 조회 (협의 금액 노출)" || bad "초대 조회 CODE=$CODE price=$IP"
api GET "/ad-booking/invite/00000000-0000-4000-8000-000000000000" "" "$SELLER_TOKEN"; [ "$CODE" = "404" ] && ok "없는 초대 404" || bad "없는 초대 CODE=$CODE"
api POST "/ad-booking/invite/$IV/submit" '{"title":"E2E초대배너","description":"초대로 접수","url":"https://snowpan.kr","payMethod":"transfer"}' "$SELLER_TOKEN"
IB=$(echo "$RESP" | jq -r '.bookingId // empty'); IT=$(echo "$RESP" | jq -r '.totalPrice'); [ "$CODE" = "201" ] && [ -n "$IB" ] && [ "$IT" = "1500000" ] && ok "초대 링크로 메인 배너 소재 제출 → 협의 금액 예약 (201)" || bad "초대 제출 CODE=$CODE price=$IT $(echo $RESP|head -c 120)"
api GET "/ad-booking/invite/$IV" "" "$SELLER_TOKEN"; [ "$CODE" = "410" ] && ok "사용된 초대 410" || bad "사용된 초대 CODE=$CODE"
api GET /ad-booking/admin/invites "" "$ADMIN_TOKEN"; IS=$(echo "$RESP" | jq -r ".[] | select(.id==\"$IV\") | .effectiveStatus + \":\" + (.booking.id // \"\")"); [ "$IS" = "used:$IB" ] && ok "초대 목록에 사용됨·예약 연결" || bad "초대 목록 $IS"
api POST /ad-booking/admin/invites '{"slotType":"category","category":"rental","periodMonths":1,"price":0}' "$ADMIN_TOKEN"; IV2=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && ok "무료(0원) 초대 발급" || bad "0원 초대 CODE=$CODE"
api POST "/ad-booking/admin/invites/$IV2/cancel" "{}" "$ADMIN_TOKEN"; [ "$CODE" = "200" ] && ok "초대 취소" || bad "초대 취소 CODE=$CODE"
api GET "/ad-booking/invite/$IV2" "" "$SELLER_TOKEN"; [ "$CODE" = "410" ] && ok "취소된 초대 410" || bad "취소 초대 CODE=$CODE"
# 고객센터 채팅에서 발급 → 그 방에 링크 메시지 자동 전송
api POST /chat/rooms "{\"targetUserId\":\"$SELLER_ID\"}" "$ADMIN_TOKEN"; CR=$(echo "$RESP" | jq -r '.id // empty'); [ -n "$CR" ] && ok "관리자→광고주 채팅방 생성" || bad "채팅방 CODE=$CODE $(echo $RESP|head -c 100)"
api POST /ad-booking/admin/invites "{\"slotType\":\"premium\",\"category\":\"rental\",\"periodMonths\":12,\"price\":2200000,\"plan\":\"일시불\",\"chatRoomId\":\"$CR\"}" "$ADMIN_TOKEN"
IV3=$(echo "$RESP" | jq -r '.id // empty'); ST=$(echo "$RESP" | jq -r '.sentToChat'); [ "$CODE" = "201" ] && [ "$ST" = "true" ] && ok "채팅방으로 초대 발급 (sentToChat)" || bad "채팅 초대 CODE=$CODE sent=$ST $(echo $RESP|head -c 120)"
MC=$(pq "SELECT count(*) FROM messages WHERE \"roomId\"='$CR' AND type='ad_invite' AND content LIKE '%\"token\":\"$IV3\"%' AND content LIKE '%\"slotLabel\":\"프리미엄 노출\"%'"); [ "$MC" = "1" ] && ok "채팅방에 광고 신청 카드 메시지 1건 (type ad_invite, 토큰·자리 포함)" || bad "카드 메시지 count=$MC"
api GET "/chat/rooms/$CR/messages" "" "$SELLER_TOKEN"; MT=$(echo "$RESP" | jq -r '.[-1].type // empty'); MP=$(echo "$RESP" | jq -r '.[-1].content | fromjson | .path // empty'); [ "$MT" = "ad_invite" ] && [ "$MP" = "/ad-booking/invite/$IV3" ] && ok "광고주가 카드 메시지 조회 (path 내부 경로)" || bad "카드 조회 type=$MT path=$MP"
api POST /ad-booking/admin/invites '{"slotType":"premium","category":"rental","periodMonths":12,"price":1,"chatRoomId":"00000000-0000-4000-8000-000000000000"}' "$ADMIN_TOKEN"; [ "$CODE" = "400" ] && ok "없는 채팅방 지정 400" || bad "없는 방 CODE=$CODE"

echo "----- STEP9: PASS=$PASS FAIL=$FAIL -----"
