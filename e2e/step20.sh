#!/bin/bash
# STEP 20: 매장 직원(공동 관리) — 초대 링크 → 직원 참여 → 예약 확정·매장 수정·소식·리뷰 답글 허용, 삭제·직원 관리는 사장님만, 해제·만료·회수
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

echo "===== STEP 20: 매장 직원(공동 관리) ====="
# 같은 DB 로 이 스텝만 다시 돌릴 때(./e2e/run.sh 20)는 이미 가입돼 있으니 로그인으로 대체하고, 이전 실행의 알림은 지운다
OWNER=$(register_verified "01099990201" "st_owner@s20.test" "직원사장" "직원사장"); [ -z "$OWNER" ] && OWNER=$(login "st_owner@s20.test" 'Re!pass1234')
STAFF=$(register_verified "01099990202" "st_staff@s20.test" "직원" "직원"); [ -z "$STAFF" ] && STAFF=$(login "st_staff@s20.test" 'Re!pass1234')
CUST=$(register_verified "01099990203" "st_cust@s20.test" "직원손님" "직원손님"); [ -z "$CUST" ] && CUST=$(login "st_cust@s20.test" 'Re!pass1234')
ADM=$(register_verified "01099990204" "st_admin@s20.test" "직원관리자" "직원관리자")
pq "DELETE FROM notifications WHERE \"userId\" IN (SELECT id FROM users WHERE email LIKE '%@s20.test')" >/dev/null
pq "UPDATE users SET role='admin' WHERE email='st_admin@s20.test'" >/dev/null
ADM=$(login "st_admin@s20.test" 'Re!pass1234')
OWNER_ID=$(pq "SELECT id FROM users WHERE email='st_owner@s20.test'")
STAFF_ID=$(pq "SELECT id FROM users WHERE email='st_staff@s20.test'")
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$CUST" ] && [ -n "$ADM" ] && ok "유저 4명 준비" || bad "유저 준비 실패"

# ── 매장: 렌탈 등록 → 미승인 땐 초대 불가 → 승인
api POST /rentals '{"name":"S20렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; RENTAL=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$RENTAL" ] && ok "렌탈 등록" || bad "렌탈 등록 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"
[ "$CODE" = "400" ] && ok "미승인 매장은 초대 불가 400" || bad "미승인 초대 CODE=$CODE"
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && ok "렌탈 승인" || bad "렌탈 승인 CODE=$CODE"

# ── 초대 링크: 남 403, 사장님 201, 미리보기, 본인 참여 400, 직원 참여 201, 재참여 200, 사장님 알림
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$STAFF"; [ "$CODE" = "403" ] && ok "남이 초대 링크 만들기 403" || bad "남 초대 CODE=$CODE"
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty'); URL=$(echo "$RESP" | jq -r '.url // empty')
[ "$CODE" = "201" ] && [ -n "$INV" ] && echo "$URL" | grep -q "/invite/$INV" && ok "사장님 초대 링크 생성 201 (/invite/코드)" || bad "초대 생성 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api GET "/shop-staff/invites/$INV" "" "$STAFF"; V=$(echo "$RESP" | jq -r '.valid'); SN=$(echo "$RESP" | jq -r '.shopName')
[ "$CODE" = "200" ] && [ "$V" = "true" ] && [ "$SN" = "S20렌탈" ] && ok "초대 미리보기 (매장명·유효)" || bad "미리보기 CODE=$CODE v=$V name=$SN"
api POST "/shop-staff/invites/$INV/accept" "" "$OWNER"; [ "$CODE" = "400" ] && ok "사장님 본인 참여 400" || bad "본인 참여 CODE=$CODE"
api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "201" ] && ok "직원 참여 201" || bad "참여 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "200" ] && ok "재참여는 200 (이미 직원)" || bad "재참여 CODE=$CODE"
NO=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWNER_ID' AND title='직원이 참여했어요'")
[ "$NO" = "1" ] && ok "사장님에게 직원 참여 알림" || bad "참여 알림 n=$NO"
api GET /shop-staff/mine "" "$STAFF"; MN=$(echo "$RESP" | jq -r "[.items[] | select(.shopId==\"$RENTAL\")] | length")
[ "$MN" = "1" ] && ok "직원 매장 목록(mine)" || bad "mine n=$MN"
api GET /rentals/my "" "$STAFF"; SR=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$RENTAL\")][0].staffRole // empty")
[ "$SR" = "staff" ] && ok "/rentals/my 에 직원 매장 + staffRole" || bad "rentals/my staffRole=$SR"
api GET "/shop-staff/access/rental/$RENTAL" "" "$STAFF"; CM=$(echo "$RESP" | jq -r '.canManage'); IS=$(echo "$RESP" | jq -r '.isStaff')
[ "$CM" = "true" ] && [ "$IS" = "true" ] && ok "access: 직원 canManage·isStaff" || bad "access cm=$CM is=$IS"
api GET "/shop-staff/access/rental/$RENTAL" "" "$CUST"; [ "$(echo "$RESP" | jq -r '.canManage')" = "false" ] && ok "access: 남은 false" || bad "남 access RESP=$(echo $RESP|head -c 80)"

# ── 직원 권한: 수정 O, 삭제 X, 직원 관리 X
api DELETE "/rentals/$RENTAL" "" "$STAFF"; [ "$CODE" = "403" ] && ok "직원 매장 삭제 403" || bad "직원 삭제 CODE=$CODE"
api GET "/shop-staff/shops/rental/$RENTAL" "" "$STAFF"; [ "$CODE" = "403" ] && ok "직원의 직원 목록 조회 403" || bad "직원 목록 CODE=$CODE"
api GET "/shop-staff/shops/rental/$RENTAL" "" "$OWNER"; SC=$(echo "$RESP" | jq -r '.staff | length'); IV=$(echo "$RESP" | jq -r '.invite.usedCount')
[ "$CODE" = "200" ] && [ "$SC" = "1" ] && [ "$IV" = "1" ] && ok "사장님 직원 목록 1명 + 링크 사용 1" || bad "목록 CODE=$CODE staff=$SC used=$IV"

# ── 예약: 직원 자기 매장 예약 400, 손님 요청 → 직원 알림·목록·상세·확정·취소(카드는 사장님 명의)
DATE=$(date -v+7d +%F 2>/dev/null || date -d '+7 days' +%F)
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"adults\":1}" "$STAFF"; [ "$CODE" = "400" ] && ok "직원은 자기 매장 예약 불가 400" || bad "직원 자기 예약 CODE=$CODE"
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"adults\":2}" "$CUST"; RES=$(echo "$RESP" | jq -r '.reservation.id // empty')
[ "$CODE" = "201" ] && [ -n "$RES" ] && ok "손님 예약 요청 201" || bad "예약 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
NS=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$STAFF_ID' AND title LIKE '%예약 요청'")
[ "$NS" = "1" ] && ok "직원에게도 예약 요청 알림" || bad "직원 예약 알림 n=$NS"
api GET /reservations/shop "" "$STAFF"; RN=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$RES\")] | length")
[ "$RN" = "1" ] && ok "직원 예약 관리 목록에 보임" || bad "직원 목록 n=$RN"
api GET "/reservations/$RES" "" "$STAFF"; [ "$CODE" = "200" ] && ok "직원 예약 상세 200" || bad "직원 상세 CODE=$CODE"
api PUT "/reservations/$RES/confirm" '{"message":"직원이 확정"}' "$STAFF"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.reservation.status')" = "confirmed" ] && ok "직원 예약 확정 200" || bad "직원 확정 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api PUT "/reservations/$RES/cancel" '{}' "$STAFF"; [ "$CODE" = "200" ] && ok "직원 확정 예약 취소 200" || bad "직원 취소 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
SENDER=$(pq "SELECT \"senderId\" FROM messages WHERE type='reservation' AND content LIKE '%\"event\":\"cancelled\"%' AND content LIKE '%$RES%' ORDER BY \"createdAt\" DESC LIMIT 1")
[ "$SENDER" = "$OWNER_ID" ] && ok "직원이 취소해도 카드는 사장님 명의" || bad "취소 카드 sender=$SENDER owner=$OWNER_ID"

# ── 리뷰: 직원 자작 400, 손님 리뷰 → 직원 알림 → 직원 답글
api POST /shop-reviews "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"rating\":5,\"content\":\"직원 자작 리뷰예요\"}" "$STAFF"; [ "$CODE" = "400" ] && ok "직원 자작 리뷰 400" || bad "직원 자작 CODE=$CODE"
api POST /shop-reviews "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"rating\":4,\"content\":\"장비 상태 좋았어요\"}" "$CUST"; RV=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$RV" ] && ok "손님 리뷰 201" || bad "리뷰 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
NR=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$STAFF_ID' AND title='새 리뷰가 달렸어요'")
[ "$NR" = "1" ] && ok "직원에게도 새 리뷰 알림" || bad "직원 리뷰 알림 n=$NR"
api PUT "/shop-reviews/$RV/reply" '{"content":"직원이 답글 남겨요"}' "$STAFF"; [ "$CODE" = "200" ] && ok "직원 리뷰 답글 200" || bad "직원 답글 CODE=$CODE RESP=$(echo $RESP|head -c 100)"

# ── 소식: 직원 작성 O, 사장님이 직원 글 삭제 O
api POST /shop-posts "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"title\":\"직원 소식\",\"content\":\"오늘 왁싱 이벤트\"}" "$STAFF"; SP=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$SP" ] && ok "직원 소식 작성 201" || bad "직원 소식 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api DELETE "/shop-posts/$SP" "" "$OWNER"; [ "$CODE" = "200" ] && ok "사장님이 직원 소식 삭제 200" || bad "사장 삭제 CODE=$CODE"

# ── 직원 매장 수정 (사장님 수정과 같이 재심사로 approved 가 내려가므로 마지막에, 뒤이어 관리자 재승인)
api PUT "/rentals/$RENTAL" '{"description":"직원이 고침"}' "$STAFF"; [ "$CODE" = "200" ] && ok "직원 매장 수정 200" || bad "직원 수정 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && ok "수정 후 재승인" || bad "재승인 CODE=$CODE"

# ── 해제: 남 403, 사장님 200 → 직원 권한 사라짐 → 재참여 → 스스로 나가기
api DELETE "/shop-staff/shops/rental/$RENTAL/staff/$STAFF_ID" "" "$CUST"; [ "$CODE" = "403" ] && ok "남이 직원 해제 403" || bad "남 해제 CODE=$CODE"
api DELETE "/shop-staff/shops/rental/$RENTAL/staff/$STAFF_ID" "" "$OWNER"; [ "$CODE" = "200" ] && ok "사장님 직원 해제 200" || bad "해제 CODE=$CODE"
api PUT "/rentals/$RENTAL" '{"description":"해제 후"}' "$STAFF"; [ "$CODE" = "403" ] && ok "해제 후 직원 수정 403" || bad "해제 후 수정 CODE=$CODE"
api GET /reservations/shop "" "$STAFF"; RN=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$RES\")] | length"); [ "$RN" = "0" ] && ok "해제 후 예약 목록에서 사라짐" || bad "해제 후 목록 n=$RN"
api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "201" ] && ok "재초대 참여 201" || bad "재참여 CODE=$CODE"
api DELETE "/shop-staff/shops/rental/$RENTAL/staff/$STAFF_ID" "" "$STAFF"; [ "$CODE" = "200" ] && ok "직원 스스로 나가기 200" || bad "나가기 CODE=$CODE"

# ── 만료·회수
pq "UPDATE shop_invites SET \"expiresAt\"=now() - interval '1 day' WHERE code='$INV'" >/dev/null
api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "410" ] && ok "만료 링크 410" || bad "만료 CODE=$CODE"
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; INV2=$(echo "$RESP" | jq -r '.code // empty'); [ "$CODE" = "201" ] && [ -n "$INV2" ] && [ "$INV2" != "$INV" ] && ok "새 링크 발급 (이전 링크 대체)" || bad "새 링크 CODE=$CODE"
api DELETE "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; [ "$CODE" = "200" ] && ok "링크 회수 200" || bad "회수 CODE=$CODE"
api GET "/shop-staff/invites/$INV2" "" "$STAFF"; [ "$CODE" = "404" ] && ok "회수된 링크 404" || bad "회수 후 CODE=$CODE"

echo "----- STEP20: PASS=$PASS FAIL=$FAIL -----"
