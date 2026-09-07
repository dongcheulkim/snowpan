#!/bin/bash
# STEP 14: 전 라우트 스모크 — 공개 GET 200 / 보호 401 / 관리자 403 / 잘못된 입력 400 + 잔여 기능(알림·검색·문의·추천·웹캠·리조트·해외·여행사·광고 공개 API·프로필·뱃지·관리자 통계/유저/배너/가격)
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

echo "===== STEP 14: 전 라우트 스모크 + 잔여 기능 ====="

U_TOKEN=$(register_verified "01066660001" "smoke_user@re.test" "스모크유저" "스모크유저")
U_ID=$(pq "SELECT id FROM users WHERE email='smoke_user@re.test'")
A_TOKEN=$(register_verified "01066660002" "smoke_admin@re.test" "스모크관리자" "스모크관리자")
pq "UPDATE users SET role='admin' WHERE email='smoke_admin@re.test'" >/dev/null
A_TOKEN=$(login "smoke_admin@re.test" 'Re!pass1234')
A_ID=$(pq "SELECT id FROM users WHERE email='smoke_admin@re.test'")
[ -n "$U_TOKEN" ] && [ -n "$A_TOKEN" ] && ok "유저·관리자 준비" || bad "준비 실패"

# ── 공개 GET 전부 200 + JSON
for p in "/products" "/products/market-stats?subcategory=%EC%8A%A4%ED%82%A4" "/rentals" "/lessons" "/accommodations" "/ski-shops" "/repair-shops" "/resorts" "/community" "/community/popular" "/polls" "/banners" "/webcams" "/webcams/weather" "/overseas/resorts" "/overseas/deals" "/agencies" "/ad-booking/slots" "/ad-booking/active" "/ad-booking/deposit-info" "/search?q=%EC%8A%A4%ED%82%A4" "/shop-posts/recent" "/shop-claims/find?q=%EC%8A%A4%ED%82%A4" "/contact/admin-id"; do
  api GET "$p" ""
  if [ "$CODE" = "200" ] && echo "$RESP" | jq -e . >/dev/null 2>&1; then ok "공개 GET $p 200 JSON"; else bad "공개 GET $p CODE=$CODE"; fi
done

# 사이트맵 (루트 마운트)
SM=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H 'X-Loadtest-Key: e2e-local-bypass' "${BASE%/api}/sitemap.xml")
[ "$SM" = "200" ] && ok "sitemap.xml 200" || bad "sitemap CODE=$SM"

# 잘못된 vertical 400 / 잘못된 UUID 400 / 없는 것 404
api GET "/products?vertical=hack" ""; expect 400 "잘못된 vertical"
api GET "/products/not-a-uuid" ""; expect 400 "잘못된 UUID 파라미터"
api GET "/products/11111111-1111-4111-8111-111111111111" ""; expect 404 "없는 매물"
api GET "/products/00000000-0000-0000-0000-000000000000" ""; expect 400 "nil UUID(v4 아님) 거부"
api GET "/community/11111111-1111-4111-8111-111111111111" ""; expect 404 "없는 게시글"
api GET "/webcams/../etc" ""; [ "$CODE" = "400" ] || [ "$CODE" = "404" ] && ok "웹캠 이상 slug 거부 ($CODE)" || bad "웹캠 slug CODE=$CODE"
api GET "/overseas/resorts/no-such-resort" ""; expect 404 "없는 해외 스키장"
api GET "/referral/lookup/!!" ""; expect 400 "추천코드 형식 오류"
api GET "/referral/lookup/ZZZZ9999" ""; expect 404 "없는 추천코드"
api GET "/community?sport=a&sport=b" ""; expect 200 "배열 sport 파라미터 500 방지"
api GET "/products?limit=abc" ""; expect 400 "limit 비정수"
api GET "/products?offset=-1" ""; expect 400 "offset 음수"
api GET "/search?q=a" ""; C=$(echo "$RESP" | jq -r '.products|length'); [ "$CODE" = "200" ] && [ "$C" = "0" ] && ok "검색 1자 → 빈 결과" || bad "검색 1자 CODE=$CODE"
api GET "/community?sport=<script>" ""; expect 200 "sport 이상값 200 (빈 결과)"

# ── 보호 라우트: 토큰 없이 401
for m_p in "GET /auth/profile" "GET /auth/my-badges" "GET /auth/business-status" "GET /auth/my-ad-requests" "GET /notifications" "GET /chat/rooms" "GET /products/wishlist" "GET /saved-searches" "GET /referral/me" "GET /ski-shops/my" "GET /repair-shops/my" "GET /rentals/my" "GET /lessons/my" "GET /accommodations/my" "GET /agencies/my" "GET /ad-booking/my-bookings" "GET /reviews/eligible" "POST /upload" "POST /shop-posts" "POST /shop-reviews" "POST /reports" "POST /shop-claims" "POST /polls" "POST /community" "POST /products/used" "POST /ad-booking/create" "POST /auth/fcm-token" "POST /auth/badge-request" "PUT /notifications/read-all" "DELETE /notifications/all"; do
  set -- $m_p; api "$1" "$2" '{}' ""
  [ "$CODE" = "401" ] && ok "무토큰 $1 $2 401" || bad "무토큰 $1 $2 CODE=$CODE"
done

# 위조 토큰 401 / 만료형식 401
api GET /auth/profile "" "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ4In0.bad"; expect 401 "위조 토큰"
# refresh 토큰을 access 자리에 넣기 — refresh 발급
RF=$(curl -s -c - -H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json' -X POST "$BASE/auth/login" -d '{"email":"smoke_user@re.test","password":"Re!pass1234"}' | grep -i refresh | awk '{print $NF}')
if [ -n "$RF" ]; then api GET /auth/profile "" "$RF"; expect 401 "refresh 토큰을 access 로 사용"; fi

# ── 관리자 라우트: 일반유저 403 (adminRoutes 전역 + 개별 가드)
for m_p in "GET /admin/stats" "GET /admin/users" "GET /admin/reports" "GET /admin/rentals/pending" "GET /admin/lessons/pending" "GET /admin/accommodations/pending" "GET /admin/badges/pending" "GET /admin/ad-requests" "GET /admin/outreach" "POST /admin/outreach/bulk" "GET /ad-booking/admin/bookings" "GET /ad-booking/admin/revenue" "GET /ad-booking/admin/pricings" "POST /ad-booking/admin/pricings" "GET /overseas/admin/resorts" "GET /overseas/admin/deals" "POST /overseas/resorts" "POST /overseas/deals" "GET /agencies/pending" "GET /agencies/subscriptions/pending" "GET /ski-shops/pending" "GET /repair-shops/pending" "GET /shop-claims/pending" "POST /products/new"; do
  set -- $m_p; api "$1" "$2" '{}' "$U_TOKEN"
  [ "$CODE" = "403" ] && ok "일반유저 $1 $2 403" || bad "일반유저 $1 $2 CODE=$CODE"
done
# 관리자 삭제 라우트 — 일반유저 403
api PUT "/admin/users/$A_ID/ban" "{}" "$U_TOKEN"; expect 403 "일반유저 밴 시도"
api DELETE "/admin/users/$A_ID" "" "$U_TOKEN"; expect 403 "일반유저 관리자 삭제 시도"

# ── 관리자 기능: 통계·유저·배너·가격
api GET /admin/stats "" "$A_TOKEN"
CV=$(echo "$RESP" | jq -r '.categoryViews | length'); DB=$(echo "$RESP" | jq -r '.dbSizeBytes')
[ "$CODE" = "200" ] && [ "$CV" = "8" ] && ok "관리자 통계 200 (카테고리 조회수 8종)" || bad "통계 CODE=$CODE cv=$CV"
[ "$DB" != "null" ] && [ "$DB" -gt 0 ] && ok "DB 사용량 bytes 반환 ($DB)" || bad "dbSizeBytes=$DB"
api GET /admin/users "" "$A_TOKEN"
UC=$(echo "$RESP" | jq -r '(if type=="array" then . else (.items // .shops // .users // .reports // .deals // []) end) | length'); [ "$CODE" = "200" ] && [ "$UC" -ge 2 ] && ok "관리자 유저 목록" || bad "유저 목록 CODE=$CODE cnt=$UC"
api PUT "/admin/users/$A_ID/ban" "{}" "$A_TOKEN"; expect 400 "본인 밴 차단"
api PUT "/admin/users/00000000-0000-0000-0000-000000000000/ban" "{}" "$A_TOKEN"; expect 404 "없는 유저 밴"
# 밴 → 대상 토큰 즉시 무효 → 해제
api PUT "/admin/users/$U_ID/ban" "{}" "$A_TOKEN"; expect 200 "유저 밴"
api GET /auth/profile "" "$U_TOKEN"; [ "$CODE" = "401" ] || [ "$CODE" = "403" ] && ok "밴 직후 옛 토큰 거절 ($CODE)" || bad "밴 후 토큰 CODE=$CODE"
LB=$(curl -s -H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json' -X POST "$BASE/auth/login" -d '{"email":"smoke_user@re.test","password":"Re!pass1234"}' -w '\n%{http_code}' | tail -n1)
[ "$LB" = "403" ] && ok "밴 계정 로그인 403" || bad "밴 로그인 CODE=$LB"
api PUT "/admin/users/$U_ID/ban" "{}" "$A_TOKEN"; expect 200 "밴 해제(토글)"
U_TOKEN=$(login "smoke_user@re.test" 'Re!pass1234')
[ -n "$U_TOKEN" ] && ok "해제 후 재로그인" || bad "해제 후 로그인 실패"
# 관리자끼리 밴 불가
api PUT "/admin/users/$A_ID/ban" "{}" "$A_TOKEN"; expect 400 "관리자 계정 밴 차단"


# ── 스키장 소식(community category=news): 관리자 전용, 공용(sport=all)·고정 아님, 리조트 연결, 리조트 필터, 핫 랭킹 제외
RID=$(pq "SELECT id FROM ski_resorts ORDER BY name LIMIT 1")
api POST /community "{\"title\":\"E2E 시즌권 소식\",\"content\":\"9/9 판매 시작\\n59만원대\",\"category\":\"news\",\"sport\":\"ski\",\"resortIds\":\"$RID\"}" "$U_TOKEN"; expect 403 "일반유저 스키장 소식 작성 403"
api POST /community "{\"title\":\"E2E 시즌권 소식\",\"content\":\"9/9 판매 시작\\n59만원대\",\"category\":\"news\",\"sport\":\"ski\",\"resortIds\":\"nope,$RID\"}" "$A_TOKEN"; expect 400 "없는 리조트 id 400"
api POST /community "{\"title\":\"E2E 시즌권 소식\",\"content\":\"9/9 판매 시작\\n59만원대\",\"category\":\"news\",\"sport\":\"ski\",\"resortIds\":\"$RID\"}" "$A_TOKEN"
NP=$(echo "$RESP" | jq -r '.id // empty'); NS=$(echo "$RESP" | jq -r '.sport + ":" + (.pinned|tostring) + ":" + (.resortIds // "null")')
[ "$CODE" = "201" ] && [ "$NS" = "all:false:$RID" ] && ok "관리자 스키장 소식 201 (sport=all, 고정 아님, 리조트 저장)" || bad "소식 작성 CODE=$CODE $NS $(echo $RESP|head -c 100)"
api GET "/community?category=news&resortId=$RID" ""; NC=$(echo "$RESP" | jq -r "[.posts[] | select(.id==\"$NP\")] | length"); [ "$CODE" = "200" ] && [ "$NC" = "1" ] && ok "리조트별 스키장 소식 조회" || bad "리조트 소식 CODE=$CODE n=$NC"
api GET "/community?category=news&resortId=00000000-0000-4000-8000-000000000000" ""; NC2=$(echo "$RESP" | jq -r "[.posts[] | select(.id==\"$NP\")] | length"); [ "$NC2" = "0" ] && ok "다른 리조트 필터에는 안 잡힘" || bad "다른 리조트 n=$NC2"
api GET "/community?sport=board&category=news" ""; NC3=$(echo "$RESP" | jq -r "[.posts[] | select(.id==\"$NP\")] | length"); [ "$NC3" = "1" ] && ok "보드 목록에도 노출(공용)" || bad "보드 노출 n=$NC3"
api GET "/community/popular" ""; NPOP=$(echo "$RESP" | jq -r "[.[]? | select(.category==\"news\")] | length"); [ "$NPOP" = "0" ] && ok "핫 랭킹에서 스키장 소식 제외" || bad "핫 랭킹 news=$NPOP"
api PUT "/community/$NP" '{"resortIds":""}' "$A_TOKEN"; NR=$(echo "$RESP" | jq -r '.resortIds // "null"'); [ "$CODE" = "200" ] && [ "$NR" = "null" ] && ok "리조트 연결 해제" || bad "해제 CODE=$CODE r=$NR"
api PUT "/community/$NP" '{"category":"free"}' "$U_TOKEN"; expect 403 "일반유저가 남의 소식 수정 403"
api DELETE "/community/$NP" "" "$A_TOKEN"; expect 200 "스키장 소식 삭제"

# 광고 가격 관리
api GET /ad-booking/admin/pricings "" "$A_TOKEN"; PR=$(echo "$RESP" | jq -r 'length'); [ "$CODE" = "200" ] && [ "$PR" -ge 10 ] && ok "광고 가격표 목록 ($PR)" || bad "가격표 CODE=$CODE n=$PR"
PID=$(echo "$RESP" | jq -r '.[0].id')
api PUT "/ad-booking/admin/pricings/$PID" '{"pricePerDay":0}' "$A_TOKEN"; expect 400 "가격 0 거부"
api POST /ad-booking/admin/pricings '{"slotType":"premium","pricePerDay":-5}' "$A_TOKEN"; expect 400 "음수 가격 거부"
api GET /ad-booking/availability "" ; expect 400 "availability 파라미터 누락"
api GET "/ad-booking/availability?slotType=main_banner&month=2030-01" ""; expect 200 "availability 정상"
api GET "/ad-booking/availability?slotType=nope&month=2030-01" ""; expect 404 "없는 슬롯 availability"
api GET /ad-booking/admin/revenue "" "$A_TOKEN"; expect 200 "매출 집계"
api GET /ad-booking/my-bookings "" "$U_TOKEN"; expect 200 "내 광고 목록"
api POST /ad-booking/create '{"slotType":"main_banner","title":"x","description":"d","payMethod":"transfer"}' "$U_TOKEN"; expect 400 "광고 신청 periodMonths 누락"

# ── 알림: 읽음/삭제 — 타인 알림 조작 불가
pq "INSERT INTO notifications (id, \"userId\", type, title, message, read, \"createdAt\") VALUES (gen_random_uuid(), '$U_ID', 'system', 'E2E알림', 'm', false, now()), (gen_random_uuid(), '$A_ID', 'system', 'E2E관리자알림', 'm', false, now())" >/dev/null
NID=$(pq "SELECT id FROM notifications WHERE \"userId\"='$U_ID' AND title='E2E알림' LIMIT 1")
ANID=$(pq "SELECT id FROM notifications WHERE \"userId\"='$A_ID' AND title='E2E관리자알림' LIMIT 1")
api GET /notifications "" "$U_TOKEN"; NC=$(echo "$RESP" | jq -r "[(.notifications // .)[]? | select(.id==\"$NID\")] | length"); [ "$NC" = "1" ] && ok "내 알림 목록" || bad "알림 목록 cnt=$NC"
api PUT "/notifications/$ANID/read" "{}" "$U_TOKEN"
AR=$(pq "SELECT read FROM notifications WHERE id='$ANID'"); [ "$AR" = "f" ] && ok "타인 알림 읽음 처리 불가" || bad "타인 알림 read=$AR"
api PUT "/notifications/$NID/read" "{}" "$U_TOKEN"; R=$(pq "SELECT read FROM notifications WHERE id='$NID'"); [ "$R" = "t" ] && ok "내 알림 읽음" || bad "읽음 read=$R"
api DELETE "/notifications/$ANID" "" "$U_TOKEN"; AC=$(pq "SELECT count(*) FROM notifications WHERE id='$ANID'"); [ "$AC" = "1" ] && ok "타인 알림 삭제 불가" || bad "타인 알림 삭제됨"
api PUT /notifications/read-all "{}" "$U_TOKEN"; expect 200 "전체 읽음"
api DELETE /notifications/all "" "$U_TOKEN"; expect 200 "전체 삭제"
MC=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$U_ID'"); [ "$MC" = "0" ] && ok "내 알림 전부 삭제" || bad "남은 알림=$MC"
AC=$(pq "SELECT count(*) FROM notifications WHERE id='$ANID'"); [ "$AC" = "1" ] && ok "전체삭제가 타인 알림 안 건드림" || bad "타인 알림 삭제됨"

# ── 프로필: 닉네임 규칙·중복·외부 이미지·공개 판매자 프로필 개인정보
api PUT /auth/profile '{"nickname":"a"}' "$U_TOKEN"; expect 400 "닉네임 1자"
api PUT /auth/profile '{"nickname":"bad nick!"}' "$U_TOKEN"; expect 400 "닉네임 특수문자"
api PUT /auth/profile '{"nickname":"스모크관리자"}' "$U_TOKEN"; expect 409 "닉네임 중복"
api PUT /auth/profile '{"profileImage":"https://evil.example.com/a.png"}' "$U_TOKEN"; expect 400 "외부 프로필 이미지 거부"
api PUT /auth/profile '{"nickname":"새닉네임"}' "$U_TOKEN"; expect 200 "닉네임 변경"
api GET "/auth/seller/$U_ID" ""
SN=$(echo "$RESP" | jq -r '.name'); SE=$(echo "$RESP" | jq -r '.email // .phone // empty'); KEYS=$(echo "$RESP" | jq -r 'keys | join(",")')
[ "$CODE" = "200" ] && [ "$SN" = "새닉네임" ] && ok "공개 판매자 프로필 닉네임" || bad "판매자 프로필 CODE=$CODE name=$SN"
[ -z "$SE" ] && ok "판매자 프로필 email/phone 없음 (keys: $KEYS)" || bad "판매자 프로필 개인정보 노출 $SE"
api GET "/auth/seller/00000000-0000-0000-0000-000000000000" ""; expect 404 "없는 판매자"
# 닉네임 없는 유저 → '스노우판 회원' 마스킹
pq "UPDATE users SET nickname=NULL WHERE id='$U_ID'" >/dev/null
api GET "/auth/seller/$U_ID" ""; SN=$(echo "$RESP" | jq -r '.name'); [ "$SN" = "스노우판 회원" ] && ok "닉네임 없으면 실명 대신 '스노우판 회원'" || bad "실명 노출? name=$SN"
pq "UPDATE users SET nickname='새닉네임' WHERE id='$U_ID'" >/dev/null

# ── 뱃지 요청: 중복 대기 400, 외부 이미지 → 관리자 대기목록 → 승인
api POST /auth/badge-request '{}' "$U_TOKEN"; expect 400 "뱃지 종류 누락"
api POST /auth/badge-request '{"badgeType":"instructor","image":"/uploads/e2e.jpg"}' "$U_TOKEN"; BQ=$(echo "$RESP" | jq -r '.id // .badge.id // empty'); [ "$CODE" = "201" ] || [ "$CODE" = "200" ] && ok "뱃지 요청 ($CODE)" || bad "뱃지 요청 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST /auth/badge-request '{"badgeType":"instructor"}' "$U_TOKEN"; expect 400 "중복 대기 뱃지 요청"
[ -n "$BQ" ] || BQ=$(pq "SELECT id FROM badge_requests WHERE \"userId\"='$U_ID' ORDER BY \"createdAt\" DESC LIMIT 1")
api GET /admin/badges/pending "" "$A_TOKEN"; BP=$(echo "$RESP" | jq -r "[.[]? | select(.id==\"$BQ\")] | length"); [ "$BP" = "1" ] && ok "관리자 뱃지 대기목록" || bad "뱃지 대기 cnt=$BP"
api PUT "/admin/badges/$BQ/approve" "{}" "$A_TOKEN"; expect 200 "뱃지 승인"
api GET /auth/my-badges "" "$U_TOKEN"; MB=$(echo "$RESP" | jq -r '[.[]? | select(.status=="approved")] | length'); [ "$MB" = "1" ] && ok "내 승인 뱃지 1" || bad "내 뱃지 cnt=$MB"
api GET "/auth/seller/$U_ID" ""; SB=$(echo "$RESP" | jq -r '.badges | length'); [ "$SB" = "1" ] && ok "공개 프로필 뱃지 노출" || bad "프로필 뱃지 cnt=$SB"

# ── FCM 토큰: 형식 검증 + 저장 + 다른 계정에 같은 토큰 이전
api POST /auth/fcm-token '{"fcmToken":123}' "$U_TOKEN"; expect 400 "fcmToken 비문자열"
api POST /auth/fcm-token '{"fcmToken":"tok-e2e-abc"}' "$U_TOKEN"; expect 200 "fcmToken 저장"
api POST /auth/fcm-token '{"fcmToken":"tok-e2e-abc"}' "$A_TOKEN"; expect 200 "같은 기기 다른 계정 로그인"
OLD=$(pq "SELECT \"fcmToken\" FROM users WHERE id='$U_ID'"); [ -z "$OLD" ] && ok "이전 계정 fcmToken 해제 (기기 1개=계정 1개)" || bad "이전 계정 토큰 잔존=$OLD"
api POST /auth/fcm-token '{"fcmToken":null}' "$A_TOKEN"; expect 200 "fcmToken 해제(null)"

# ── 추천인: 코드 발급·조회·본인 코드 적용 차단·정상 적용
api GET /referral/me "" "$U_TOKEN"; RCODE=$(echo "$RESP" | jq -r '.code'); [ "$CODE" = "200" ] && [ -n "$RCODE" ] && ok "추천 코드 발급 ($RCODE)" || bad "추천코드 CODE=$CODE"
api GET "/referral/lookup/$RCODE" ""; RN=$(echo "$RESP" | jq -r '.referrerName'); RE=$(echo "$RESP" | jq -r '.email // empty'); [ "$CODE" = "200" ] && [ -z "$RE" ] && ok "추천코드 조회 (표시명 $RN, 개인정보 없음)" || bad "추천 조회 CODE=$CODE"
api POST /auth/apply-referral "{\"code\":\"$RCODE\"}" "$U_TOKEN"; [ "$CODE" = "400" ] || [ "$CODE" = "409" ] && ok "본인 코드 적용 차단 ($CODE)" || bad "본인 코드 CODE=$CODE"
N_TOKEN=$(register_verified "01066660003" "smoke_new@re.test" "신규" "신규추천")
api POST /auth/apply-referral "{\"code\":\"$RCODE\"}" "$N_TOKEN"; [ "$CODE" = "200" ] || [ "$CODE" = "201" ] && ok "신규 유저 추천코드 적용 ($CODE)" || bad "추천 적용 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST /auth/apply-referral "{\"code\":\"$RCODE\"}" "$N_TOKEN"; [ "$CODE" = "400" ] || [ "$CODE" = "409" ] && ok "추천코드 재적용 차단 ($CODE)" || bad "재적용 CODE=$CODE"

# ── 문의·사전등록: 유효성
api POST /contact '{"name":"","email":"a@b.c","content":"x"}' ""; expect 400 "문의 이름 누락"
api POST /contact '{"name":"홍길동","email":"a@b.c","content":"문의합니다","category":"general"}' ""; expect 200 "문의 접수"
NA=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$A_ID' AND title LIKE '새 문의%'"); [ "$NA" -ge 1 ] && ok "문의 → 관리자 알림" || bad "문의 알림=$NA"
api POST /pre-register '{"email":"not-an-email","sport":"ski"}' ""; expect 400 "사전등록 이메일 형식"
api POST /pre-register '{"email":"pre@re.test","sport":"ski"}' ""; expect 400 "사전등록 종목 오류 (snow 는 사전등록 대상 아님)"
api POST /pre-register '{"email":"pre@re.test","sport":"golf","name":"홍"}' ""; [ "$CODE" = "200" ] || [ "$CODE" = "201" ] && ok "사전등록 ($CODE)" || bad "사전등록 CODE=$CODE RESP=$(echo $RESP|head -c 100)"

# ── 리조트: 상세·랜딩
RID=$(echo "$YONGPYONG")
api GET "/resorts/$RID" ""; expect 200 "리조트 상세"
api GET "/resorts/landing/용평" ""; expect 200 "리조트 랜딩(용평)"
api GET "/resorts/landing/없는리조트" ""; RN=$(echo "$RESP" | jq -r '.resort'); [ "$CODE" = "200" ] && [ "$RN" = "null" ] && ok "없는 리조트 랜딩 200 + resort=null (빈 랜딩 설계)" || bad "없는 리조트 랜딩 CODE=$CODE resort=$RN"

# ── 해외: 관리자 CRUD + 공개 노출 + 딜 클릭
api POST /overseas/resorts '{"slug":"e2e-niseko","name":"E2E니세코","country":"일본"}' "$A_TOKEN"; expect 400 "해외 스키장 본문 누락"
api POST /overseas/resorts '{"slug":"e2e-niseko","name":"E2E니세코","country":"일본","description":"파우더","published":true}' "$A_TOKEN"
ORID=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] || [ "$CODE" = "200" ] && [ -n "$ORID" ] && ok "해외 스키장 생성 ($CODE)" || bad "해외 생성 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST /overseas/resorts '{"slug":"e2e-niseko","name":"중복","country":"일본","description":"d"}' "$A_TOKEN"; expect 409 "해외 slug 중복"
api GET /overseas/resorts/e2e-niseko ""; expect 200 "해외 스키장 공개 상세"
api POST /overseas/deals '{"title":"딜","link":"ftp://x"}' "$A_TOKEN"; expect 400 "딜 링크 형식"
api POST /overseas/deals "{\"title\":\"E2E딜\",\"link\":\"https://example.com/deal\",\"resortId\":\"$ORID\",\"active\":true}" "$A_TOKEN"
ODID=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] || [ "$CODE" = "200" ] && [ -n "$ODID" ] && ok "해외 딜 생성 ($CODE)" || bad "딜 생성 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST "/overseas/deals/$ODID/click" "{}" ""; expect 200 "딜 클릭 추적"
api POST "/overseas/deals/$ODID/click" "{}" ""; expect 200 "딜 클릭 중복(dedup) 200"
CC=$(pq "SELECT \"clickCount\" FROM overseas_deals WHERE id='$ODID'"); [ "$CC" = "1" ] && ok "딜 클릭 dedup (count=1)" || bad "딜 clickCount=$CC"
api PUT "/overseas/deals/$ODID" '{"active":false}' "$A_TOKEN"; expect 200 "딜 비활성"
api POST "/overseas/deals/$ODID/click" "{}" ""; CC2=$(pq "SELECT \"clickCount\" FROM overseas_deals WHERE id='$ODID'"); [ "$CC2" = "1" ] && ok "비활성 딜 클릭 미집계" || bad "비활성 클릭 count=$CC2"
api DELETE "/overseas/deals/$ODID" "" "$A_TOKEN"; expect 200 "딜 삭제"
api DELETE "/overseas/resorts/$ORID" "" "$A_TOKEN"; expect 200 "해외 스키장 삭제"

# ── 여행사: 등록 → 미승인 딜 등록 403 → 승인 → 딜 CRUD → 타인 403 → 공개 노출
api POST /agencies '{"name":"E2E여행사","website":"notaurl","businessLicense":"/uploads/e2e.jpg"}' "$U_TOKEN"; expect 400 "여행사 예약 링크 형식"
api POST /agencies '{"name":"E2E여행사","website":"https://agency.example.com","businessLicense":"/uploads/e2e.jpg","countries":"일본"}' "$U_TOKEN"
AG=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && [ -n "$AG" ] && ok "여행사 등록 201" || bad "여행사 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api GET /agencies ""; AL=$(echo "$RESP" | jq -r "[(if type==\"array\" then . else (.items // .shops // .users // .reports // .deals // []) end)[]? | select(.id==\"$AG\")] | length"); [ "$AL" = "0" ] && ok "미승인 여행사 공개 목록 비노출" || bad "미승인 여행사 노출"
api POST "/agencies/$AG/deals" '{"title":"딜","link":"https://example.com"}' "$U_TOKEN"; expect 403 "미승인 여행사 딜 등록 403"
api GET /agencies/my "" "$U_TOKEN"; AM=$(echo "$RESP" | jq -r "[.[]? | select(.id==\"$AG\")] | length"); [ "$AM" = "1" ] && ok "내 여행사 목록" || bad "내 여행사 cnt=$AM"
api PUT "/agencies/$AG/approve" "{}" "$U_TOKEN"; expect 403 "일반유저 여행사 승인 403"
api PUT "/agencies/$AG/approve" "{}" "$A_TOKEN"; expect 200 "관리자 여행사 승인"
api POST "/agencies/$AG/deals" '{"title":"니세코 4박","link":"https://example.com/d"}' "$U_TOKEN"; DL=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && [ -n "$DL" ] && ok "여행사 딜 등록 201" || bad "딜 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST "/agencies/$AG/deals" '{"title":"타인","link":"https://example.com/x"}' "$N_TOKEN"; expect 403 "타인 여행사 딜 등록 403"
api PUT "/agencies/$AG/deals/$DL" '{"title":"수정딜"}' "$N_TOKEN"; expect 403 "타인 딜 수정 403"
api PUT "/agencies/$AG/deals/$DL" '{"title":"수정딜"}' "$U_TOKEN"; expect 200 "딜 수정"
api GET "/agencies/$AG" ""; expect 200 "여행사 공개 상세"
api GET /overseas/deals ""; OD=$(echo "$RESP" | jq -r "[(if type==\"array\" then . else (.items // .shops // .users // .reports // .deals // []) end)[]? | select(.id==\"$DL\")] | length"); [ "$OD" = "1" ] && ok "여행사 딜 해외 딜 피드 노출" || bad "딜 피드 cnt=$OD"
api PUT "/agencies/$AG" '{"name":"해킹"}' "$N_TOKEN"; expect 403 "타인 여행사 수정 403"
api DELETE "/agencies/$AG/deals/$DL" "" "$U_TOKEN"; expect 200 "딜 삭제"
api DELETE "/agencies/$AG" "" "$N_TOKEN"; expect 403 "타인 여행사 삭제 403"
api DELETE "/agencies/$AG" "" "$U_TOKEN"; expect 200 "여행사 삭제"

# ── 매물 끌어올리기·본인찜·시장통계
api POST /products/used '{"name":"E2E스키","brand":"살로몬","price":300000,"size":"170","subcategory":"스키","image":"/uploads/e2e.jpg","condition":"상급","description":"테스트"}' "$U_TOKEN"
PD=$(echo "$RESP" | jq -r '.id // empty'); [ "$CODE" = "201" ] && ok "매물 등록" || bad "매물 등록 CODE=$CODE"
api POST "/products/$PD/wishlist" "{}" "$U_TOKEN"; expect 400 "본인 매물 찜 차단"
api PUT "/products/$PD/bump" "{}" "$N_TOKEN"; expect 403 "타인 매물 끌올 403"
api PUT "/products/$PD/bump" "{}" "$U_TOKEN"; expect 429 "등록 직후 끌올 24h 제한"
api GET "/products/market-stats?subcategory=%EC%8A%A4%ED%82%A4" ""; expect 200 "시장 통계"
api GET "/products/market-stats" ""; expect 400 "시장 통계 subcategory 누락"
api DELETE "/products/$PD" "" "$N_TOKEN"; expect 403 "타인 매물 삭제 403"
api POST /products/new '{"name":"신제품","price":1000}' "$U_TOKEN"; expect 403 "일반유저 새 장비 등록 403"

# ── 로그아웃/리프레시
LR=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H 'X-Loadtest-Key: e2e-local-bypass' -X POST "$BASE/auth/logout"); [ "$LR" = "200" ] && ok "로그아웃 200" || bad "로그아웃 CODE=$LR"
RR=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json' -X POST "$BASE/auth/refresh" -d '{}'); [ "$RR" = "401" ] && ok "쿠키 없는 refresh 401" || bad "refresh CODE=$RR"

# ── 업로드: 잘못된 파일(텍스트) 거부 — 키 없는 환경이라도 400/415/500 중 하나로 안전 실패, 200 아니어야
UPC=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -H 'X-Loadtest-Key: e2e-local-bypass' -H "Authorization: Bearer $U_TOKEN" -F "images=@/etc/hosts;type=text/plain" "$BASE/upload")
[ "$UPC" != "200" ] && [ "$UPC" != "201" ] && ok "텍스트 파일 업로드 거부 ($UPC)" || bad "텍스트 업로드 통과 CODE=$UPC"

# ── 404 fallback JSON
api GET /no-such-route ""; expect 404 "없는 API 경로 404"

# ── 위치 모델: 리조트 연결(resortId) + '외'(none) 필터 — 스키샵·정비샵·렌탈 공통
api POST /ski-shops "{\"name\":\"리조트스키샵\",\"area\":\"강원\",\"address\":\"강원 평창군 대관령면 올림픽로 1\",\"description\":\"d\",\"businessLicense\":\"/uploads/e2e.jpg\",\"resortId\":\"$YONGPYONG\"}" "$U_TOKEN"
RS=$(echo "$RESP" | jq -r '.id // empty'); RN=$(echo "$RESP" | jq -r '.resortId'); [ "$CODE" = "201" ] && [ "$RN" = "$YONGPYONG" ] && ok "스키샵 리조트 연결 등록" || bad "스키샵 resortId CODE=$CODE rid=$RN RESP=$(echo $RESP|head -c 100)"
api POST /ski-shops '{"name":"x","area":"강원","address":"평창","description":"d","businessLicense":"/uploads/e2e.jpg","resortId":"11111111-1111-4111-8111-111111111111"}' "$U_TOKEN"; expect 400 "없는 리조트 id 400"
pq "UPDATE ski_shops SET approved=true WHERE id='$RS'" >/dev/null
api GET "/ski-shops?resortId=$YONGPYONG" ""; C1=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$RS\")] | length"); N1=$(echo "$RESP" | jq -r ".[] | select(.id==\"$RS\") | .resort.name"); [ "$C1" = "1" ] && [ -n "$N1" ] && ok "리조트 필터 + resort.name 응답 ($N1)" || bad "리조트 필터 cnt=$C1 name=$N1"
api GET "/ski-shops?resortId=none" ""; C2=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$RS\")] | length"); [ "$CODE" = "200" ] && [ "$C2" = "0" ] && ok "'외'(none) 필터에 리조트 매장 미포함" || bad "none 필터 CODE=$CODE cnt=$C2"
api GET "/repair-shops?resortId=none" ""; expect 200 "정비샵 none 필터"
api GET "/rentals?area=%EA%B0%95%EC%9B%90&resortId=none" ""; expect 200 "렌탈 area+none 필터"
api POST /repair-shops "{\"name\":\"리조트정비\",\"area\":\"강원\",\"address\":\"평창\",\"description\":\"d\",\"businessLicense\":\"/uploads/e2e.jpg\",\"resortId\":\"$YONGPYONG\"}" "$U_TOKEN"; RR=$(echo "$RESP" | jq -r '.resortId'); [ "$CODE" = "201" ] && [ "$RR" = "$YONGPYONG" ] && ok "정비샵 리조트 연결 등록" || bad "정비샵 resortId CODE=$CODE rid=$RR"
api GET "/resorts/landing/%EC%9A%A9%ED%8F%89" ""; LS=$(echo "$RESP" | jq -r "[.skiShops[]? | select(.id==\"$RS\")] | length"); [ "$LS" = "1" ] && ok "리조트 랜딩에 연결 스키샵 노출" || bad "랜딩 skiShops cnt=$LS CODE=$CODE"

# ── 좌표(lat/lng) 필드 + 관리자 일괄 지오코딩 (로컬은 카카오 키 없음 → configured=false)
api GET "/ski-shops/$RS" ""; HL=$(echo "$RESP" | jq -r 'has("lat") and has("lng")'); [ "$CODE" = "200" ] && [ "$HL" = "true" ] && ok "스키샵 응답에 lat/lng 필드" || bad "lat/lng 필드 CODE=$CODE has=$HL"
api POST /admin/geocode-backfill "{}" "$U_TOKEN"; expect 403 "일반유저 지오코딩 백필 403"
api POST /admin/geocode-backfill "{}" "$A_TOKEN"; GC=$(echo "$RESP" | jq -r '.configured'); [ "$CODE" = "200" ] && [ "$GC" = "false" ] && ok "관리자 백필 200 (키 없음 → configured=false)" || bad "백필 CODE=$CODE configured=$GC"

# ── 새니타이즈: & ' " 는 원문 그대로 저장(엔티티 X), 태그·엔티티 위장 태그는 제거
api POST /repair-shops '{"name":"비비드왁스 & 풋풋 \"용평\"","area":"강원","address":"평창","description":"엣지 & 왁싱 <b>전문</b> &lt;script&gt;alert(1)&lt;/script&gt;","businessLicense":"/uploads/e2e.jpg"}' "$U_TOKEN"
SN=$(echo "$RESP" | jq -r '.name'); SD=$(echo "$RESP" | jq -r '.description')
[ "$CODE" = "201" ] && [ "$SN" = '비비드왁스 & 풋풋 "용평"' ] && ok "상호의 & 와 따옴표 원문 저장" || bad "새니타이즈 CODE=$CODE name=$SN"
case "$SD" in *"<"*|*"&lt;"*|*"&amp;"*) bad "설명에 태그/엔티티 잔존: $SD";; *"엣지 & 왁싱 전문"*) ok "설명 태그 제거 + & 원문 유지 ($SD)";; *) bad "설명 결과 예상밖: $SD";; esac

# ── 겸업 칩: 렌탈샵이 extraKinds=repair 면 정비샵 목록에도 노출(kind=rental), 본인 업종·잘못된 값은 버림
api POST /rentals '{"name":"겸업렌탈","area":"강원","businessLicense":"/uploads/e2e.jpg","extraKinds":["repair"]}' "$U_TOKEN"; expect 400 "사장님 겸업 추가 — 증빙 없으면 400"
api POST /rentals '{"name":"겸업렌탈","area":"강원","businessLicense":"/uploads/e2e.jpg","extraKinds":["repair","rental","bogus"],"extraKindsProof":"https://www.instagram.com/p/abc"}' "$U_TOKEN"
XR=$(echo "$RESP" | jq -r '.id // empty'); XK=$(echo "$RESP" | jq -r '.extraKinds'); [ "$CODE" = "201" ] && [ "$XK" = "repair" ] && ok "겸업 저장 (증빙 링크, 본인 업종·잘못된 값 제거 → repair)" || bad "겸업 CODE=$CODE extraKinds=$XK RESP=$(echo $RESP|head -c 100)"
XP=$(echo "$RESP" | jq -r '.extraKindsProof // "none"'); api GET "/rentals/$XR" "" "$A_TOKEN"; PUBP=$(echo "$RESP" | jq -r 'has("extraKindsProof")'); [ "$PUBP" = "false" ] && ok "증빙은 공개 상세에 비노출" || bad "증빙 공개 노출 has=$PUBP"
pq "UPDATE rentals SET approved=true WHERE id='$XR'" >/dev/null
api GET /repair-shops ""; XC=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$XR\")] | length"); XKIND=$(echo "$RESP" | jq -r ".[] | select(.id==\"$XR\") | .kind"); XKS=$(echo "$RESP" | jq -c ".[] | select(.id==\"$XR\") | .kinds"); [ "$XC" = "1" ] && [ "$XKIND" = "rental" ] && ok "정비샵 목록에 겸업 렌탈 노출 (kind=rental, kinds=$XKS)" || bad "겸업 노출 cnt=$XC kind=$XKIND"
api GET /ski-shops ""; XS=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$XR\")] | length"); [ "$XS" = "0" ] && ok "선택 안 한 업종(스키샵) 목록엔 미노출" || bad "스키샵 목록 노출 cnt=$XS"
api GET "/rentals?limit=100" ""; XT=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$XR\")] | length"); [ "$XT" = "1" ] && ok "본 업종 렌탈 목록 정상 노출" || bad "렌탈 목록 cnt=$XT"
api PUT "/rentals/$XR" '{"extraKinds":["repair","skishop"]}' "$U_TOKEN"; expect 400 "겸업 추가(판매) 증빙 없으면 400"
api PUT "/rentals/$XR" '{"extraKinds":["repair","skishop"],"extraKindsProof":"/uploads/e2e.jpg"}' "$U_TOKEN"; XK3=$(echo "$RESP" | jq -r '.extraKinds'); [ "$CODE" = "200" ] && [ "$XK3" = "repair,skishop" ] && ok "겸업 추가 + 사진 증빙 200 (재심사)" || bad "겸업 추가 CODE=$CODE extraKinds=$XK3"
pq "UPDATE rentals SET approved=true WHERE id='$XR'" >/dev/null
api PUT "/rentals/$XR" '{"extraKinds":[]}' "$U_TOKEN"; XK2=$(echo "$RESP" | jq -r '.extraKinds'); XA=$(pq "SELECT approved FROM rentals WHERE id='$XR'"); [ "$CODE" = "200" ] && [ "$XK2" = "null" ] && [ "$XA" = "t" ] && ok "겸업 해제는 증빙 없이 + 재심사 없이 (approved 유지)" || bad "겸업 해제 CODE=$CODE extraKinds=$XK2 approved=$XA"
api PUT "/rentals/$XR" '{"extraKinds":["skishop"]}' "$A_TOKEN"; XK4=$(echo "$RESP" | jq -r '.extraKinds'); [ "$CODE" = "200" ] && [ "$XK4" = "skishop" ] && ok "관리자는 증빙 없이 겸업 지정" || bad "관리자 겸업 CODE=$CODE extraKinds=$XK4"

# ── 리조트 좌표·자동 연결 관리자 API (로컬은 카카오 키 없음)
api POST /admin/resorts/geocode "{}" "$U_TOKEN"; expect 403 "일반유저 리조트 좌표 403"
api POST /admin/shops/auto-resort '{"dryRun":true}' "$U_TOKEN"; expect 403 "일반유저 자동연결 403"
api POST /admin/shops/auto-resort '{"dryRun":true}' "$A_TOKEN"; AR=$(echo "$RESP" | jq -r '.dryRun'); [ "$CODE" = "200" ] && [ "$AR" = "true" ] && ok "관리자 자동연결 dryRun 200" || bad "자동연결 CODE=$CODE $RESP"
# 리조트 좌표를 직접 넣고 반경 내 매장이 자동 연결되는지 (좌표는 pq 로 주입)
pq "UPDATE ski_resorts SET lat=37.6435, lng=128.6786 WHERE id='$YONGPYONG'" >/dev/null
pq "UPDATE ski_shops SET lat=37.6500, lng=128.6900, \"resortId\"=NULL WHERE id='$RS'" >/dev/null
api POST /admin/shops/auto-resort "{}" "$A_TOKEN"; LK=$(echo "$RESP" | jq -r "[.plan[] | select(.id==\"$RS\")] | length"); NR=$(pq "SELECT \"resortId\" FROM ski_shops WHERE id='$RS'"); [ "$CODE" = "200" ] && [ "$LK" = "1" ] && [ "$NR" = "$YONGPYONG" ] && ok "반경 내 매장 리조트 자동 연결 (용평)" || bad "자동연결 CODE=$CODE linked=$LK resortId=$NR"
pq "UPDATE ski_shops SET lat=37.5665, lng=126.9780, \"resortId\"=NULL WHERE id='$RS'" >/dev/null
api POST /admin/shops/auto-resort "{}" "$A_TOKEN"; NR2=$(pq "SELECT COALESCE(\"resortId\",'') FROM ski_shops WHERE id='$RS'"); [ -z "$NR2" ] && ok "반경 밖(서울) 매장은 미연결 유지" || bad "서울 매장 연결됨 resortId=$NR2"

echo "----- STEP14: PASS=$PASS FAIL=$FAIL -----"
