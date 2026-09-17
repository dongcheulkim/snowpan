#!/bin/bash
# STEP 17: 렌탈 가격표(priceSkiSet 등 → priceFrom 서버 계산)·구조화 영업시간(openTime/closeTime/closedDays)·가격 낮은 순 정렬(?sort=price)
#          + 스키샵·정비샵 영업시간 라운드트립 + 관리자 시딩 매장은 새 필드 null 유지
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

echo "===== STEP 17: 렌탈 가격표·영업시간·정렬 ====="

OWNER_TOKEN=$(register_verified "01099970001" "rent_owner@s17.test" "렌탈주인" "렌탈주인")
USER_TOKEN=$(register_verified "01099970002" "rent_user@s17.test" "렌탈손님" "렌탈손님")
ADM_TOKEN=$(register_verified "01099970003" "rent_admin@s17.test" "렌탈관리자" "렌탈관리자")
pq "UPDATE users SET role='admin' WHERE email='rent_admin@s17.test'" >/dev/null
ADM_TOKEN=$(login "rent_admin@s17.test" 'Re!pass1234')
[ -n "$OWNER_TOKEN" ] && [ -n "$USER_TOKEN" ] && [ -n "$ADM_TOKEN" ] && ok "유저 3명 준비" || bad "유저 준비 실패"

AREA_Q="%EC%9A%A9%ED%8F%89"   # '용평' URL 인코딩

# ── 렌탈 A 등록: 가격표 + 영업시간 → priceFrom = min(스키, 보드)
api POST /rentals '{"name":"S17렌탈A","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000,"priceBoardSet":35000,"priceHelmet":5000,"priceNote":"시즌권 소지자 20% 할인","openTime":"09:00","closeTime":"20:00","closedDays":"mon"}' "$OWNER_TOKEN"
RA=$(echo "$RESP" | jq -r '.id'); PF=$(echo "$RESP" | jq -r '.priceFrom')
[ "$CODE" = "201" ] && [ -n "$RA" ] && [ "$RA" != "null" ] && ok "렌탈A 등록 201" || bad "렌탈A 등록 CODE=$CODE RESP=$(echo $RESP|head -c 160)"
[ "$PF" = "30000" ] && ok "priceFrom = min(스키 30000, 보드 35000) = 30000" || bad "priceFrom=$PF"

# 스키 지우고 보드만 28000 → priceFrom 28000 (부분 수정: 기존값과 합쳐 재계산)
api PUT "/rentals/$RA" '{"priceSkiSet":null,"priceBoardSet":28000}' "$OWNER_TOKEN"
PF=$(echo "$RESP" | jq -r '.priceFrom'); SK=$(echo "$RESP" | jq -r '.priceSkiSet')
[ "$CODE" = "200" ] && [ "$PF" = "28000" ] && [ "$SK" = "null" ] && ok "스키 null + 보드 28000 → priceFrom 28000" || bad "부분 수정 CODE=$CODE priceFrom=$PF ski=$SK"
# 세트가 아닌 항목(헬멧)만 바꾸면 priceFrom 그대로
api PUT "/rentals/$RA" '{"priceHelmet":7000}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.priceFrom')" = "28000" ] && [ "$(echo "$RESP" | jq -r '.priceHelmet')" = "7000" ] && ok "헬멧만 수정 → priceFrom 28000 유지" || bad "헬멧 수정 CODE=$CODE RESP=$(echo $RESP|head -c 120)"

# ── 가격 검증 (400)
api PUT "/rentals/$RA" '{"priceSkiSet":-1}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "가격 -1 → 400" || bad "가격 -1 CODE=$CODE"
api PUT "/rentals/$RA" '{"priceSkiSet":"abc"}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "가격 abc → 400" || bad "가격 abc CODE=$CODE"
api PUT "/rentals/$RA" '{"priceSkiSet":10000001}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "가격 1천만원 초과 → 400" || bad "가격 초과 CODE=$CODE"
api PUT "/rentals/$RA" '{"priceSkiSet":1.5}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "가격 소수 → 400" || bad "가격 소수 CODE=$CODE"
api POST /rentals '{"name":"S17렌탈X","area":"용평","businessLicense":"/uploads/e2e.jpg","priceBoardSet":"abc"}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "등록 시 가격 abc → 400" || bad "등록 가격 abc CODE=$CODE"
# 문자열 숫자는 허용
api PUT "/rentals/$RA" '{"priceGoggles":"3000"}' "$OWNER_TOKEN"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.priceGoggles')" = "3000" ] && ok "가격 문자열 '3000' 허용" || bad "가격 문자열 CODE=$CODE"

# ── 영업시간 검증
api PUT "/rentals/$RA" '{"openTime":"9am"}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "openTime 9am → 400" || bad "openTime 9am CODE=$CODE"
api PUT "/rentals/$RA" '{"closeTime":"25:00"}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "closeTime 25:00 → 400" || bad "closeTime 25:00 CODE=$CODE"
api PUT "/rentals/$RA" '{"closedDays":"xyz"}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "closedDays xyz → 400" || bad "closedDays xyz CODE=$CODE"
api PUT "/rentals/$RA" '{"closedDays":["sun","mon","mon"]}' "$OWNER_TOKEN"; CD=$(echo "$RESP" | jq -r '.closedDays')
[ "$CODE" = "200" ] && [ "$CD" = "mon,sun" ] && ok "closedDays 배열 → 중복 제거·월→일 순 'mon,sun'" || bad "closedDays 배열 CODE=$CODE cd=$CD"
api PUT "/rentals/$RA" '{"closedDays":"mon","closeTime":"24:00"}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.closeTime')" = "24:00" ] && ok "closeTime 24:00 허용" || bad "closeTime 24:00 CODE=$CODE"
api PUT "/rentals/$RA" '{"closeTime":"20:00"}' "$OWNER_TOKEN"; [ "$CODE" = "200" ] && ok "closeTime 20:00 복구" || bad "closeTime 복구 CODE=$CODE"

# 타인 수정 403
api PUT "/rentals/$RA" '{"priceSkiSet":1000}' "$USER_TOKEN"; [ "$CODE" = "403" ] && ok "타인 가격 수정 403" || bad "타인 수정 CODE=$CODE"

# ── 상세(소유자, 미승인) — 영업시간·가격표 노출, 비공개 서류는 계속 숨김
api GET "/rentals/$RA" "" "$OWNER_TOKEN"
OT=$(echo "$RESP" | jq -r '.openTime'); CT=$(echo "$RESP" | jq -r '.closeTime'); CD=$(echo "$RESP" | jq -r '.closedDays'); PN=$(echo "$RESP" | jq -r '.priceNote'); PB=$(echo "$RESP" | jq -r '.priceBoardSet')
[ "$CODE" = "200" ] && [ "$OT" = "09:00" ] && [ "$CT" = "20:00" ] && [ "$CD" = "mon" ] && ok "상세 openTime 09:00 / closeTime 20:00 / closedDays mon" || bad "상세 영업시간 CODE=$CODE $OT $CT $CD"
[ "$PN" = "시즌권 소지자 20% 할인" ] && [ "$PB" = "28000" ] && ok "상세 priceNote·priceBoardSet 노출" || bad "상세 가격 pn=$PN pb=$PB"
BL=$(echo "$RESP" | jq -r '.businessLicense // "absent"'); [ "$BL" = "absent" ] && ok "상세에 businessLicense 비노출 유지" || bad "businessLicense 노출: $BL"

# ── 렌탈 B (더 싼 20000) + 둘 다 승인 → ?sort=price 순서
api POST /rentals '{"name":"S17렌탈B","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":20000}' "$OWNER_TOKEN"
RB=$(echo "$RESP" | jq -r '.id'); [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.priceFrom')" = "20000" ] && ok "렌탈B 등록 priceFrom 20000" || bad "렌탈B CODE=$CODE"
api PUT "/admin/rentals/$RA/approve" "{}" "$ADM_TOKEN"; [ "$CODE" = "200" ] && ok "렌탈A 승인" || bad "렌탈A 승인 CODE=$CODE"
api PUT "/admin/rentals/$RB/approve" "{}" "$ADM_TOKEN"; [ "$CODE" = "200" ] && ok "렌탈B 승인" || bad "렌탈B 승인 CODE=$CODE"

api GET "/rentals?sort=price&area=$AREA_Q&limit=100" "" ""
IA=$(echo "$RESP" | jq -r "[.items[].id] | index(\"$RA\")"); IB=$(echo "$RESP" | jq -r "[.items[].id] | index(\"$RB\")")
[ "$CODE" = "200" ] && [ "$IA" != "null" ] && [ "$IB" != "null" ] && ok "sort=price 목록에 A·B 포함" || bad "sort=price 목록 CODE=$CODE ia=$IA ib=$IB"
[ "$IA" != "null" ] && [ "$IB" != "null" ] && [ "$IB" -lt "$IA" ] && ok "가격 낮은 순: B(20000) 가 A(28000) 앞" || bad "정렬 순서 ib=$IB ia=$IA"
# 가격 없는(비프리미엄) 매장은 전부 가격 있는 매장 뒤
FIRST_NULL=$(echo "$RESP" | jq -r '[.items | to_entries[] | select(.value.priceFrom == null and (.value.isPremium | not)) | .key] | min // "none"')
if [ "$FIRST_NULL" = "none" ]; then ok "가격 없는 매장 없음 (뒤쪽 정렬 검사 생략)"; elif [ "$IA" != "null" ] && [ "$FIRST_NULL" -gt "$IA" ]; then ok "가격 없는 매장은 가격 있는 매장 뒤"; else bad "가격 없는 매장이 앞에 index=$FIRST_NULL ia=$IA"; fi
# 목록 응답에 가격표·영업시간 필드 포함
LPF=$(echo "$RESP" | jq -r ".items[] | select(.id==\"$RA\") | .priceFrom"); LOT=$(echo "$RESP" | jq -r ".items[] | select(.id==\"$RA\") | .openTime")
[ "$LPF" = "28000" ] && [ "$LOT" = "09:00" ] && ok "목록 항목에 priceFrom·openTime 포함" || bad "목록 필드 priceFrom=$LPF openTime=$LOT"
# 기본 정렬(sort 없음)도 정상
api GET "/rentals?area=$AREA_Q&limit=100" "" ""
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r "[.items[].id] | index(\"$RB\")")" != "null" ] && ok "기본 정렬 목록 200 (B 포함)" || bad "기본 목록 CODE=$CODE"
# 모르는 sort 값은 기본 정렬로 (400 아님)
api GET "/rentals?sort=hack&limit=5" "" ""; [ "$CODE" = "200" ] && ok "sort=hack → 기본 정렬 200" || bad "sort=hack CODE=$CODE"

# ── 스키샵: 영업시간 라운드트립 (등록 → 승인 → 상세/목록 → 빈값으로 지우기)
api POST /ski-shops '{"name":"S17스키샵","area":"용평","address":"평창","description":"영업시간 테스트","businessLicense":"/uploads/e2e.jpg","hours":"매일 10시~19시","openTime":"10:00","closeTime":"19:00","closedDays":["tue","wed"]}' "$OWNER_TOKEN"
SS=$(echo "$RESP" | jq -r '.id')
[ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.closedDays')" = "tue,wed" ] && ok "스키샵 등록 closedDays 'tue,wed'" || bad "스키샵 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api POST /ski-shops '{"name":"S17스키샵X","area":"용평","address":"평창","description":"x","businessLicense":"/uploads/e2e.jpg","openTime":"10"}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "스키샵 openTime '10' → 400" || bad "스키샵 openTime CODE=$CODE"
api PUT "/ski-shops/$SS/approve" "{}" "$ADM_TOKEN"; [ "$CODE" = "200" ] && ok "스키샵 승인" || bad "스키샵 승인 CODE=$CODE"
api GET "/ski-shops/$SS" "" ""
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.openTime')" = "10:00" ] && [ "$(echo "$RESP" | jq -r '.closeTime')" = "19:00" ] && [ "$(echo "$RESP" | jq -r '.closedDays')" = "tue,wed" ] && ok "스키샵 상세 영업시간 라운드트립" || bad "스키샵 상세 CODE=$CODE $(echo $RESP|head -c 160)"
api GET "/ski-shops?area=$AREA_Q" "" ""
LO=$(echo "$RESP" | jq -r ".[] | select(.id==\"$SS\") | .openTime"); [ "$LO" = "10:00" ] && ok "스키샵 목록에 openTime 포함" || bad "스키샵 목록 openTime=$LO"
api PUT "/ski-shops/$SS" '{"closedDays":"","openTime":"","closeTime":null}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.closedDays')" = "null" ] && [ "$(echo "$RESP" | jq -r '.openTime')" = "null" ] && [ "$(echo "$RESP" | jq -r '.closeTime')" = "null" ] && ok "스키샵 빈값/null 로 영업시간 지우기" || bad "스키샵 지우기 CODE=$CODE"
api PUT "/ski-shops/$SS" '{"closedDays":"fri,xyz"}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "스키샵 closedDays 'fri,xyz' → 400" || bad "스키샵 closedDays CODE=$CODE"

# ── 정비샵: 영업시간 라운드트립
api POST /repair-shops '{"name":"S17정비샵","area":"용평","address":"평창","description":"영업시간 테스트","businessLicense":"/uploads/e2e.jpg","openTime":"11:00","closeTime":"18:30","closedDays":"sun"}' "$OWNER_TOKEN"
RS=$(echo "$RESP" | jq -r '.id'); [ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.closedDays')" = "sun" ] && ok "정비샵 등록 영업시간 저장" || bad "정비샵 등록 CODE=$CODE"
api PUT "/repair-shops/$RS" '{"openTime":"9am"}' "$OWNER_TOKEN"; [ "$CODE" = "400" ] && ok "정비샵 openTime 9am → 400" || bad "정비샵 openTime CODE=$CODE"
api PUT "/repair-shops/$RS/approve" "{}" "$ADM_TOKEN"; [ "$CODE" = "200" ] && ok "정비샵 승인" || bad "정비샵 승인 CODE=$CODE"
api GET "/repair-shops/$RS" "" ""
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.openTime')" = "11:00" ] && [ "$(echo "$RESP" | jq -r '.closeTime')" = "18:30" ] && [ "$(echo "$RESP" | jq -r '.closedDays')" = "sun" ] && ok "정비샵 상세 영업시간 라운드트립" || bad "정비샵 상세 CODE=$CODE"
api GET "/repair-shops?area=$AREA_Q" "" ""
[ "$(echo "$RESP" | jq -r ".[] | select(.id==\"$RS\") | .closeTime")" = "18:30" ] && ok "정비샵 목록에 closeTime 포함" || bad "정비샵 목록 closeTime 누락"

# ── 관리자 시딩(claimable) 렌탈은 새 필드 전부 null
api POST /rentals '{"name":"S17시딩렌탈","area":"용평","claimable":true}' "$ADM_TOKEN"
[ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.priceFrom')" = "null" ] && [ "$(echo "$RESP" | jq -r '.openTime')" = "null" ] && [ "$(echo "$RESP" | jq -r '.closedDays')" = "null" ] && ok "관리자 시딩 렌탈은 가격·영업시간 null" || bad "시딩 CODE=$CODE RESP=$(echo $RESP|head -c 120)"

# ── 재심사 예외 (2026-09-17): 가격표·영업시간만 바꾸면 승인 유지, 상호 등 다른 내용이 바뀌면 재심사(approved=false)
api PUT "/rentals/$RA" '{"priceSkiSet":31000,"priceNote":"주말 할인"}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.approved')" = "true" ] && ok "가격표만 수정 → 승인 유지" || bad "가격만 수정 CODE=$CODE approved=$(echo "$RESP" | jq -r '.approved')"
api PUT "/rentals/$RA" '{"openTime":"08:30","closeTime":"21:00","closedDays":"tue","hours":"08:30~21:00 화 휴무"}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.approved')" = "true" ] && ok "영업시간만 수정 → 승인 유지" || bad "영업시간만 수정 approved=$(echo "$RESP" | jq -r '.approved')"
api PUT "/rentals/$RA" '{"priceSkiSet":31000,"priceNote":"주말 할인"}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.approved')" = "true" ] && ok "변경 없는 저장 → 승인 유지" || bad "변경 없는 저장 approved=$(echo "$RESP" | jq -r '.approved')"
api PUT "/rentals/$RA" '{"name":"S17렌탈A 새이름","priceSkiSet":32000}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.approved')" = "false" ] && ok "상호 변경 포함 → 재심사" || bad "상호 변경 approved=$(echo "$RESP" | jq -r '.approved')"
api PUT "/admin/rentals/$RA/approve" "{}" "$ADM_TOKEN"; [ "$CODE" = "200" ] && ok "렌탈A 재승인" || bad "재승인 CODE=$CODE"
api PUT "/ski-shops/$SS" '{"openTime":"10:00","closeTime":"19:00"}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.approved')" = "true" ] && ok "스키샵 영업시간만 수정 → 승인 유지" || bad "스키샵 시간 수정 approved=$(echo "$RESP" | jq -r '.approved')"
api PUT "/repair-shops/$RS" '{"closedDays":"mon"}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.approved')" = "true" ] && ok "정비샵 휴무일만 수정 → 승인 유지" || bad "정비샵 휴무 수정 approved=$(echo "$RESP" | jq -r '.approved')"

echo "----- STEP17: PASS=$PASS FAIL=$FAIL -----"
