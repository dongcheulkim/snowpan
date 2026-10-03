#!/bin/bash
# STEP 37: 이벤트 신청 (앱 출시 이벤트, 2026-10-03)
# - 공개 설정 조회, 로그인 필수, 인스타 아이디 검증·정규화, 재신청은 수정, 관리자 목록/설정/삭제, 종료 시 신청 거부
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
api() {
  local method=$1 path=$2 body=$3 token=$4
  local hdr=(-H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json')
  [ -n "$token" ] && hdr+=(-H "Authorization: Bearer $token")
  local out
  if [ -n "$body" ]; then out=$(curl -s -m 30 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path" -d "$body")
  else out=$(curl -s -m 30 -w $'\n%{http_code}' "${hdr[@]}" -X "$method" "$BASE$path"); fi
  CODE=$(printf '%s' "$out" | tail -n1); RESP=$(printf '%s' "$out" | sed '$d')
}
echo "===== STEP 37: 이벤트 신청 ====="
USER=$(register_verified "01099990371" "ev_user@s37.test" "이벤트회원37" "이벤트회원37"); [ -z "$USER" ] && USER=$(login "ev_user@s37.test" 'Re!pass1234')
USER2=$(register_verified "01099990373" "ev_user2@s37.test" "이벤트회원37b" "이벤트회원37b"); [ -z "$USER2" ] && USER2=$(login "ev_user2@s37.test" 'Re!pass1234')
ADM=$(register_verified "01099990372" "ev_admin@s37.test" "이벤트관리자" "이벤트관리자")
pq "UPDATE users SET role='admin' WHERE email='ev_admin@s37.test'" >/dev/null
ADM=$(login "ev_admin@s37.test" 'Re!pass1234')
[ -n "$USER" ] && [ -n "$USER2" ] && [ -n "$ADM" ] && ok "유저 준비" || bad "유저 준비 실패"
pq "DELETE FROM admin_settings WHERE key='event_launch'" >/dev/null

api GET /events/launch "" ""; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.open')" = "true" ] && [ -n "$(echo "$RESP" | jq -r '.title')" ] && ok "공개 이벤트 설정 (기본값 진행중)" || bad "공개 설정 CODE=$CODE RESP=$(echo "$RESP" | head -c 120)"
api GET /events/no-such "" ""; [ "$CODE" = "404" ] && ok "없는 이벤트 404" || bad "없는 이벤트 CODE=$CODE"
api GET "/events/BAD%20KEY" "" ""; [ "$CODE" = "400" ] && ok "잘못된 키 400" || bad "잘못된 키 CODE=$CODE"
api POST /events/launch/apply '{"instagram":"snow_user"}' ""; [ "$CODE" = "401" ] && ok "비로그인 신청 거부" || bad "비로그인 CODE=$CODE"
api GET /events/launch/me "" "$USER"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.applied')" = "false" ] && ok "신청 전 내 상태 applied=false" || bad "me CODE=$CODE"
api POST /events/launch/apply '{"instagram":"bad id!"}' "$USER"; [ "$CODE" = "400" ] && ok "이상한 인스타 아이디 거부" || bad "인스타 검증 CODE=$CODE"
api POST /events/launch/apply '{"instagram":"@Snow.User_37"}' "$USER"; [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.instagram')" = "snow.user_37" ] && ok "신청 201 (@ 떼고 소문자로 저장)" || bad "신청 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{"instagram":"https://www.instagram.com/snowpan_official/"}' "$USER"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.instagram')" = "snowpan_official" ] && [ "$(echo "$RESP" | jq -r '.updated')" = "true" ] && ok "재신청은 수정 200 (주소 붙여넣어도 아이디만)" || bad "재신청 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{}' "$USER2"; [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.instagram')" = "null" ] && ok "인스타 없이도 신청 가능" || bad "인스타 없이 CODE=$CODE RESP=$RESP"
api GET /events/launch/me "" "$USER"; [ "$(echo "$RESP" | jq -r '.applied')" = "true" ] && [ "$(echo "$RESP" | jq -r '.instagram')" = "snowpan_official" ] && ok "내 신청 상태 조회" || bad "me 후 RESP=$RESP"
api GET /events/launch "" ""; [ "$(echo "$RESP" | jq -r '.count')" -ge "2" ] && ok "신청자 수 집계 ($(echo "$RESP" | jq -r '.count'))" || bad "count RESP=$RESP"
[ "$(pq "SELECT count(*) FROM event_entries WHERE \"eventKey\"='launch' AND \"userId\"=(SELECT id FROM users WHERE email='ev_user@s37.test')")" = "1" ] && ok "같은 회원은 한 건만 (유니크)" || bad "중복 행"

api GET /events/admin/launch/entries "" "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 신청자 목록 거부" || bad "일반 목록 CODE=$CODE"
api GET /events/admin/launch/entries "" ""; [ "$CODE" = "401" ] && ok "비로그인 신청자 목록 거부" || bad "비로그인 목록 CODE=$CODE"
api GET /events/admin/launch/entries "" "$ADM"; EN_ID=$(echo "$RESP" | jq -r '[.[] | select(.user.email=="ev_user2@s37.test")][0].id // empty'); [ "$CODE" = "200" ] && [ -n "$EN_ID" ] && [ "$(echo "$RESP" | jq -r '[.[] | select(.user.email=="ev_user@s37.test")][0] | .instagram + "|" + .user.phone + "|" + .user.name')" = "snowpan_official|01099990371|이벤트회원37" ] && ok "관리자 목록에 인스타·전화·이름" || bad "관리자 목록 CODE=$CODE RESP=$(echo "$RESP" | head -c 200)"
api PUT /events/admin/launch '{"title":"E2E 이벤트","prize":"스키 고글 1개","endsAt":"2099-12-31T00:00:00Z"}' "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 설정 변경 거부" || bad "일반 설정 CODE=$CODE"
api PUT /events/admin/launch '{"title":"E2E 이벤트","prize":"스키 고글 1개","endsAt":"2099-12-31T00:00:00Z"}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.title')" = "E2E 이벤트" ] && [ "$(echo "$RESP" | jq -r '.open')" = "true" ] && ok "관리자 문구·경품·마감일 저장" || bad "설정 저장 CODE=$CODE RESP=$RESP"
api GET /events/launch "" ""; [ "$(echo "$RESP" | jq -r '.prize')" = "스키 고글 1개" ] && ok "공개 조회에 반영" || bad "반영 안 됨 RESP=$RESP"
api PUT /events/admin/launch '{"active":false}' "$ADM"; [ "$(echo "$RESP" | jq -r '.open')" = "false" ] && ok "이벤트 종료" || bad "종료 RESP=$RESP"
api POST /events/launch/apply '{"instagram":"late_user"}' "$USER2"; [ "$CODE" = "409" ] && ok "종료 뒤 신청 409" || bad "종료 뒤 CODE=$CODE"
api PUT /events/admin/launch '{"active":true,"endsAt":"2000-01-01T00:00:00Z"}' "$ADM"; [ "$(echo "$RESP" | jq -r '.open')" = "false" ] && ok "마감일 지나면 open=false" || bad "마감일 RESP=$RESP"
api POST /events/launch/apply '{}' "$USER2"; [ "$CODE" = "409" ] && ok "마감일 지난 뒤 신청 409" || bad "마감 뒤 CODE=$CODE"
api PUT /events/admin/launch '{"endsAt":null}' "$ADM"; [ "$(echo "$RESP" | jq -r '.open')" = "true" ] && ok "마감일 비우면 다시 진행" || bad "마감 해제 RESP=$RESP"
api DELETE "/events/admin/launch/entries/$EN_ID" "" "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 신청 삭제 거부" || bad "일반 삭제 CODE=$CODE"
api DELETE "/events/admin/launch/entries/$EN_ID" "" "$ADM"; [ "$CODE" = "200" ] && ok "관리자 신청 삭제" || bad "삭제 CODE=$CODE"
api GET /events/launch/me "" "$USER2"; [ "$(echo "$RESP" | jq -r '.applied')" = "false" ] && ok "삭제 뒤 applied=false" || bad "삭제 후 RESP=$RESP"
pq "DELETE FROM admin_settings WHERE key='event_launch'" >/dev/null
echo "----- STEP37: PASS=$PASS FAIL=$FAIL -----"
