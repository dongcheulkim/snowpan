#!/bin/bash
# STEP 13: 매장 소식(ShopPost) 전주기 + 매장 리뷰 + 소유권 이전(claim) + 신고 + 저장검색
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

echo "===== STEP 13: 매장 소식·리뷰·소유권 이전·신고·저장검색 ====="

OWNER_TOKEN=$(register_verified "01099990001" "post_owner@re.test" "소식주인" "소식주인")
VISITOR_TOKEN=$(register_verified "01099990002" "post_visitor@re.test" "방문자" "방문자")
CLAIMER_TOKEN=$(register_verified "01099990003" "post_claimer@re.test" "진짜사장" "진짜사장")
ADM_TOKEN=$(register_verified "01099990004" "post_admin@re.test" "소식관리자" "소식관리자")
pq "UPDATE users SET role='admin' WHERE email='post_admin@re.test'" >/dev/null
ADM_TOKEN=$(login "post_admin@re.test" 'Re!pass1234')
OWNER_ID=$(pq "SELECT id FROM users WHERE email='post_owner@re.test'")
VISITOR_ID=$(pq "SELECT id FROM users WHERE email='post_visitor@re.test'")
CLAIMER_ID=$(pq "SELECT id FROM users WHERE email='post_claimer@re.test'")
[ -n "$OWNER_TOKEN" ] && [ -n "$VISITOR_TOKEN" ] && [ -n "$ADM_TOKEN" ] && ok "유저 4명 준비" || bad "유저 준비 실패"

# 스키샵 등록(미승인)
api POST /ski-shops '{"name":"소식샵","area":"용평","address":"평창","description":"소식 테스트","businessLicense":"/uploads/e2e.jpg"}' "$OWNER_TOKEN"
SHOP=$(echo "$RESP" | jq -r '.id')
[ "$CODE" = "201" ] && ok "스키샵 등록" || bad "스키샵 등록 CODE=$CODE"

# ── 소식: 미승인 매장 → 작성 403
api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"title\":\"오픈\",\"content\":\"내용\"}" "$OWNER_TOKEN"
[ "$CODE" = "403" ] && ok "미승인 매장 소식 작성 403" || bad "미승인 소식 CODE=$CODE RESP=$(echo $RESP|head -c 100)"

# 승인
api PUT "/ski-shops/$SHOP/approve" "{}" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "스키샵 승인" || bad "승인 CODE=$CODE"

# 비소유자 작성 403 / 잘못된 shopType 400 / 제목 없음 400 / 외부 이미지 400
api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"title\":\"x\",\"content\":\"y\"}" "$VISITOR_TOKEN"
[ "$CODE" = "403" ] && ok "비소유자 소식 작성 403" || bad "비소유자 소식 CODE=$CODE"
api POST /shop-posts "{\"shopType\":\"hack\",\"shopId\":\"$SHOP\",\"title\":\"x\",\"content\":\"y\"}" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "잘못된 shopType 400" || bad "shopType CODE=$CODE"
api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"title\":\"\",\"content\":\"y\"}" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "빈 제목 400" || bad "빈 제목 CODE=$CODE"
api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"title\":\"x\",\"content\":\"y\",\"images\":\"https://evil.example.com/p.jpg\"}" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "외부 이미지 소식 400" || bad "외부 이미지 CODE=$CODE"

# 정상 작성 (이벤트) — pinned 요청은 일반 소유자에겐 무시
api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"title\":\"<b>겨울 이벤트</b>\",\"content\":\"20% 할인\",\"postType\":\"event\",\"pinned\":true,\"images\":\"/uploads/e2e.jpg\"}" "$OWNER_TOKEN"
P1=$(echo "$RESP" | jq -r '.id'); PT=$(echo "$RESP" | jq -r '.postType'); PIN=$(echo "$RESP" | jq -r '.pinned'); TT=$(echo "$RESP" | jq -r '.title')
[ "$CODE" = "201" ] && [ "$PT" = "event" ] && ok "소식 작성 201 (postType=event)" || bad "소식 작성 CODE=$CODE pt=$PT RESP=$(echo $RESP|head -c 120)"
[ "$PIN" = "false" ] && ok "일반 소유자 pinned 요청 무시" || bad "pinned=$PIN"
case "$TT" in *"<b>"*) bad "제목 HTML 태그 미제거: $TT";; *) ok "제목 HTML 새니타이즈";; esac

# 잘못된 postType → general 로 폴백
api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"title\":\"둘째\",\"content\":\"c\",\"postType\":\"weird\"}" "$OWNER_TOKEN"
P2=$(echo "$RESP" | jq -r '.id'); PT2=$(echo "$RESP" | jq -r '.postType')
[ "$CODE" = "201" ] && [ "$PT2" = "general" ] && ok "잘못된 postType → general 폴백" || bad "postType 폴백 CODE=$CODE pt=$PT2"

# 공개 목록 조회 (승인 매장) 2건 + 작성자 개인정보 미노출
api GET "/shop-posts?shopType=skishop&shopId=$SHOP" ""
CNT=$(echo "$RESP" | jq -r '.items | length')
[ "$CODE" = "200" ] && [ "$CNT" = "2" ] && ok "공개 소식 목록 2건" || bad "목록 CODE=$CODE cnt=$CNT"
LEAK=$(echo "$RESP" | jq -r '.items[0].user | (.email // .phone // empty)')
[ -z "$LEAK" ] && ok "소식 작성자 email/phone 미노출" || bad "작성자 개인정보 노출 $LEAK"
NAMELEAK=$(echo "$RESP" | jq -r '.items[0].user.name')
[ "$NAMELEAK" != "소식주인" ] || ok "작성자 표시명 = 닉네임(소식주인)"

# 단건 조회 + 조회수 증가
api GET "/shop-posts/$P1" ""
[ "$CODE" = "200" ] && ok "소식 단건 200" || bad "단건 CODE=$CODE"
sleep 0.3
VC=$(pq "SELECT \"viewCount\" FROM shop_posts WHERE id='$P1'")
[ "$VC" -ge 1 ] && ok "소식 조회수 증가 ($VC)" || bad "조회수=$VC"

# 홈 피드 /recent — 매장당 1개 압축, all=1 이면 2개
api GET "/shop-posts/recent?limit=10" ""
RC=$(echo "$RESP" | jq -r "[.items[] | select(.shopId==\"$SHOP\")] | length")
[ "$RC" = "1" ] && ok "/recent 매장당 최신 1개 압축" || bad "/recent cnt=$RC"
api GET "/shop-posts/recent?limit=10&all=1" ""
RC2=$(echo "$RESP" | jq -r "[.items[] | select(.shopId==\"$SHOP\")] | length")
[ "$RC2" = "2" ] && ok "/recent?all=1 전체 2개" || bad "/recent all cnt=$RC2"
SN=$(echo "$RESP" | jq -r ".items[] | select(.id==\"$P1\") | .shopName")
[ "$SN" = "소식샵" ] && ok "/recent 매장명 해석" || bad "shopName=$SN"

# 하루 5개 제한 → 3,4,5번째 OK, 6번째 429
for i in 3 4 5; do api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"title\":\"소식$i\",\"content\":\"c\"}" "$OWNER_TOKEN"; done
[ "$CODE" = "201" ] && ok "5번째 소식 201" || bad "5번째 CODE=$CODE"
api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"title\":\"소식6\",\"content\":\"c\"}" "$OWNER_TOKEN"
[ "$CODE" = "429" ] && ok "하루 6번째 소식 429" || bad "6번째 CODE=$CODE"

# 타인 수정/삭제 403, 소유자 수정 200, 관리자 pinned 가능
api PUT "/shop-posts/$P1" '{"title":"해킹"}' "$VISITOR_TOKEN"
[ "$CODE" = "403" ] && ok "타인 소식 수정 403" || bad "타인 수정 CODE=$CODE"
api DELETE "/shop-posts/$P1" "" "$VISITOR_TOKEN"
[ "$CODE" = "403" ] && ok "타인 소식 삭제 403" || bad "타인 삭제 CODE=$CODE"
api PUT "/shop-posts/$P1" '{"title":"수정된 이벤트","pinned":true}' "$OWNER_TOKEN"
UT=$(echo "$RESP" | jq -r '.title'); UP=$(echo "$RESP" | jq -r '.pinned')
[ "$CODE" = "200" ] && [ "$UT" = "수정된 이벤트" ] && [ "$UP" = "false" ] && ok "소유자 수정 200 (pinned 여전히 false)" || bad "소유자 수정 CODE=$CODE t=$UT p=$UP"
api PUT "/shop-posts/$P1" '{"pinned":true}' "$ADM_TOKEN"
AP=$(echo "$RESP" | jq -r '.pinned')
[ "$CODE" = "200" ] && [ "$AP" = "true" ] && ok "관리자 pinned=true 200" || bad "관리자 pinned CODE=$CODE p=$AP"
api GET "/shop-posts?shopType=skishop&shopId=$SHOP" ""
FIRST=$(echo "$RESP" | jq -r '.items[0].id')
[ "$FIRST" = "$P1" ] && ok "pinned 소식 목록 최상단" || bad "최상단=$FIRST (기대 $P1)"

# 매장이 재심사(미승인)로 바뀌면: 공개 목록 빈 배열, 단건 404, 소유자/관리자에게는 목록 노출(대시보드)
pq "UPDATE ski_shops SET approved=false WHERE id='$SHOP'" >/dev/null
api GET "/shop-posts?shopType=skishop&shopId=$SHOP" ""
HC=$(echo "$RESP" | jq -r '.items | length')
[ "$HC" = "0" ] && ok "미승인 매장 소식 공개 목록 숨김" || bad "미승인 공개 목록 cnt=$HC"
api GET "/shop-posts/$P1" ""
[ "$CODE" = "404" ] && ok "미승인 매장 소식 단건 404" || bad "미승인 단건 CODE=$CODE"
api GET "/shop-posts?shopType=skishop&shopId=$SHOP" "" "$OWNER_TOKEN"
OC=$(echo "$RESP" | jq -r '.items | length')
[ "$OC" = "5" ] && ok "미승인 매장이어도 소유자 대시보드 목록 5건" || bad "소유자 목록 cnt=$OC"
api GET "/shop-posts?shopType=skishop&shopId=$SHOP" "" "$VISITOR_TOKEN"
VC2=$(echo "$RESP" | jq -r '.items | length')
[ "$VC2" = "0" ] && ok "미승인 매장 소식 타 로그인 유저에게 숨김" || bad "타유저 cnt=$VC2"
api GET "/shop-posts?shopType=skishop&shopId=$SHOP" "" "$ADM_TOKEN"
AC=$(echo "$RESP" | jq -r '.items | length')
[ "$AC" = "5" ] && ok "미승인 매장 소식 관리자 목록 5건" || bad "관리자 cnt=$AC"
api GET "/shop-posts/recent?limit=20&all=1" ""
RC3=$(echo "$RESP" | jq -r "[.items[] | select(.shopId==\"$SHOP\")] | length")
[ "$RC3" = "0" ] && ok "미승인 매장 소식 홈 피드 제외" || bad "/recent 미승인 노출 cnt=$RC3"
pq "UPDATE ski_shops SET approved=true WHERE id='$SHOP'" >/dev/null

# 소유자 삭제 200 → 사라짐
api DELETE "/shop-posts/$P2" "" "$OWNER_TOKEN"
[ "$CODE" = "200" ] && ok "소유자 소식 삭제 200" || bad "삭제 CODE=$CODE"
api GET "/shop-posts/$P2" ""
[ "$CODE" = "404" ] && ok "삭제된 소식 404" || bad "삭제 후 CODE=$CODE"

# ── 매장 리뷰: 소유자 본인 400, 평점 범위 400, 짧은 내용 400, 정상 201, 중복 409, 타인 삭제 403, 본인 삭제 200, 평균 집계
api POST /shop-reviews "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"rating\":5,\"content\":\"내 매장 최고예요\"}" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "본인 매장 리뷰 400" || bad "본인 리뷰 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST /shop-reviews "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"rating\":7,\"content\":\"평점이 이상해요\"}" "$VISITOR_TOKEN"
[ "$CODE" = "400" ] && ok "평점 7 → 400" || bad "평점 CODE=$CODE"
api POST /shop-reviews "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"rating\":4,\"content\":\"짧음\"}" "$VISITOR_TOKEN"
[ "$CODE" = "400" ] && ok "리뷰 5자 미만 400" || bad "짧은 리뷰 CODE=$CODE"
api POST /shop-reviews "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"rating\":4,\"content\":\"친절하고 좋았어요\"}" "$VISITOR_TOKEN"
RV=$(echo "$RESP" | jq -r '.id')
[ "$CODE" = "201" ] && [ -n "$RV" ] && ok "매장 리뷰 작성 201" || bad "리뷰 작성 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST /shop-reviews "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"rating\":1,\"content\":\"두 번째 리뷰 시도\"}" "$VISITOR_TOKEN"
[ "$CODE" = "409" ] && ok "매장 1인 1리뷰 (409)" || bad "중복 리뷰 CODE=$CODE"
api POST /shop-reviews "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"rating\":2,\"content\":\"보통이었습니다\"}" "$CLAIMER_TOKEN"
[ "$CODE" = "201" ] && ok "다른 유저 리뷰 201" || bad "두번째 유저 리뷰 CODE=$CODE"
api GET "/shop-reviews?shopType=skishop&shopId=$SHOP" ""
AVG=$(echo "$RESP" | jq -r '.averageRating'); TC=$(echo "$RESP" | jq -r '.totalCount')
[ "$TC" = "2" ] && [ "$AVG" = "3" ] && ok "리뷰 집계 (2건, 평균 3)" || bad "집계 avg=$AVG total=$TC"
RLEAK=$(echo "$RESP" | jq -r '[.reviews[] | .user? | (.email // .phone // empty)] | length')
[ "$RLEAK" = "0" ] && ok "리뷰 작성자 개인정보 미노출" || bad "리뷰 개인정보 노출"
api DELETE "/shop-reviews/$RV" "" "$CLAIMER_TOKEN"
[ "$CODE" = "403" ] && ok "타인 리뷰 삭제 403" || bad "타인 리뷰 삭제 CODE=$CODE"
api DELETE "/shop-reviews/$RV" "" "$VISITOR_TOKEN"
[ "$CODE" = "200" ] && ok "본인 리뷰 삭제 200" || bad "본인 리뷰 삭제 CODE=$CODE"
# 미승인 매장 리뷰 404
pq "UPDATE ski_shops SET approved=false WHERE id='$SHOP'" >/dev/null
api POST /shop-reviews "{\"shopType\":\"skishop\",\"shopId\":\"$SHOP\",\"rating\":4,\"content\":\"미승인 매장 리뷰\"}" "$VISITOR_TOKEN"
[ "$CODE" = "404" ] && ok "미승인 매장 리뷰 404" || bad "미승인 리뷰 CODE=$CODE"
pq "UPDATE ski_shops SET approved=true WHERE id='$SHOP'" >/dev/null

# ── 소유권 이전(claim): 관리자 등록 매장을 진짜 사장이 가져감
api POST /ski-shops '{"name":"관리자등록샵","area":"곤지암","address":"경기 광주","description":"크롤링 매장","businessLicense":"/uploads/e2e.jpg"}' "$ADM_TOKEN"
CSHOP=$(echo "$RESP" | jq -r '.id')
api PUT "/ski-shops/$CSHOP/approve" "{}" "$ADM_TOKEN"
api POST /shop-claims "{\"shopType\":\"skishop\",\"shopId\":\"$CSHOP\"}" "$CLAIMER_TOKEN"
[ "$CODE" = "400" ] && ok "사업자등록증 없는 claim 400" || bad "claim 필수값 CODE=$CODE"
api POST /shop-claims "{\"shopType\":\"skishop\",\"shopId\":\"$CSHOP\",\"businessLicense\":\"/uploads/e2e.jpg\",\"message\":\"제 매장입니다\"}" "$ADM_TOKEN"
[ "$CODE" = "400" ] && ok "이미 내 매장 claim 400" || bad "내매장 claim CODE=$CODE"
api POST /shop-claims "{\"shopType\":\"skishop\",\"shopId\":\"$CSHOP\",\"businessLicense\":\"/uploads/e2e.jpg\",\"message\":\"제 매장입니다\"}" "$CLAIMER_TOKEN"
CL=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$CL" ] && ok "소유권 이전 요청 201" || bad "claim CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST /shop-claims "{\"shopType\":\"skishop\",\"shopId\":\"$CSHOP\",\"businessLicense\":\"/uploads/e2e.jpg\"}" "$CLAIMER_TOKEN"
[ "$CODE" = "409" ] && ok "중복 claim 409" || bad "중복 claim CODE=$CODE"
api GET /shop-claims/pending "" "$CLAIMER_TOKEN"
[ "$CODE" = "403" ] && ok "일반유저 claim 대기목록 403" || bad "claim pending CODE=$CODE"
api GET /shop-claims/pending "" "$ADM_TOKEN"
PCNT=$(echo "$RESP" | jq -r "[.[]? | select(.id==\"$CL\")] | length")
[ "$CODE" = "200" ] && [ "$PCNT" = "1" ] && ok "관리자 claim 대기목록 노출" || bad "claim 목록 CODE=$CODE cnt=$PCNT"
api PUT "/shop-claims/$CL/approve" "{}" "$CLAIMER_TOKEN"
[ "$CODE" = "403" ] && ok "일반유저 claim 승인 403" || bad "claim 승인 권한 CODE=$CODE"
api PUT "/shop-claims/$CL/approve" "{}" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "관리자 claim 승인 200" || bad "claim 승인 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
NEWOWNER=$(pq "SELECT \"userId\" FROM ski_shops WHERE id='$CSHOP'")
[ "$NEWOWNER" = "$CLAIMER_ID" ] && ok "매장 소유자 이전 완료" || bad "소유자=$NEWOWNER (기대 $CLAIMER_ID)"
api GET /ski-shops/my "" "$CLAIMER_TOKEN"
MINE=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$CSHOP\")] | length")
[ "$MINE" = "1" ] && ok "이전받은 매장 대시보드 /my 노출" || bad "/my cnt=$MINE"
api PUT "/shop-claims/$CL/approve" "{}" "$ADM_TOKEN"
[ "$CODE" = "404" ] && ok "처리된 claim 재승인 404" || bad "재승인 CODE=$CODE"
NC=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$CLAIMER_ID' AND title='매장 소유권 이전 완료'")
[ "$NC" = "1" ] && ok "이전 완료 알림" || bad "이전 알림 수=$NC"
# 새 소유자가 이전받은 매장에 소식 작성 가능
api POST /shop-posts "{\"shopType\":\"skishop\",\"shopId\":\"$CSHOP\",\"title\":\"새 주인 인사\",\"content\":\"안녕하세요\"}" "$CLAIMER_TOKEN"
[ "$CODE" = "201" ] && ok "새 소유자 소식 작성 201" || bad "새 소유자 소식 CODE=$CODE"

# ── 신고: 유효성·셀프신고·정상·관리자 처리
api POST /reports '{"type":"alien","targetId":"x","reason":"r"}' "$VISITOR_TOKEN"
[ "$CODE" = "400" ] && ok "잘못된 신고 유형 400" || bad "신고 유형 CODE=$CODE"
api POST /reports "{\"type\":\"user\",\"targetId\":\"$VISITOR_ID\",\"reason\":\"셀프\"}" "$VISITOR_TOKEN"
[ "$CODE" = "400" ] && ok "셀프 신고 400" || bad "셀프 신고 CODE=$CODE"
api POST /reports "{\"type\":\"user\",\"targetId\":\"00000000-0000-0000-0000-000000000000\",\"reason\":\"없는 유저\"}" "$VISITOR_TOKEN"
[ "$CODE" = "404" ] && ok "없는 대상 신고 404" || bad "없는 대상 CODE=$CODE"
LONG=$(printf 'a%.0s' $(seq 1 120))
api POST /reports "{\"type\":\"skishop\",\"targetId\":\"$SHOP\",\"reason\":\"$LONG\"}" "$VISITOR_TOKEN"
[ "$CODE" = "400" ] && ok "신고 사유 100자 초과 400" || bad "사유 길이 CODE=$CODE"
api POST /reports "{\"type\":\"skishop\",\"targetId\":\"$SHOP\",\"reason\":\"폐업한 것 같아요\",\"description\":\"전화 안 받음\"}" "$VISITOR_TOKEN"
RP=$(echo "$RESP" | jq -r '.id // .report.id // empty')
[ "$CODE" = "201" ] || [ "$CODE" = "200" ] && ok "매장 신고 접수 ($CODE)" || bad "신고 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api GET /admin/reports "" "$VISITOR_TOKEN"
[ "$CODE" = "403" ] && ok "일반유저 신고목록 403" || bad "신고목록 권한 CODE=$CODE"
api GET /admin/reports "" "$ADM_TOKEN"
RCNT=$(echo "$RESP" | jq -r '[(if type=="array" then . else (.items // .shops // .users // .reports // .deals // []) end)[]? | select(.reason=="폐업한 것 같아요")] | length')
[ "$CODE" = "200" ] && [ "$RCNT" = "1" ] && ok "관리자 신고 목록 노출" || bad "신고 목록 CODE=$CODE cnt=$RCNT"
[ -n "$RP" ] || RP=$(pq "SELECT id FROM reports WHERE reason='폐업한 것 같아요' LIMIT 1")
api PUT "/admin/reports/$RP" '{"status":"resolved"}' "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "관리자 신고 처리 200" || bad "신고 처리 CODE=$CODE RESP=$(echo $RESP|head -c 100)"

# ── 저장검색(키워드 알림): 2자 미만 400, 정상 201, 목록, 타인 삭제 404, 본인 삭제 200
api POST /saved-searches '{"keyword":"a"}' "$VISITOR_TOKEN"
[ "$CODE" = "400" ] && ok "키워드 1자 400" || bad "키워드 짧음 CODE=$CODE"
api POST /saved-searches '{"keyword":"살로몬"}' "$VISITOR_TOKEN"
SS=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$SS" ] && ok "키워드 등록 201" || bad "키워드 등록 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api GET /saved-searches "" "$VISITOR_TOKEN"
SC=$(echo "$RESP" | jq -r "[.[]? | select(.id==\"$SS\")] | length")
[ "$SC" = "1" ] && ok "키워드 목록 노출" || bad "키워드 목록 cnt=$SC"
api DELETE "/saved-searches/$SS" "" "$OWNER_TOKEN"
[ "$CODE" = "404" ] && ok "타인 키워드 삭제 404" || bad "타인 키워드 삭제 CODE=$CODE"
api DELETE "/saved-searches/$SS" "" "$VISITOR_TOKEN"
[ "$CODE" = "200" ] && ok "본인 키워드 삭제 200" || bad "키워드 삭제 CODE=$CODE"

echo "----- STEP13: PASS=$PASS FAIL=$FAIL -----"
