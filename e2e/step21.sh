#!/bin/bash
# STEP 21: 매장 모집·신청 (앰버서더 등) — 사장님·직원이 모집 올림 → 공개 카드 → 회원 신청(모집당 1회) → 사장님·직원 알림·신청자 목록, 마감·삭제
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

echo "===== STEP 21: 매장 모집·신청 ====="
OWNER=$(register_verified "01099990211" "rc_owner@s21.test" "모집사장" "모집사장"); [ -z "$OWNER" ] && OWNER=$(login "rc_owner@s21.test" 'Re!pass1234')
STAFF=$(register_verified "01099990212" "rc_staff@s21.test" "모집직원" "모집직원"); [ -z "$STAFF" ] && STAFF=$(login "rc_staff@s21.test" 'Re!pass1234')
USER1=$(register_verified "01099990213" "rc_user1@s21.test" "지원자일" "지원자일"); [ -z "$USER1" ] && USER1=$(login "rc_user1@s21.test" 'Re!pass1234')
USER2=$(register_verified "01099990214" "rc_user2@s21.test" "지원자이" "지원자이"); [ -z "$USER2" ] && USER2=$(login "rc_user2@s21.test" 'Re!pass1234')
ADM=$(register_verified "01099990215" "rc_admin@s21.test" "모집관리자" "모집관리자")
pq "UPDATE users SET role='admin' WHERE email='rc_admin@s21.test'" >/dev/null
ADM=$(login "rc_admin@s21.test" 'Re!pass1234')
pq "DELETE FROM notifications WHERE \"userId\" IN (SELECT id FROM users WHERE email LIKE '%@s21.test')" >/dev/null
OWNER_ID=$(pq "SELECT id FROM users WHERE email='rc_owner@s21.test'"); STAFF_ID=$(pq "SELECT id FROM users WHERE email='rc_staff@s21.test'")
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$USER1" ] && [ -n "$USER2" ] && [ -n "$ADM" ] && ok "유저 5명 준비" || bad "유저 준비 실패"

# ── 정비샵 등록·승인, 직원 참여
api POST /repair-shops '{"name":"S21정비샵","area":"용평","address":"평창","description":"앰버서더 모집 테스트","businessLicense":"/uploads/e2e.jpg"}' "$OWNER"; SHOP=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$SHOP" ] && ok "정비샵 등록" || bad "정비샵 등록 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST /recruits "{\"shopType\":\"repair\",\"shopId\":\"$SHOP\",\"title\":\"앰버서더 모집\",\"description\":\"승인 전 테스트\"}" "$OWNER"
[ "$CODE" = "400" ] && ok "미승인 매장 모집 400" || bad "미승인 모집 CODE=$CODE"
api PUT "/repair-shops/$SHOP/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && ok "정비샵 승인" || bad "승인 CODE=$CODE"
api POST "/shop-staff/shops/repair/$SHOP/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty')
api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "201" ] && ok "직원 참여" || bad "직원 참여 CODE=$CODE"

# ── 모집 올리기: 남 403, 검증 400, 사장님 201, 직원도 201
api POST /recruits "{\"shopType\":\"repair\",\"shopId\":\"$SHOP\",\"title\":\"앰버서더 모집\",\"description\":\"남이 올림\"}" "$USER1"; [ "$CODE" = "403" ] && ok "남이 모집 올리기 403" || bad "남 모집 CODE=$CODE"
api POST /recruits "{\"shopType\":\"repair\",\"shopId\":\"$SHOP\",\"title\":\"a\",\"description\":\"짧음\"}" "$OWNER"; [ "$CODE" = "400" ] && ok "제목 1자 400" || bad "제목 검증 CODE=$CODE"
api POST /recruits "{\"shopType\":\"repair\",\"shopId\":\"$SHOP\",\"title\":\"앰버서더 모집\",\"description\":\"내용\",\"deadline\":\"2026-13-45\"}" "$OWNER"; [ "$CODE" = "400" ] && ok "마감일 형식 400" || bad "마감일 검증 CODE=$CODE"
DL=$(date -v+14d +%F 2>/dev/null || date -d '+14 days' +%F)
api POST /recruits "{\"shopType\":\"repair\",\"shopId\":\"$SHOP\",\"title\":\"26/27 스노우메타 앰버서더 모집\",\"description\":\"시즌 동안 왁싱·정비 지원, 인스타 활동 가능하신 분\",\"deadline\":\"$DL\"}" "$OWNER"
RC=$(echo "$RESP" | jq -r '.id // empty'); AC=$(echo "$RESP" | jq -r '.active'); DD=$(echo "$RESP" | jq -r '.deadline')
[ "$CODE" = "201" ] && [ -n "$RC" ] && [ "$AC" = "true" ] && [ "$DD" = "$DL" ] && ok "사장님 모집 201 (active·마감일)" || bad "모집 CODE=$CODE active=$AC dl=$DD RESP=$(echo $RESP|head -c 120)"
api POST /recruits "{\"shopType\":\"repair\",\"shopId\":\"$SHOP\",\"title\":\"시즌 직원 모집\",\"description\":\"직원이 올린 모집이에요\"}" "$STAFF"; RC2=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$RC2" ] && ok "직원도 모집 201" || bad "직원 모집 CODE=$CODE"

# ── 공개 조회
api GET "/recruits/shop/repair/$SHOP" "" ""; N=$(echo "$RESP" | jq -r '.items | length'); LEAK=$(echo "$RESP" | grep -c "ownerId")
[ "$CODE" = "200" ] && [ "$N" = "2" ] && [ "$LEAK" = "0" ] && ok "매장 모집 공개 목록 2건 (ownerId 비노출)" || bad "공개 목록 CODE=$CODE n=$N leak=$LEAK"
api GET "/recruits/$RC" "" ""; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.applied')" = "false" ] && [ "$(echo "$RESP" | jq -r '.shopPath')" = "/repair/$SHOP" ] && ok "모집 상세 (비로그인)" || bad "상세 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api GET "/recruits/$RC" "" "$OWNER"; [ "$(echo "$RESP" | jq -r '.canManage')" = "true" ] && ok "모집 상세: 사장님 canManage" || bad "canManage RESP=$(echo $RESP|head -c 100)"

# ── 신청: 검증 400, 사장님·직원 400, 회원 201, 중복 409, 알림(사장님+직원), 목록 권한
api POST "/recruits/$RC/apply" '{"name":"","phone":"01012345678"}' "$USER1"; [ "$CODE" = "400" ] && ok "이름 없음 400" || bad "이름 검증 CODE=$CODE"
api POST "/recruits/$RC/apply" '{"name":"지원자","phone":"12"}' "$USER1"; [ "$CODE" = "400" ] && ok "연락처 짧음 400" || bad "연락처 검증 CODE=$CODE"
api POST "/recruits/$RC/apply" '{"name":"사장","phone":"01011112222"}' "$OWNER"; [ "$CODE" = "400" ] && ok "사장님 자기 모집 신청 400" || bad "사장 신청 CODE=$CODE"
api POST "/recruits/$RC/apply" '{"name":"직원","phone":"01011112222"}' "$STAFF"; [ "$CODE" = "400" ] && ok "직원 자기 매장 신청 400" || bad "직원 신청 CODE=$CODE"
api POST "/recruits/$RC/apply" '{"name":"김지원","phone":"010-1234-5678","instagram":"@snow_rider","message":"<b>보드 5년</b> 탔어요"}' "$USER1"
[ "$CODE" = "201" ] && ok "회원 신청 201" || bad "신청 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST "/recruits/$RC/apply" '{"name":"김지원","phone":"010-1234-5678"}' "$USER1"; [ "$CODE" = "409" ] && ok "중복 신청 409" || bad "중복 CODE=$CODE"
api GET "/recruits/$RC" "" "$USER1"; [ "$(echo "$RESP" | jq -r '.applied')" = "true" ] && ok "모집 상세: 신청함 표시" || bad "applied RESP=$(echo $RESP|head -c 100)"
NO=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWNER_ID' AND title LIKE '%신청이 왔어요'"); NS=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$STAFF_ID' AND title LIKE '%신청이 왔어요'")
[ "$NO" = "1" ] && [ "$NS" = "1" ] && ok "사장님·직원에게 신청 알림" || bad "알림 owner=$NO staff=$NS"
api GET "/recruits/$RC/applications" "" "$USER1"; [ "$CODE" = "403" ] && ok "신청자 목록 남 403" || bad "목록 권한 CODE=$CODE"
api GET "/recruits/$RC/applications" "" "$STAFF"; AN=$(echo "$RESP" | jq -r '.items | length'); AP=$(echo "$RESP" | jq -r '.items[0].phone'); AI=$(echo "$RESP" | jq -r '.items[0].instagram'); AM=$(echo "$RESP" | jq -r '.items[0].message')
[ "$CODE" = "200" ] && [ "$AN" = "1" ] && [ "$AP" = "010-1234-5678" ] && [ "$AI" = "snow_rider" ] && ! echo "$AM" | grep -q "<b>" && ok "직원이 신청자 목록 (연락처·인스타 @제거·HTML 제거)" || bad "목록 CODE=$CODE n=$AN phone=$AP insta=$AI msg=$AM"
api GET /recruits/mine "" "$OWNER"; MC=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$RC\")][0].applicationCount")
[ "$MC" = "1" ] && ok "내 모집 목록에 신청 수 1" || bad "mine count=$MC"

# ── 마감·삭제: 남 403, 마감 후 신청 400, 다시 열기, 삭제 → 신청서도 삭제
api PUT "/recruits/$RC" '{"closed":true}' "$USER1"; [ "$CODE" = "403" ] && ok "남이 마감 403" || bad "남 마감 CODE=$CODE"
api PUT "/recruits/$RC" '{"closed":true}' "$OWNER"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.active')" = "false" ] && ok "마감 200 (active false)" || bad "마감 CODE=$CODE"
api POST "/recruits/$RC/apply" '{"name":"둘째","phone":"01099998888"}' "$USER2"; [ "$CODE" = "400" ] && ok "마감된 모집 신청 400" || bad "마감 후 신청 CODE=$CODE"
api GET "/recruits/shop/repair/$SHOP" "" ""; N=$(echo "$RESP" | jq -r '.items | length'); [ "$N" = "1" ] && ok "마감된 모집은 공개 목록에서 빠짐" || bad "마감 후 공개 n=$N"
api PUT "/recruits/$RC" '{"closed":false}' "$STAFF"; [ "$CODE" = "200" ] && ok "직원이 다시 열기 200" || bad "다시 열기 CODE=$CODE"
api POST "/recruits/$RC/apply" '{"name":"둘째","phone":"01099998888"}' "$USER2"; [ "$CODE" = "201" ] && ok "다시 연 뒤 신청 201" || bad "재개 후 신청 CODE=$CODE"
api DELETE "/recruits/$RC" "" "$USER1"; [ "$CODE" = "403" ] && ok "남이 삭제 403" || bad "남 삭제 CODE=$CODE"
api DELETE "/recruits/$RC" "" "$OWNER"; [ "$CODE" = "200" ] && ok "사장님 삭제 200" || bad "삭제 CODE=$CODE"
AL=$(pq "SELECT count(*) FROM shop_applications WHERE \"recruitId\"='$RC'"); [ "$AL" = "0" ] && ok "삭제 시 신청서도 삭제" || bad "신청서 잔존 n=$AL"
api GET "/recruits/$RC" "" ""; [ "$CODE" = "404" ] && ok "삭제된 모집 404" || bad "삭제 후 CODE=$CODE"
echo "----- STEP21: PASS=$PASS FAIL=$FAIL -----"
