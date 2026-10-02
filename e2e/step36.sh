#!/bin/bash
# STEP 36: 외부 링크·사진·웹캠 자동 점검 (2026-10-02)
# - 관리자만 조회/실행, 실행하면 백그라운드로 돌고 결과(총수·죽은 목록·꺼진 웹캠)가 저장됨, 죽은 주소는 dead 로 잡힘
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
echo "===== STEP 36: 외부 링크 점검 ====="
USER=$(register_verified "01099990361" "lh_user@s36.test" "일반회원36" "일반회원36"); [ -z "$USER" ] && USER=$(login "lh_user@s36.test" 'Re!pass1234')
ADM=$(register_verified "01099990362" "lh_admin@s36.test" "점검관리자" "점검관리자")
pq "UPDATE users SET role='admin' WHERE email='lh_admin@s36.test'" >/dev/null
ADM=$(login "lh_admin@s36.test" 'Re!pass1234')
[ -n "$USER" ] && [ -n "$ADM" ] && ok "유저 준비" || bad "유저 준비 실패"
# 죽은 주소를 가진 배너 하나 심기 (DNS 없는 도메인) → dead 로 잡혀야 함
pq "INSERT INTO banners (id, title, description, tag, url, image, \"order\", active, \"createdAt\") VALUES (gen_random_uuid(), 'E2E 죽은 링크 배너 36', 'E2E', 'E2E', 'https://this-domain-does-not-exist-e2e36.invalid/', NULL, 99, true, now())" >/dev/null
api GET /admin/jobs/link-health "" "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 조회 거부" || bad "일반 조회 CODE=$CODE"
api GET /admin/jobs/link-health "" ""; [ "$CODE" = "401" ] && ok "비로그인 조회 거부" || bad "비로그인 CODE=$CODE"
api GET /admin/jobs/link-health "" "$ADM"; [ "$CODE" = "200" ] && ok "관리자 조회 (점검 전: $(echo "$RESP" | jq -r 'if .report==null then "기록 없음" else "기록 있음" end'))" || bad "관리자 조회 CODE=$CODE"
api POST /admin/jobs/link-health/run '{}' "$USER"; [ "$CODE" = "403" ] && ok "일반 회원 실행 거부" || bad "일반 실행 CODE=$CODE"
api POST /admin/jobs/link-health/run '{}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.started')" = "true" ] && ok "점검 시작" || bad "점검 시작 CODE=$CODE RESP=$RESP"
DONE=0
for i in $(seq 1 60); do
  sleep 3; api GET /admin/jobs/link-health "" "$ADM"
  if [ "$(echo "$RESP" | jq -r '.running')" = "false" ] && [ "$(echo "$RESP" | jq -r '.report != null')" = "true" ]; then DONE=1; break; fi
done
[ "$DONE" = "1" ] && ok "점검 완료 ($(echo "$RESP" | jq -r '.report.durationMs')ms)" || bad "점검이 3분 안에 안 끝남"
[ "$(echo "$RESP" | jq -r '.report.total | has("links") and has("images") and has("streams")')" = "true" ] && ok "결과에 링크·사진·웹캠 총수" || bad "총수 없음"
[ "$(echo "$RESP" | jq -r '[.report.dead[] | select(.url | test("e2e36.invalid"))] | length')" -ge "1" ] && ok "DNS 없는 배너 링크를 죽음으로 분류" || bad "죽은 링크 못 잡음: $(echo "$RESP" | jq -c '.report.dead' | cut -c1-200)"
[ "$(echo "$RESP" | jq -r '.report | has("blocked") and has("offlineStreams") and has("unknown")')" = "true" ] && ok "차단·꺼진 웹캠·확인불가 목록 있음" || bad "목록 키 없음"
# 관리자 알림 생성됨 (새로 죽은 링크)
[ "$(pq "SELECT count(*) FROM notifications WHERE type='link_health'")" -ge "1" ] && ok "관리자에게 죽은 링크 알림" || bad "알림 없음"
# 저장 키
[ "$(pq "SELECT count(*) FROM admin_settings WHERE key='link_health_last'")" = "1" ] && ok "결과 저장(admin_settings)" || bad "저장 안 됨"
# 매장 정보 보강(네이버 키 없는 로컬에선 configured=false, 관리자만)
api POST /admin/jobs/shop-enrich '{"dryRun":true}' "$USER"; [ "$CODE" = "403" ] && ok "보강: 일반 회원 거부" || bad "보강 일반 CODE=$CODE"
api POST /admin/jobs/shop-enrich '{"dryRun":true}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.dryRun')" = "true" ] && [ "$(echo "$RESP" | jq -r 'has("plan") and has("unmatched") and has("configured")')" = "true" ] && ok "보강: 관리자 dryRun 응답 형식 (configured=$(echo "$RESP" | jq -r '.configured'))" || bad "보강 CODE=$CODE RESP=$RESP"
pq "DELETE FROM banners WHERE title='E2E 죽은 링크 배너 36'" >/dev/null
echo "----- STEP36: PASS=$PASS FAIL=$FAIL -----"
