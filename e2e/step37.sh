#!/bin/bash
# STEP 37: 이벤트 신청 (앱 출시 이벤트, 2026-10-03)
# - 공개 설정 조회, 로그인 필수, 인스타 아이디 검증·정규화, 재신청은 수정, 관리자 목록/설정/삭제, 종료 시 신청 거부
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
api() {
  local method=$1 path=$2 body=$3 token=$4
  local hdr=(-H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json' -H "Origin: ${ORIGIN:-capacitor://localhost}") # 이벤트 신청은 앱 origin 만 허용
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
# 앱 전용 스위치(appOnly): 기본 꺼짐(웹도 로그인하면 신청) — 켜면 웹 origin 은 403
ORIGIN=https://snowpan.kr api GET /events/launch "" ""; [ "$(echo "$RESP" | jq -r '.appOnly')" = "false" ] && ok "기본은 웹 신청 허용 (appOnly=false)" || bad "appOnly 기본값 RESP=$RESP"
api PUT /events/admin/launch '{"appOnly":true}' "$ADM" >/dev/null
ORIGIN=https://snowpan.kr api POST /events/launch/apply '{"instagram":"web_user"}' "$USER"; [ "$CODE" = "403" ] && [ "$(echo "$RESP" | jq -r '.appOnly')" = "true" ] && ok "앱 전용 켜면 웹 신청 403" || bad "웹 신청 CODE=$CODE RESP=$RESP"
api PUT /events/admin/launch '{"appOnly":false}' "$ADM" >/dev/null
ORIGIN=https://snowpan.kr api POST /events/launch/apply '{"instagram":"bad id!"}' "$USER"; [ "$CODE" = "400" ] && ok "앱 전용 끄면 웹에서도 신청 처리 (검증 400)" || bad "웹 허용 CODE=$CODE"
api POST /events/launch/apply '{"instagram":"bad id!"}' "$USER"; [ "$CODE" = "400" ] && ok "이상한 인스타 아이디 거부" || bad "인스타 검증 CODE=$CODE"
api POST /events/launch/apply '{}' "$USER"; [ "$CODE" = "400" ] && ok "인스타 아이디 없이 신청 400 (필수)" || bad "인스타 필수 CODE=$CODE"
api POST /events/launch/apply '{"instagram":"@Snow.User_37","message":"  스노우판 화이팅!  "}' "$USER"; [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.instagram')" = "snow.user_37" ] && [ "$(echo "$RESP" | jq -r '.message')" = "스노우판 화이팅!" ] && ok "신청 201 (@ 떼고 소문자로 저장, 응원 한마디 저장)" || bad "신청 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{"instagram":"https://www.instagram.com/snowpan_official/"}' "$USER"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.instagram')" = "snowpan_official" ] && [ "$(echo "$RESP" | jq -r '.updated')" = "true" ] && [ "$(echo "$RESP" | jq -r '.message')" = "스노우판 화이팅!" ] && ok "재신청은 수정 200 (주소 붙여넣어도 아이디만, 한마디 유지)" || bad "재신청 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{"instagram":"user2_ig"}' "$USER2"; [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.message')" = "null" ] && [ "$(echo "$RESP" | jq -r '.phone')" = "01099990373" ] && ok "한마디 없이도 신청 가능 (연락처는 계정 전화)" || bad "한마디 없이 CODE=$CODE RESP=$RESP"
# 카카오·애플처럼 계정에 전화번호 없는 회원 → 신청 때 연락처 필수
USER3=$(register_verified "01099990374" "ev_kakao@s37.test" "카카오회원37" "카카오회원37"); [ -z "$USER3" ] && USER3=$(login "ev_kakao@s37.test" 'Re!pass1234')
pq "UPDATE users SET phone=NULL, \"phoneVerified\"=false WHERE email='ev_kakao@s37.test'" >/dev/null
api GET /events/launch/me "" "$USER3"; [ "$(echo "$RESP" | jq -r '.phone')" = "" ] && [ "$(echo "$RESP" | jq -r '.name')" = "카카오회원37" ] && ok "전화 없는 회원: 폼 기본값 연락처 빈칸·성함은 계정 이름" || bad "me 기본값 RESP=$RESP"
api POST /events/launch/apply '{"instagram":"kakao_user"}' "$USER3"; [ "$CODE" = "400" ] && [ "$(echo "$RESP" | jq -r '.needPhone')" = "true" ] && ok "전화 없는 회원이 연락처 없이 신청 400" || bad "연락처 없이 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{"instagram":"kakao_user","phone":"02-123-4567"}' "$USER3"; [ "$CODE" = "400" ] && ok "휴대폰 아닌 번호 거부" || bad "번호 검증 CODE=$CODE"
api POST /events/launch/apply '{"instagram":"kakao_user","phone":"010-9999-0375"}' "$USER3"; [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.phone')" = "01099990375" ] && ok "연락처 적으면 신청 201 (숫자만 저장)" || bad "연락처 신청 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{"instagram":"kakao_user2"}' "$USER3"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.phone')" = "01099990375" ] && ok "재신청 때 연락처 안 보내도 기존 번호 유지" || bad "연락처 유지 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{"name":"  김  동철 ","instagram":"kakao_user2","phone":"01099990375"}' "$USER3"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.name')" = "김 동철" ] && ok "성함 직접 적으면 저장 (공백 정리)" || bad "성함 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{"name":"","instagram":"kakao_user2","phone":"01099990375"}' "$USER3"; [ "$CODE" = "400" ] && ok "성함 비우면 400" || bad "성함 필수 CODE=$CODE"
# 중복 신청 차단: 다른 계정이 같은 연락처 / 같은 인스타로 신청
api POST /events/launch/apply '{"instagram":"someone_else","phone":"01099990375"}' "$USER2"; [ "$CODE" = "409" ] && ok "다른 계정이 같은 연락처로 신청 409" || bad "연락처 중복 CODE=$CODE RESP=$RESP"
api POST /events/launch/apply '{"instagram":"kakao_user2"}' "$USER2"; [ "$CODE" = "409" ] && ok "다른 계정이 같은 인스타로 신청 409" || bad "인스타 중복 CODE=$CODE RESP=$RESP"
api GET /events/launch/me "" "$USER2"; [ "$(echo "$RESP" | jq -r '.instagram')" = "user2_ig" ] && ok "중복 시도해도 기존 신청은 그대로" || bad "기존 신청 변경됨 RESP=$RESP"
api GET /events/launch/me "" "$USER"; [ "$(echo "$RESP" | jq -r '.applied')" = "true" ] && [ "$(echo "$RESP" | jq -r '.instagram')" = "snowpan_official" ] && ok "내 신청 상태 조회" || bad "me 후 RESP=$RESP"
api GET /events/launch "" ""; [ "$(echo "$RESP" | jq -r '.count')" -ge "2" ] && ok "신청자 수 집계 ($(echo "$RESP" | jq -r '.count'))" || bad "count RESP=$RESP"
[ "$(pq "SELECT count(*) FROM event_entries WHERE \"eventKey\"='launch' AND \"userId\"=(SELECT id FROM users WHERE email='ev_user@s37.test')")" = "1" ] && ok "같은 회원은 한 건만 (유니크)" || bad "중복 행"

api GET /events/admin/launch/entries "" "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 신청자 목록 거부" || bad "일반 목록 CODE=$CODE"
api GET /events/admin/launch/entries "" ""; [ "$CODE" = "401" ] && ok "비로그인 신청자 목록 거부" || bad "비로그인 목록 CODE=$CODE"
api GET /events/admin/launch/entries "" "$ADM"; EN_ID=$(echo "$RESP" | jq -r '[.[] | select(.user.email=="ev_user2@s37.test")][0].id // empty'); [ "$CODE" = "200" ] && [ -n "$EN_ID" ] && [ "$(echo "$RESP" | jq -r '[.[] | select(.user.email=="ev_user@s37.test")][0] | .instagram + "|" + .user.phone + "|" + .user.name')" = "snowpan_official|01099990371|이벤트회원37" ] && [ "$(echo "$RESP" | jq -r '[.[] | select(.user.email=="ev_kakao@s37.test")][0].phone')" = "01099990375" ] && [ "$(echo "$RESP" | jq -r '[.[] | select(.user.email=="ev_user@s37.test")][0].message')" = "스노우판 화이팅!" ] && ok "관리자 목록에 인스타·전화·이름·한마디 (신청 때 적은 연락처 포함)" || bad "관리자 목록 CODE=$CODE RESP=$(echo "$RESP" | head -c 200)"
api PUT /events/admin/launch '{"title":"E2E 이벤트","prize":"스키 고글 1개","endsAt":"2099-12-31T00:00:00Z"}' "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 설정 변경 거부" || bad "일반 설정 CODE=$CODE"
api PUT /events/admin/launch '{"title":"E2E 이벤트","prize":"스키 고글 1개","endsAt":"2099-12-31T00:00:00Z"}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.title')" = "E2E 이벤트" ] && [ "$(echo "$RESP" | jq -r '.open')" = "true" ] && ok "관리자 문구·경품·마감일 저장" || bad "설정 저장 CODE=$CODE RESP=$RESP"
api GET /events/launch "" ""; [ "$(echo "$RESP" | jq -r '.prize')" = "스키 고글 1개" ] && ok "공개 조회에 반영" || bad "반영 안 됨 RESP=$RESP"
api PUT /events/admin/launch '{"active":false}' "$ADM"; [ "$(echo "$RESP" | jq -r '.open')" = "false" ] && ok "이벤트 종료" || bad "종료 RESP=$RESP"
api POST /events/launch/apply '{"instagram":"late_user"}' "$USER2"; [ "$CODE" = "409" ] && ok "종료 뒤 신청 409" || bad "종료 뒤 CODE=$CODE"
api PUT /events/admin/launch '{"active":true,"endsAt":"2000-01-01T00:00:00Z"}' "$ADM"; [ "$(echo "$RESP" | jq -r '.open')" = "false" ] && ok "마감일 지나면 open=false" || bad "마감일 RESP=$RESP"
api POST /events/launch/apply '{"instagram":"late_user"}' "$USER2"; [ "$CODE" = "409" ] && ok "마감일 지난 뒤 신청 409" || bad "마감 뒤 CODE=$CODE"
api PUT /events/admin/launch '{"endsAt":null}' "$ADM"; [ "$(echo "$RESP" | jq -r '.open')" = "true" ] && ok "마감일 비우면 다시 진행" || bad "마감 해제 RESP=$RESP"
api DELETE "/events/admin/launch/entries/$EN_ID" "" "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 신청 삭제 거부" || bad "일반 삭제 CODE=$CODE"
api DELETE "/events/admin/launch/entries/$EN_ID" "" "$ADM"; [ "$CODE" = "200" ] && ok "관리자 신청 삭제" || bad "삭제 CODE=$CODE"
api GET /events/launch/me "" "$USER2"; [ "$(echo "$RESP" | jq -r '.applied')" = "false" ] && ok "삭제 뒤 applied=false" || bad "삭제 후 RESP=$RESP"
pq "DELETE FROM admin_settings WHERE key='event_launch'" >/dev/null
echo "----- STEP37: PASS=$PASS FAIL=$FAIL -----"
