#!/bin/bash
# STEP 16: 리조트 시즌(개장·폐장일·홈 카운트다운) + 스키장 후기·별점
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
expect() { # expect <code> <label>
  [ "$CODE" = "$1" ] && ok "$2 ($1)" || bad "$2 기대 $1 실제 $CODE $(echo "$RESP" | head -c 100)"
}

echo "===== STEP 16: 리조트 시즌·후기 ====="

# ── 유저 준비: 후기러 2명 + 관리자
USER_TOKEN=$(register_verified "01099960001" "rs_user@s16.test" "후기러" "후기러")
USER2_TOKEN=$(register_verified "01099960002" "rs_user2@s16.test" "후기러2" "후기러2")
ADM_TOKEN=$(register_verified "01099960003" "rs_admin@s16.test" "시즌관리자" "시즌관리자")
pq "UPDATE users SET role='admin' WHERE email='rs_admin@s16.test'" >/dev/null
ADM_TOKEN=$(login "rs_admin@s16.test" 'Re!pass1234')
USER_ID=$(pq "SELECT id FROM users WHERE email='rs_user@s16.test'")
USER2_ID=$(pq "SELECT id FROM users WHERE email='rs_user2@s16.test'")
[ -n "$USER_TOKEN" ] && [ -n "$USER2_TOKEN" ] && [ -n "$ADM_TOKEN" ] && ok "유저 3명 준비" || bad "유저 준비 실패"

# ── 리조트 준비 (ski_resorts 는 시드 테이블 — 러너가 보존. 비어 있으면 하나 넣는다)
RCOUNT=$(pq "SELECT count(*) FROM ski_resorts")
if [ "${RCOUNT:-0}" = "0" ]; then
  pq "INSERT INTO ski_resorts (id,name,location,\"createdAt\",\"updatedAt\") VALUES (gen_random_uuid()::text,'테스트리조트','강원',now(),now())" >/dev/null
fi
# 이전 실행이 남긴 시즌 날짜가 next 판정을 흔들지 않게 전부 비움
pq "UPDATE ski_resorts SET \"openDate\"=NULL, \"closeDate\"=NULL, \"seasonNote\"=NULL" >/dev/null
RID=$(pq "SELECT id FROM ski_resorts ORDER BY name LIMIT 1")
RNAME=$(pq "SELECT name FROM ski_resorts WHERE id='$RID'")
RNAME_ENC=$(jq -rn --arg s "$RNAME" '$s|@uri')
[ -n "$RID" ] && [ -n "$RNAME" ] && ok "리조트 준비 ($RNAME)" || bad "리조트 준비 실패 RID=$RID"

# 날짜: 오늘 +30일(개장), +20일(개장보다 빠른 폐장 → 400), +120일(폐장). macOS date -v, 리눅스 date -d 폴백
OPEN=$(date -v+30d +%F 2>/dev/null || date -d '+30 days' +%F)
EARLY=$(date -v+20d +%F 2>/dev/null || date -d '+20 days' +%F)
CLOSE=$(date -v+120d +%F 2>/dev/null || date -d '+120 days' +%F)
[ -n "$OPEN" ] && [ -n "$EARLY" ] && [ -n "$CLOSE" ] && ok "날짜 계산 open=$OPEN close=$CLOSE" || bad "날짜 계산 실패"

# ── 시즌 정보 (관리자 PUT)
api PUT "/resorts/$RID/season" "{\"openDate\":\"$OPEN\"}" "$USER_TOKEN"; expect 403 "일반 회원 시즌 수정 403"
api PUT "/resorts/$RID/season" "{\"openDate\":\"$OPEN\"}" ""; expect 401 "비로그인 시즌 수정 401"
api PUT "/resorts/$RID/season" "{\"openDate\":\"$OPEN\",\"seasonNote\":\"야간 슬로프 운영\"}" "$ADM_TOKEN"; expect 200 "관리자 개장일 저장 200"
OD=$(echo "$RESP" | jq -r '.openDate'); NOTE=$(echo "$RESP" | jq -r '.seasonNote')
[ "$OD" != "null" ] && [ -n "$OD" ] && [ "$NOTE" = "야간 슬로프 운영" ] && ok "저장 응답에 openDate·seasonNote" || bad "저장 응답 openDate=$OD note=$NOTE"
api PUT "/resorts/$RID/season" "{\"closeDate\":\"$EARLY\"}" "$ADM_TOKEN"; expect 400 "개장일보다 빠른 폐장일 400"
api PUT "/resorts/$RID/season" "{\"openDate\":\"2026-13-45\"}" "$ADM_TOKEN"; expect 400 "잘못된 날짜 형식 400"
api PUT "/resorts/$RID/season" "{\"seasonNote\":\"$(printf 'a%.0s' $(seq 1 101))\"}" "$ADM_TOKEN"; expect 400 "메모 101자 400"
api PUT "/resorts/$RID/season" "{\"closeDate\":\"$CLOSE\"}" "$ADM_TOKEN"; expect 200 "폐장일 저장 200"
api PUT "/resorts/00000000-0000-4000-8000-000000000000/season" "{\"openDate\":\"$OPEN\"}" "$ADM_TOKEN"; expect 404 "없는 리조트 시즌 수정 404"

# ── 시즌 요약 (공개)
api GET "/resorts/season" ""; expect 200 "시즌 요약 조회 200"
NN=$(echo "$RESP" | jq -r '.next.name'); DL=$(echo "$RESP" | jq -r '.next.daysLeft'); ON=$(echo "$RESP" | jq -r '.openNow')
[ "$NN" = "$RNAME" ] && ok "next.name = $RNAME" || bad "next.name=$NN (기대 $RNAME)"
[ "$DL" -ge 29 ] 2>/dev/null && [ "$DL" -le 31 ] && ok "next.daysLeft=$DL (29~31)" || bad "next.daysLeft=$DL"
[ "$ON" = "0" ] && ok "openNow=0 (아직 개장 전)" || bad "openNow=$ON"
FIRST=$(echo "$RESP" | jq -r '.resorts[0].id'); [ "$FIRST" = "$RID" ] && ok "목록 첫 항목 = 개장일 있는 리조트 (nulls last)" || bad "목록 정렬 first=$FIRST"

# 리조트 목록에도 시즌 컬럼 포함
api GET "/resorts" ""; LOD=$(echo "$RESP" | jq -r ".[] | select(.id==\"$RID\") | .openDate"); [ -n "$LOD" ] && [ "$LOD" != "null" ] && ok "/resorts 목록에 openDate 포함" || bad "/resorts openDate=$LOD"

# 랜딩에 season·reviews
api GET "/resorts/landing/$RNAME_ENC" ""; expect 200 "리조트 랜딩 200"
LSO=$(echo "$RESP" | jq -r '.season.openDate'); LRC=$(echo "$RESP" | jq -r '.reviews.count')
[ "$LSO" != "null" ] && [ -n "$LSO" ] && ok "랜딩 season.openDate 포함" || bad "랜딩 season.openDate=$LSO"
[ "$LRC" = "0" ] && ok "랜딩 reviews.count=0 (후기 전)" || bad "랜딩 reviews.count=$LRC"

# ── 후기·별점
api POST "/resort-reviews/$RID" '{"rating":5,"content":"슬로프 정설 상태가 좋았어요"}' ""; expect 401 "비로그인 후기 작성 401"
api POST "/resort-reviews/$RID" '{"rating":6,"content":"슬로프 정설 상태가 좋았어요"}' "$USER_TOKEN"; expect 400 "별점 6 → 400"
api POST "/resort-reviews/$RID" '{"rating":0,"content":"슬로프 정설 상태가 좋았어요"}' "$USER_TOKEN"; expect 400 "별점 0 → 400"
api POST "/resort-reviews/$RID" '{"rating":4,"content":"짧다"}' "$USER_TOKEN"; expect 400 "내용 5자 미만 400"
api POST "/resort-reviews/00000000-0000-4000-8000-000000000000" '{"rating":4,"content":"슬로프 정설 상태가 좋았어요"}' "$USER_TOKEN"; expect 404 "없는 리조트 후기 404"
api POST "/resort-reviews/$RID" '{"rating":5,"content":"슬로프 정설 상태가 좋았어요"}' "$USER_TOKEN"; expect 201 "user1 후기 작성 201"
api POST "/resort-reviews/$RID" '{"rating":5,"content":"다시 가도 좋을 스키장이에요"}' "$USER_TOKEN"; expect 200 "user1 다시 작성 → 수정 200"
api GET "/resort-reviews/$RID" ""; C1=$(echo "$RESP" | jq -r '.count'); T1=$(echo "$RESP" | jq -r '.items[0].content')
[ "$C1" = "1" ] && ok "수정 후 count=1 (덮어쓰기)" || bad "count=$C1"
[ "$T1" = "다시 가도 좋을 스키장이에요" ] && ok "수정 내용 반영" || bad "내용=$T1"
api POST "/resort-reviews/$RID" '{"rating":3,"content":"주말엔 리프트 줄이 길어요"}' "$USER2_TOKEN"; expect 201 "user2 후기 작성 201"
api GET "/resort-reviews/$RID" ""; C2=$(echo "$RESP" | jq -r '.count'); AVG=$(echo "$RESP" | jq -r '.avg'); MR=$(echo "$RESP" | jq -r '.myReview')
[ "$C2" = "2" ] && ok "count=2" || bad "count=$C2"
[ "$AVG" = "4" ] && ok "avg=4 (5·3 평균)" || bad "avg=$AVG"
[ "$MR" = "null" ] && ok "비로그인 myReview=null" || bad "비로그인 myReview=$MR"
NM=$(echo "$RESP" | jq -r '[.items[].user.name] | sort | join(",")'); [ "$NM" = "후기러,후기러2" ] && ok "닉네임 노출 ($NM)" || bad "user.name=$NM"
echo "$RESP" | grep -q '"email"' && bad "공개 후기에 email 노출" || ok "공개 후기에 email 없음"
echo "$RESP" | grep -q '"phone"' && bad "공개 후기에 phone 노출" || ok "공개 후기에 phone 없음"
api GET "/resort-reviews/$RID" "" "$USER_TOKEN"; MRR=$(echo "$RESP" | jq -r '.myReview.rating'); [ "$MRR" = "5" ] && ok "user1 myReview.rating=5" || bad "myReview.rating=$MRR"
api GET "/resort-reviews/$RID?limit=1" ""; LN=$(echo "$RESP" | jq -r '.items | length'); LC=$(echo "$RESP" | jq -r '.count'); [ "$LN" = "1" ] && [ "$LC" = "2" ] && ok "limit=1 → items 1개, count 2 유지" || bad "limit items=$LN count=$LC"
api GET "/resort-reviews/00000000-0000-4000-8000-000000000000" ""; expect 404 "없는 리조트 후기 조회 404"

# 랜딩 집계 반영
api GET "/resorts/landing/$RNAME_ENC" ""; LRC2=$(echo "$RESP" | jq -r '.reviews.count'); LRA=$(echo "$RESP" | jq -r '.reviews.avg')
[ "$LRC2" = "2" ] && [ "$LRA" = "4" ] && ok "랜딩 reviews {avg:4,count:2}" || bad "랜딩 reviews count=$LRC2 avg=$LRA"

# ── 삭제
api DELETE "/resort-reviews/$RID" "" ""; expect 401 "비로그인 삭제 401"
api DELETE "/resort-reviews/$RID" "" "$USER_TOKEN"; expect 200 "user1 내 후기 삭제 200"
api DELETE "/resort-reviews/$RID" "" "$USER_TOKEN"; expect 404 "이미 지운 후기 재삭제 404"
api GET "/resort-reviews/$RID" ""; C3=$(echo "$RESP" | jq -r '.count'); [ "$C3" = "1" ] && ok "삭제 후 count=1" || bad "count=$C3"
api DELETE "/resort-reviews/$RID/$USER2_ID" "" "$USER_TOKEN"; expect 403 "일반 회원의 관리자 삭제 403"
api DELETE "/resort-reviews/$RID/$USER2_ID" "" "$ADM_TOKEN"; expect 200 "관리자 user2 후기 삭제 200"
api DELETE "/resort-reviews/$RID/$USER2_ID" "" "$ADM_TOKEN"; expect 404 "관리자 재삭제 404"
api GET "/resort-reviews/$RID" ""; C4=$(echo "$RESP" | jq -r '.count'); [ "$C4" = "0" ] && ok "관리자 삭제 후 count=0" || bad "count=$C4"

# ── 정리: 시즌 날짜 비우기 (null 저장) → next 없음
api PUT "/resorts/$RID/season" '{"openDate":null,"closeDate":null,"seasonNote":null}' "$ADM_TOKEN"; expect 200 "시즌 날짜 비우기 200"
api GET "/resorts/season" ""; NN2=$(echo "$RESP" | jq -r '.next'); [ "$NN2" = "null" ] && ok "비운 뒤 next=null" || bad "next=$NN2"

echo "----- STEP16: PASS=$PASS FAIL=$FAIL -----"
