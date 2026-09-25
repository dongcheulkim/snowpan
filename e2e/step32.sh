#!/bin/bash
# STEP 32: 앱 버전 안내 (2026-09-25) — 공개 GET /app/version 기본값, 관리자 수정 반영(캐시 무효화), 형식 검증 400, 비관리자 403
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
echo "===== STEP 32: 앱 버전 안내 ====="
USER=$(register_verified "01099990321" "av_user@s32.test" "버전유저" "버전유저"); [ -z "$USER" ] && USER=$(login "av_user@s32.test" 'Re!pass1234')
ADM=$(register_verified "01099990325" "av_admin@s32.test" "버전관리자" "버전관리자")
pq "UPDATE users SET role='admin' WHERE email='av_admin@s32.test'" >/dev/null
ADM=$(login "av_admin@s32.test" 'Re!pass1234')
pq "DELETE FROM admin_settings WHERE key LIKE 'app_version_%'" >/dev/null
[ -n "$USER" ] && [ -n "$ADM" ] && ok "유저 준비" || bad "유저 준비 실패"
api GET /app/version ""; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.ios.minSupported')" = "1.6" ] && echo "$RESP" | jq -e '.ios.url | startswith("https://apps.apple.com")' >/dev/null && [ "$(echo "$RESP" | jq -r '.android.latest')" != "" ] && ok "공개 버전 정보 (기본값, 스토어 링크)" || bad "공개 CODE=$CODE RESP=$(echo $RESP | head -c 150)"
api PUT /admin/app-version '{"iosLatest":"1.9","iosMin":"1.7"}' "$USER"; [ "$CODE" = "403" ] && ok "비관리자 수정 403" || bad "비관리자 CODE=$CODE"
api PUT /admin/app-version '{"iosLatest":"abc"}' "$ADM"; [ "$CODE" = "400" ] && ok "형식 오류 400" || bad "형식 CODE=$CODE"
api PUT /admin/app-version '{"iosLatest":"1.9","iosMin":"1.7"}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.iosLatest')" = "1.9" ] && ok "관리자 수정 200" || bad "수정 CODE=$CODE RESP=$RESP"
api GET /app/version ""; [ "$(echo "$RESP" | jq -r '.ios.latest')" = "1.9" ] && [ "$(echo "$RESP" | jq -r '.ios.minSupported')" = "1.7" ] && [ "$(echo "$RESP" | jq -r '.android.latest')" = "1.2" ] && ok "공개 정보에 즉시 반영 (캐시 무효화), 안드로이드는 기본값 유지" || bad "반영 RESP=$RESP"
api GET /admin/app-version "" "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.iosMin')" = "1.7" ] && ok "관리자 조회" || bad "관리자 조회 CODE=$CODE"
api PUT /admin/app-version '{"iosLatest":"1.7","iosMin":"1.6"}' "$ADM" >/dev/null
echo "----- STEP32: PASS=$PASS FAIL=$FAIL -----"
