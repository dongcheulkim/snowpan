#!/bin/bash
# STEP 33: 저장소 안 쓰는 사진 점검 (2026-09-26) — 관리자만 조회, 키 없으면 configured=false, 파라미터 검증. 삭제 기능 없음(조회만).
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
echo "===== STEP 33: 저장소 안 쓰는 사진 점검 ====="
USER=$(register_verified "01099990331" "so_user@s33.test" "저장유저" "저장유저"); [ -z "$USER" ] && USER=$(login "so_user@s33.test" 'Re!pass1234')
ADM=$(register_verified "01099990335" "so_admin@s33.test" "저장관리자" "저장관리자")
pq "UPDATE users SET role='admin' WHERE email='so_admin@s33.test'" >/dev/null
ADM=$(login "so_admin@s33.test" 'Re!pass1234')
[ -n "$USER" ] && [ -n "$ADM" ] && ok "유저 준비" || bad "유저 준비 실패"
api GET /admin/jobs/storage-orphans ""; [ "$CODE" = "401" ] && ok "비로그인 401" || bad "비로그인 CODE=$CODE"
api GET /admin/jobs/storage-orphans "" "$USER"; [ "$CODE" = "403" ] && ok "비관리자 403" || bad "비관리자 CODE=$CODE"
api GET "/admin/jobs/storage-orphans?olderThanDays=abc" "" "$ADM"; [ "$CODE" = "400" ] && ok "잘못된 기간 400" || bad "기간 CODE=$CODE"
api GET /admin/jobs/storage-orphans "" "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.configured')" = "false" ] && [ "$(echo "$RESP" | jq -r '.orphans')" = "0" ] && ok "키 없는 환경: configured=false, 대상 0" || bad "점검 CODE=$CODE RESP=$(echo $RESP | head -c 150)"
echo "----- STEP33: PASS=$PASS FAIL=$FAIL -----"
