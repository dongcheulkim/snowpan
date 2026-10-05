#!/bin/bash
# STEP 38: 스키장 개장 알림 (2026-10-05)
# - 로그인 회원이 "개장하면 알려줘" 신청/취소, 개장일이 정해지면 신청자에게만 알림, 개장 전날 알림(1회), 개장 뒤 정리
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
daily() { # 하루 한 번 도는 작업을 직접 실행 → "전날알림건수,정리건수"
  (cd "$(cd "$(dirname "$0")/.." && pwd)/backend" && DATABASE_URL="postgresql://snowtest@localhost:5433/snowpan_test" npx tsx -e "import('./src/utils/openAlert.ts').then(async mm=>{const m=mm.default||mm; const r=await m.runOpenAlertDaily(); console.log(r.eve+','+r.cleaned); process.exit(0)})" 2>/dev/null | tail -1)
}
echo "===== STEP 38: 스키장 개장 알림 ====="
U1=$(register_verified "01099990381" "oa_user1@s38.test" "개장알림회원1" "개장알림회원1"); [ -z "$U1" ] && U1=$(login "oa_user1@s38.test" 'Re!pass1234')
U2=$(register_verified "01099990382" "oa_user2@s38.test" "개장알림회원2" "개장알림회원2"); [ -z "$U2" ] && U2=$(login "oa_user2@s38.test" 'Re!pass1234')
ADM=$(register_verified "01099990383" "oa_admin@s38.test" "개장알림관리자" "개장알림관리자")
pq "UPDATE users SET role='admin' WHERE email='oa_admin@s38.test'" >/dev/null
ADM=$(login "oa_admin@s38.test" 'Re!pass1234')
U1_ID=$(pq "SELECT id FROM users WHERE email='oa_user1@s38.test'"); U2_ID=$(pq "SELECT id FROM users WHERE email='oa_user2@s38.test'")
RID=$(pq "SELECT id FROM ski_resorts ORDER BY name LIMIT 1"); RNAME=$(pq "SELECT name FROM ski_resorts WHERE id='$RID'")
[ -n "$U1" ] && [ -n "$U2" ] && [ -n "$ADM" ] && [ -n "$RID" ] && ok "준비 ($RNAME)" || bad "준비 실패"
pq "UPDATE ski_resorts SET \"openDate\"=NULL, \"closeDate\"=NULL WHERE id='$RID'; DELETE FROM resort_open_alerts" >/dev/null
OPEN=$(date -v+30d +%F 2>/dev/null || date -d '+30 days' +%F)
TOMORROW=$(TZ=Asia/Seoul date -v+1d +%F 2>/dev/null || TZ=Asia/Seoul date -d '+1 day' +%F)
YESTERDAY=$(TZ=Asia/Seoul date -v-1d +%F 2>/dev/null || TZ=Asia/Seoul date -d '-1 day' +%F)
ncount() { pq "SELECT count(*) FROM notifications WHERE \"userId\"='$1' AND title='$2'"; }

api GET "/resorts/$RID/open-alert" "" ""; [ "$CODE" = "401" ] && ok "비로그인 상태 조회 401" || bad "비로그인 조회 CODE=$CODE"
api POST "/resorts/$RID/open-alert" "" ""; [ "$CODE" = "401" ] && ok "비로그인 신청 401" || bad "비로그인 신청 CODE=$CODE"
api GET "/resorts/$RID/open-alert" "" "$U1"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.subscribed')" = "false" ] && ok "신청 전 subscribed=false" || bad "신청 전 CODE=$CODE RESP=$RESP"
api POST "/resorts/00000000-0000-0000-0000-000000000000/open-alert" "" "$U1"; [ "$CODE" = "404" ] && ok "없는 스키장 404" || bad "없는 스키장 CODE=$CODE"
api POST "/resorts/$RID/open-alert" "" "$U1"; [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.subscribed')" = "true" ] && ok "신청 201" || bad "신청 CODE=$CODE RESP=$RESP"
api POST "/resorts/$RID/open-alert" "" "$U1"; [ "$CODE" = "201" ] && [ "$(pq "SELECT count(*) FROM resort_open_alerts WHERE \"userId\"='$U1_ID'")" = "1" ] && ok "두 번 눌러도 한 건" || bad "중복 신청 CODE=$CODE"
api GET "/resorts/$RID/open-alert" "" "$U1"; [ "$(echo "$RESP" | jq -r '.subscribed')" = "true" ] && ok "신청 후 subscribed=true" || bad "신청 후 RESP=$RESP"
api GET "/resorts/$RID/open-alert" "" "$U2"; [ "$(echo "$RESP" | jq -r '.subscribed')" = "false" ] && ok "다른 회원은 영향 없음" || bad "다른 회원 RESP=$RESP"

# 개장일 확정 → 신청자에게만 알림
api PUT "/resorts/$RID/season" "{\"openDate\":\"$OPEN\"}" "$ADM"; [ "$CODE" = "200" ] && ok "관리자 개장일 저장" || bad "개장일 저장 CODE=$CODE RESP=$RESP"
sleep 1
T1="$RNAME 개장일이 정해졌어요"
[ "$(ncount "$U1_ID" "$T1")" = "1" ] && ok "신청자에게 개장일 알림 1건" || bad "신청자 알림 수=$(ncount "$U1_ID" "$T1")"
[ "$(ncount "$U2_ID" "$T1")" = "0" ] && ok "신청 안 한 회원에겐 알림 없음" || bad "미신청 회원 알림 발생"
NL=$(pq "SELECT link FROM notifications WHERE \"userId\"='$U1_ID' AND title='$T1' LIMIT 1"); echo "$NL" | grep -q '^/resort/' && ok "알림 누르면 스키장 페이지로" || bad "알림 링크=$NL"
api PUT "/resorts/$RID/season" "{\"openDate\":\"$OPEN\",\"seasonNote\":\"야간 운영\"}" "$ADM"; sleep 1
[ "$(ncount "$U1_ID" "$T1")" = "1" ] && ok "같은 날짜로 다시 저장하면 알림 없음" || bad "같은 날짜 재알림 수=$(ncount "$U1_ID" "$T1")"

# 개장 전날 알림 — 내일 개장으로 바꾸면(날짜 변경 알림 1건 추가) 하루 작업이 전날 알림을 한 번만 보냄
[ "$(daily)" = "0,0" ] && ok "개장이 멀면 하루 작업은 아무것도 안 함" || bad "먼 개장일 daily 결과"
api PUT "/resorts/$RID/season" "{\"openDate\":\"$TOMORROW\"}" "$ADM"; sleep 1
[ "$(ncount "$U1_ID" "$T1")" = "2" ] && ok "개장일이 바뀌면 다시 알림" || bad "날짜 변경 알림 수=$(ncount "$U1_ID" "$T1")"
T2="내일 $RNAME 개장"
R=$(daily); [ "$R" = "1,0" ] && [ "$(ncount "$U1_ID" "$T2")" = "1" ] && ok "개장 전날 알림 1건" || bad "전날 알림 daily=$R 수=$(ncount "$U1_ID" "$T2")"
R=$(daily); [ "$R" = "0,0" ] && [ "$(ncount "$U1_ID" "$T2")" = "1" ] && ok "전날 알림은 한 번만" || bad "전날 알림 중복 daily=$R"

# 취소 / 개장 뒤 정리
api POST "/resorts/$RID/open-alert" "" "$U2" >/dev/null
api DELETE "/resorts/$RID/open-alert" "" "$U2"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.subscribed')" = "false" ] && [ "$(pq "SELECT count(*) FROM resort_open_alerts WHERE \"userId\"='$U2_ID'")" = "0" ] && ok "취소 200" || bad "취소 CODE=$CODE RESP=$RESP"
pq "UPDATE ski_resorts SET \"openDate\"='$YESTERDAY' WHERE id='$RID'; UPDATE resort_open_alerts SET \"createdAt\"=now() - interval '10 days'" >/dev/null
api POST "/resorts/$RID/open-alert" "" "$U2" >/dev/null # 개장 뒤 다음 시즌용 신청은 남아야 함
R=$(daily); [ "$R" = "0,1" ] && [ "$(pq "SELECT count(*) FROM resort_open_alerts WHERE \"userId\"='$U1_ID'")" = "0" ] && [ "$(pq "SELECT count(*) FROM resort_open_alerts WHERE \"userId\"='$U2_ID'")" = "1" ] && ok "개장 뒤 지난 신청만 정리 (새 신청은 유지)" || bad "정리 daily=$R"
api PUT "/resorts/$RID/season" "{\"openDate\":\"$YESTERDAY\",\"seasonNote\":\"\"}" "$ADM" >/dev/null
pq "UPDATE ski_resorts SET \"openDate\"=NULL, \"closeDate\"=NULL, \"seasonNote\"=NULL WHERE id='$RID'; DELETE FROM resort_open_alerts" >/dev/null

echo "----- STEP 38 결과: PASS=$PASS FAIL=$FAIL -----"
[ "$FAIL" = "0" ]
