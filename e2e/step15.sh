#!/bin/bash
# STEP 15: 시합 일정 등록·승인 — 주최자 신청 → 관리자 승인/반려 → 공개 목록·알림·수정·삭제·지난 대회
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

echo "===== STEP 15: 시합 일정 등록·승인 ====="

ORG_TOKEN=$(register_verified "01099950001" "comp_org@s15.test" "주최자" "주최자")
USER_TOKEN=$(register_verified "01099950002" "comp_user@s15.test" "일반회원" "일반회원")
ADM_TOKEN=$(register_verified "01099950003" "comp_admin@s15.test" "시합관리자" "시합관리자")
pq "UPDATE users SET role='admin' WHERE email='comp_admin@s15.test'" >/dev/null
ADM_TOKEN=$(login "comp_admin@s15.test" 'Re!pass1234')
ORG_ID=$(pq "SELECT id FROM users WHERE email='comp_org@s15.test'")
ADM_ID=$(pq "SELECT id FROM users WHERE email='comp_admin@s15.test'")
[ -n "$ORG_TOKEN" ] && [ -n "$USER_TOKEN" ] && [ -n "$ADM_TOKEN" ] && ok "유저 3명 준비" || bad "유저 준비 실패"

# ── 신청 검증 (검증 실패도 사용자별 신청 한도(5/시간)에 세이므로 일반회원 토큰으로)
api POST /competitions '{"title":"S15 비로그인","date":"2027-01-10","location":"용평","sport":"ski","organizer":"S15"}'
[ "$CODE" = "401" ] && ok "비로그인 신청 401" || bad "비로그인 신청 CODE=$CODE"

api POST /competitions '{"title":"S15 잘못된 종목","date":"2027-01-10","location":"용평","sport":"golf","organizer":"S15"}' "$USER_TOKEN"
[ "$CODE" = "400" ] && ok "잘못된 종목 400" || bad "잘못된 종목 CODE=$CODE RESP=$(echo $RESP|head -c 100)"

api POST /competitions '{"title":"S","date":"2027-01-10","location":"용평","sport":"ski","organizer":"S15"}' "$USER_TOKEN"
[ "$CODE" = "400" ] && ok "제목 1자 400" || bad "제목 1자 CODE=$CODE"

api POST /competitions '{"title":"S15 날짜오류","date":"2027-01-10","endDate":"2027-01-09","location":"용평","sport":"ski","organizer":"S15"}' "$USER_TOKEN"
[ "$CODE" = "400" ] && ok "종료일이 시작일보다 빠름 400" || bad "종료일 CODE=$CODE"

api POST /competitions '{"title":"S15 링크오류","date":"2027-01-10","location":"용평","sport":"ski","organizer":"S15","website":"http://example.com"}' "$USER_TOKEN"
[ "$CODE" = "400" ] && ok "http 링크 400 (https 만)" || bad "http 링크 CODE=$CODE"

# ── 주최자 신청 → 201 pending
api POST /competitions '{"title":"S15 주최자컵","date":"2027-02-14","endDate":"2027-02-15","location":"용평리조트","sport":"both","organizer":"S15 주최","level":"아마추어","website":"https://example.com/s15","events":"대회전\n회전","schedule":"08:00 접수\n09:30 1차 런","poster":"/uploads/e2e.jpg","description":"<b>E2E</b> 설명"}' "$ORG_TOKEN"
C1=$(echo "$RESP" | jq -r '.id'); ST=$(echo "$RESP" | jq -r '.status'); DESC=$(echo "$RESP" | jq -r '.description')
[ "$CODE" = "201" ] && [ "$ST" = "pending" ] && ok "주최자 신청 201 pending" || bad "주최자 신청 CODE=$CODE ST=$ST RESP=$(echo $RESP|head -c 150)"
[ "$DESC" = "E2E 설명" ] && ok "설명 HTML 태그 제거" || bad "설명 sanitize DESC=$DESC"

# 공개 목록 미노출
api GET /competitions
N=$(echo "$RESP" | jq -r '[.items[] | select(.title=="S15 주최자컵")] | length')
[ "$CODE" = "200" ] && [ "$N" = "0" ] && ok "검토 중 대회 공개 목록 미노출" || bad "공개 목록 CODE=$CODE N=$N"

# 단건: 타인·비로그인 404, 본인·관리자 200
api GET "/competitions/$C1" "" "$USER_TOKEN"
[ "$CODE" = "404" ] && ok "타인이 검토 중 대회 조회 404" || bad "타인 조회 CODE=$CODE"
api GET "/competitions/$C1"
[ "$CODE" = "404" ] && ok "비로그인 검토 중 대회 조회 404" || bad "비로그인 조회 CODE=$CODE"
api GET "/competitions/$C1" "" "$ORG_TOKEN"
[ "$CODE" = "200" ] && ok "본인 검토 중 대회 조회 200" || bad "본인 조회 CODE=$CODE"
api GET "/competitions/$C1" "" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "관리자 검토 중 대회 조회 200" || bad "관리자 조회 CODE=$CODE"

# 내 신청 내역
api GET /competitions/mine "" "$ORG_TOKEN"
N=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$C1\")] | length")
[ "$CODE" = "200" ] && [ "$N" = "1" ] && ok "내 신청 내역에 포함" || bad "mine CODE=$CODE N=$N"
api GET /competitions/mine "" "$USER_TOKEN"
N=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$C1\")] | length")
[ "$CODE" = "200" ] && [ "$N" = "0" ] && ok "타인 신청 내역엔 없음" || bad "타인 mine CODE=$CODE N=$N"

# 관리자 대기 목록
api GET /competitions/admin/pending "" "$USER_TOKEN"
[ "$CODE" = "403" ] && ok "비관리자 대기 목록 403" || bad "비관리자 대기 목록 CODE=$CODE"
api GET /competitions/admin/pending "" "$ADM_TOKEN"
N=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$C1\")] | length")
SUB=$(echo "$RESP" | jq -r ".[] | select(.id==\"$C1\") | .submittedBy.email")
[ "$CODE" = "200" ] && [ "$N" = "1" ] && [ "$SUB" = "comp_org@s15.test" ] && ok "관리자 대기 목록 포함 (+신청자 이메일)" || bad "대기 목록 CODE=$CODE N=$N SUB=$SUB"

AN=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$ADM_ID' AND title='시합 일정 등록 신청'")
[ "$AN" -ge 1 ] && ok "관리자에게 신청 알림" || bad "관리자 알림 AN=$AN"

# ── 승인: 비관리자 403 → 관리자 200
api PUT "/competitions/$C1/approve" "{}" "$USER_TOKEN"
[ "$CODE" = "403" ] && ok "비관리자 승인 403" || bad "비관리자 승인 CODE=$CODE"
api PUT "/competitions/$C1/approve" "{}" "$ORG_TOKEN"
[ "$CODE" = "403" ] && ok "주최자 본인 승인 403" || bad "본인 승인 CODE=$CODE"
api PUT "/competitions/$C1/approve" "{}" "$ADM_TOKEN"
ST=$(echo "$RESP" | jq -r '.status')
[ "$CODE" = "200" ] && [ "$ST" = "approved" ] && ok "관리자 승인 200 approved" || bad "승인 CODE=$CODE ST=$ST"

api GET /competitions
N=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$C1\")] | length")
D=$(echo "$RESP" | jq -r ".items[] | select(.id==\"$C1\") | .date")
ED=$(echo "$RESP" | jq -r ".items[] | select(.id==\"$C1\") | .endDate")
[ "$N" = "1" ] && [ "$D" = "2027-02-14" ] && [ "$ED" = "2027-02-15" ] && ok "승인 후 공개 목록 노출 (KST 날짜 그대로)" || bad "승인 후 목록 N=$N D=$D ED=$ED"

api GET "/competitions?sport=board"
N=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$C1\")] | length")
[ "$N" = "1" ] && ok "sport=board 필터에 스키·보드 대회 포함" || bad "sport 필터 N=$N"

api GET "/competitions/$C1" "" "$USER_TOKEN"
EV=$(echo "$RESP" | jq -r '.events')
[ "$CODE" = "200" ] && [ "$EV" = $'대회전\n회전' ] && ok "승인 후 타인 조회 200 (종목 줄바꿈 유지)" || bad "승인 후 타인 조회 CODE=$CODE EV=$EV"

NC=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$ORG_ID' AND title='시합 일정이 등록됐어요'")
[ "$NC" = "1" ] && ok "주최자 승인 알림" || bad "승인 알림 NC=$NC"
NL=$(pq "SELECT link FROM notifications WHERE \"userId\"='$ORG_ID' AND title='시합 일정이 등록됐어요' LIMIT 1")
[ "$NL" = "/competitions/$C1" ] && ok "승인 알림 링크 = 상세" || bad "승인 알림 링크 NL=$NL"

# 공개된 일정은 주최자가 수정 불가
api PUT "/competitions/$C1" '{"title":"S15 주최자컵 수정","date":"2027-02-14","location":"용평리조트","sport":"ski","organizer":"S15 주최"}' "$ORG_TOKEN"
[ "$CODE" = "403" ] && ok "공개된 일정 주최자 수정 403" || bad "공개 일정 수정 CODE=$CODE"

# ── 관리자 직접 등록 → 즉시 approved
api POST /competitions '{"title":"S15 관리자컵","date":"2027-03-01","location":"곤지암","sport":"ski","organizer":"스노우판"}' "$ADM_TOKEN"
C_ADM=$(echo "$RESP" | jq -r '.id'); ST=$(echo "$RESP" | jq -r '.status')
[ "$CODE" = "201" ] && [ "$ST" = "approved" ] && ok "관리자 직접 등록 즉시 approved" || bad "관리자 등록 CODE=$CODE ST=$ST"
api GET /competitions
N=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$C_ADM\")] | length")
[ "$N" = "1" ] && ok "관리자 등록 대회 즉시 공개" || bad "관리자 등록 공개 N=$N"

# ── 반려 흐름 (두 번째 신청)
api POST /competitions '{"title":"S15 반려컵","date":"2027-03-10","location":"하이원","sport":"board","organizer":"S15 주최"}' "$ORG_TOKEN"
C2=$(echo "$RESP" | jq -r '.id')
[ "$CODE" = "201" ] && ok "두 번째 신청 201" || bad "두 번째 신청 CODE=$CODE"
api PUT "/competitions/$C2/reject" '{"reason":"포스터가 없어요","sendChat":false}' "$USER_TOKEN"
[ "$CODE" = "403" ] && ok "비관리자 반려 403" || bad "비관리자 반려 CODE=$CODE"
api PUT "/competitions/$C2/reject" '{"reason":"포스터가 없어요","sendChat":false}' "$ADM_TOKEN"
ST=$(echo "$RESP" | jq -r '.status'); RR=$(echo "$RESP" | jq -r '.rejectReason')
[ "$CODE" = "200" ] && [ "$ST" = "rejected" ] && [ "$RR" = "포스터가 없어요" ] && ok "관리자 반려 200 rejected + 사유" || bad "반려 CODE=$CODE ST=$ST RR=$RR"
NC=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$ORG_ID' AND title='시합 일정 신청이 반려됐어요' AND message LIKE '%포스터가 없어요%'")
[ "$NC" = "1" ] && ok "주최자 반려 알림 (사유 포함)" || bad "반려 알림 NC=$NC"
api GET /competitions/mine "" "$ORG_TOKEN"
MST=$(echo "$RESP" | jq -r ".items[] | select(.id==\"$C2\") | .status")
[ "$MST" = "rejected" ] && ok "내 신청 내역에 반려 상태" || bad "mine 반려 상태 MST=$MST"

# 반려 후 주최자 수정 → 다시 pending, 사유 초기화
api PUT "/competitions/$C2" '{"title":"S15 반려컵 보완","date":"2027-03-10","location":"하이원","sport":"board","organizer":"S15 주최","poster":"/uploads/e2e.jpg"}' "$ORG_TOKEN"
ST=$(echo "$RESP" | jq -r '.status'); RR=$(echo "$RESP" | jq -r '.rejectReason'); T=$(echo "$RESP" | jq -r '.title')
[ "$CODE" = "200" ] && [ "$ST" = "pending" ] && [ "$RR" = "null" ] && [ "$T" = "S15 반려컵 보완" ] && ok "반려 후 수정 → 다시 pending" || bad "반려 후 수정 CODE=$CODE ST=$ST RR=$RR T=$T"

api PUT "/competitions/$C2" '{"title":"S15 해킹","date":"2027-03-10","location":"하이원","sport":"board","organizer":"X"}' "$USER_TOKEN"
[ "$CODE" = "403" ] && ok "타인 수정 403" || bad "타인 수정 CODE=$CODE"

api PUT "/competitions/$C2" '{"title":"S15 반려컵 보완","date":"2027-03-10","location":"하이원","sport":"board","organizer":"S15 주최","poster":"https://evil.example.com/x.png"}' "$ORG_TOKEN"
[ "$CODE" = "400" ] && ok "외부 포스터 URL 400" || bad "외부 포스터 CODE=$CODE"

# ── 삭제: 타인 403, 본인 200, 이후 404
api DELETE "/competitions/$C2" "" "$USER_TOKEN"
[ "$CODE" = "403" ] && ok "타인 삭제 403" || bad "타인 삭제 CODE=$CODE"
api DELETE "/competitions/$C2" "" "$ORG_TOKEN"
[ "$CODE" = "200" ] && ok "본인 삭제 200" || bad "본인 삭제 CODE=$CODE"
api GET "/competitions/$C2" "" "$ORG_TOKEN"
[ "$CODE" = "404" ] && ok "삭제 후 404" || bad "삭제 후 CODE=$CODE"

# ── 지난 대회 (past=1)
api POST /competitions '{"title":"S15 지난컵","date":"2020-01-10","location":"무주","sport":"ski","organizer":"스노우판"}' "$ADM_TOKEN"
C_PAST=$(echo "$RESP" | jq -r '.id')
[ "$CODE" = "201" ] && ok "지난 대회 등록 (관리자)" || bad "지난 대회 등록 CODE=$CODE"
api GET /competitions
N=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$C_PAST\")] | length")
[ "$N" = "0" ] && ok "기본 목록에 지난 대회 미노출" || bad "기본 목록 지난 대회 N=$N"
api GET "/competitions?past=1"
N=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$C_PAST\")] | length")
N2=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$C1\")] | length")
[ "$CODE" = "200" ] && [ "$N" = "1" ] && [ "$N2" = "0" ] && ok "past=1 목록엔 지난 대회만" || bad "past=1 CODE=$CODE N=$N N2=$N2"

# 잘못된 id 형식 400
api GET /competitions/not-a-uuid
[ "$CODE" = "400" ] && ok "잘못된 id 형식 400" || bad "잘못된 id CODE=$CODE"

# 관리자 삭제 (정리)
api DELETE "/competitions/$C_PAST" "" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "관리자 삭제 200" || bad "관리자 삭제 CODE=$CODE"

echo "----- STEP15: PASS=$PASS FAIL=$FAIL -----"
