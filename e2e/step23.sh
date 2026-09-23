#!/bin/bash
# STEP 23: 레슨 '사업자 확인' 배지 — 사업자등록증 첨부 → 관리자 승인 때 배지 부여 → 공개 응답에 배지만(서류는 비공개) → 켜기/끄기 → 수정 폼에서 나중에 첨부(재심사)
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

echo "===== STEP 23: 레슨 사업자 확인 배지 ====="
OWNER=$(register_verified "01099990231" "bz_owner@s23.test" "배지강사" "배지강사"); [ -z "$OWNER" ] && OWNER=$(login "bz_owner@s23.test" 'Re!pass1234')
USER1=$(register_verified "01099990232" "bz_user@s23.test" "배지회원" "배지회원"); [ -z "$USER1" ] && USER1=$(login "bz_user@s23.test" 'Re!pass1234')
ADM=$(register_verified "01099990233" "bz_admin@s23.test" "배지관리자" "배지관리자")
pq "UPDATE users SET role='admin' WHERE email='bz_admin@s23.test'" >/dev/null
ADM=$(login "bz_admin@s23.test" 'Re!pass1234')
pq "DELETE FROM notifications WHERE \"userId\" IN (SELECT id FROM users WHERE email LIKE '%@s23.test')" >/dev/null
OWNER_ID=$(pq "SELECT id FROM users WHERE email='bz_owner@s23.test'")
[ -n "$OWNER" ] && [ -n "$USER1" ] && [ -n "$ADM" ] && ok "유저 3명 준비" || bad "유저 준비 실패"

# ── 서류 첨부한 레슨 / 없는 레슨
api POST /lessons "{\"name\":\"S23배지레슨\",\"resortId\":\"$YONGPYONG\",\"description\":\"사업자 서류 첨부\",\"type\":\"스키\",\"providerType\":\"business\",\"businessLicense\":\"/uploads/e2e.jpg\"}" "$OWNER"; L1=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$L1" ] && ok "서류 첨부 레슨 등록" || bad "레슨 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST /lessons "{\"name\":\"S23무서류레슨\",\"resortId\":\"$YONGPYONG\",\"description\":\"서류 없음\",\"type\":\"스키\",\"providerType\":\"freelance\"}" "$OWNER"; L2=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$L2" ] && ok "서류 없는 레슨 등록" || bad "레슨2 CODE=$CODE"
api GET /admin/lessons/pending "" "$ADM"; PL=$(echo "$RESP" | jq -r "[(if type==\"array\" then . else (.items // []) end)[] | select(.id==\"$L1\")][0].businessLicense // empty")
[ "$PL" = "/uploads/e2e.jpg" ] && ok "관리자 승인 대기 목록에 서류 보임" || bad "대기 목록 서류=$PL"

# ── 승인 + 배지 / 승인만
api PUT "/admin/lessons/$L1/approve" '{"businessVerified":true}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.businessVerified')" = "true" ] && ok "승인하며 배지 부여 200" || bad "승인+배지 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api PUT "/admin/lessons/$L2/approve" '{}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.businessVerified')" = "false" ] && ok "배지 없이 승인 200" || bad "승인 CODE=$CODE"
NB=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWNER_ID' AND title LIKE '%사업자 확인 배지%'")
[ "$NB" = "1" ] && ok "강사에게 배지 알림 1" || bad "배지 알림 n=$NB"

# ── 공개 응답: 배지는 보이고 서류·소속은 비공개
api GET "/lessons/$L1" "" ""; BV=$(echo "$RESP" | jq -r '.businessVerified'); HAS_DOC=$(echo "$RESP" | grep -c '"businessLicense"'); HAS_PT=$(echo "$RESP" | grep -c '"providerType"')
[ "$CODE" = "200" ] && [ "$BV" = "true" ] && [ "$HAS_DOC" = "0" ] && [ "$HAS_PT" = "0" ] && ok "공개 상세: 배지 true, 서류·소속 비노출" || bad "공개 상세 bv=$BV doc=$HAS_DOC pt=$HAS_PT"
api GET "/lessons/$L2" "" ""; [ "$(echo "$RESP" | jq -r '.businessVerified')" = "false" ] && ok "서류 없는 레슨 배지 false" || bad "레슨2 배지"
api GET "/lessons?resortId=$YONGPYONG&limit=50" "" ""; LB=$(echo "$RESP" | jq -r "(if type==\"array\" then . else (.items // .lessons // []) end) | [.[] | select(.id==\"$L1\")][0].businessVerified")
[ "$LB" = "true" ] && ok "목록에도 배지 표시 값" || bad "목록 배지=$LB"

# ── 켜기/끄기: 일반 유저 403, 관리자 끄기 → false, 다시 켜기 → true (알림은 새로 켤 때만)
api PUT "/admin/lessons/$L1/business-badge" '{"verified":false}' "$USER1"; [ "$CODE" = "401" ] || [ "$CODE" = "403" ] && ok "일반 유저 배지 변경 차단" || bad "권한 CODE=$CODE"
api PUT "/admin/lessons/$L1/business-badge" '{"verified":false}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.businessVerified')" = "false" ] && ok "배지 끄기 200" || bad "끄기 CODE=$CODE"
api PUT "/admin/lessons/$L1/business-badge" '{"verified":true}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.businessVerified')" = "true" ] && ok "배지 다시 켜기 200" || bad "켜기 CODE=$CODE"
NB2=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWNER_ID' AND title LIKE '%사업자 확인 배지%'")
[ "$NB2" = "2" ] && ok "다시 켤 때 알림 1건 추가" || bad "재부여 알림 n=$NB2"

# ── 수정 폼에서 나중에 첨부: 허용 안 된 주소 400, 정상 첨부 → 재심사(approved false) → 관리자 대기 목록에 서류
api PUT "/lessons/$L2" '{"businessLicense":"https://evil.example/x.jpg"}' "$OWNER"; [ "$CODE" = "400" ] && ok "외부 주소 서류 400" || bad "외부 주소 CODE=$CODE"
api PUT "/lessons/$L2" '{"businessLicense":"/uploads/e2e.jpg"}' "$OWNER"; [ "$CODE" = "200" ] && ok "나중에 서류 첨부 200" || bad "첨부 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
AP=$(pq "SELECT approved FROM lessons WHERE id='$L2'"); [ "$AP" = "f" ] && ok "첨부 후 재심사 대기" || bad "재심사 approved=$AP"
api GET /admin/lessons/pending "" "$ADM"; PL2=$(echo "$RESP" | jq -r "[(if type==\"array\" then . else (.items // []) end)[] | select(.id==\"$L2\")][0].businessLicense // empty")
[ "$PL2" = "/uploads/e2e.jpg" ] && ok "대기 목록에 새 서류 보임" || bad "대기 서류=$PL2"
# ── 관리자 매장 관리 보드: 공개된 레슨도 첨부 서류·배지 보임
api GET /admin/outreach "" "$ADM"; OB=$(echo "$RESP" | jq -r "[.shops[] | select(.id==\"$L1\")][0] | \"\(.businessLicense)/\(.businessVerified)\"")
[ "$OB" = "/uploads/e2e.jpg/true" ] && ok "매장 관리 보드에 레슨 서류·배지" || bad "보드 서류/배지=$OB"
api GET /admin/outreach "" "$USER1"; [ "$CODE" = "401" ] || [ "$CODE" = "403" ] && ok "일반 유저는 보드 서류 접근 불가" || bad "보드 권한 CODE=$CODE"
echo "----- STEP23: PASS=$PASS FAIL=$FAIL -----"
