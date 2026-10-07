#!/bin/bash
# STEP 39: 레슨 가격표·강사 프로필·자격 확인 배지·가격순 정렬 (2026-10-07)
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
echo "===== STEP 39: 레슨 가격표·강사 프로필 ====="
OWN=$(register_verified "01099990391" "ls_owner@s39.test" "레슨강사39" "레슨강사39"); [ -z "$OWN" ] && OWN=$(login "ls_owner@s39.test" 'Re!pass1234')
ADM=$(register_verified "01099990392" "ls_admin@s39.test" "레슨관리자39" "레슨관리자39")
pq "UPDATE users SET role='admin' WHERE email='ls_admin@s39.test'" >/dev/null
ADM=$(login "ls_admin@s39.test" 'Re!pass1234')
RID=$(pq "SELECT id FROM ski_resorts ORDER BY name LIMIT 1")
[ -n "$OWN" ] && [ -n "$ADM" ] && [ -n "$RID" ] && ok "준비" || bad "준비 실패"
pq "DELETE FROM lessons WHERE name LIKE 'S39%'" >/dev/null

# 등록 — 가격표·경력·언어·시간·영상
api POST /lessons "{\"name\":\"S39 비싼레슨\",\"resortId\":\"$RID\",\"type\":\"스키\",\"description\":\"d\",\"providerType\":\"freelance\",\"career\":\"KSIA 레벨2, 경력 8년\",\"languages\":\"한국어,영어,클링온어\",\"schedule\":\"주말 가능\",\"videoUrl\":\"https://youtu.be/abc123\",\"priceTable\":[{\"label\":\"1:1 2시간\",\"price\":150000},{\"label\":\"그룹 2시간\",\"price\":90000}]}" "$OWN"
[ "$CODE" = "201" ] && L1=$(echo "$RESP" | jq -r '.id') && [ "$(echo "$RESP" | jq -r '.minPrice')" = "90000" ] && [ "$(echo "$RESP" | jq -r '.languages')" = "한국어,영어" ] && [ "$(echo "$RESP" | jq -r '.career')" = "KSIA 레벨2, 경력 8년" ] && ok "등록 201 — 최저가 90000, 언어는 목록에 있는 것만" || bad "등록 CODE=$CODE RESP=$(echo "$RESP" | head -c 200)"
api POST /lessons "{\"name\":\"S39 싼레슨\",\"resortId\":\"$RID\",\"type\":\"스키\",\"description\":\"d\",\"providerType\":\"freelance\",\"priceTable\":\"[{\\\"label\\\":\\\"1:1 2시간\\\",\\\"price\\\":60000}]\"}" "$OWN"
[ "$CODE" = "201" ] && L2=$(echo "$RESP" | jq -r '.id') && [ "$(echo "$RESP" | jq -r '.minPrice')" = "60000" ] && ok "가격표를 JSON 문자열로 보내도 저장" || bad "문자열 가격표 CODE=$CODE RESP=$(echo "$RESP" | head -c 200)"
api POST /lessons "{\"name\":\"S39 가격없음\",\"resortId\":\"$RID\",\"type\":\"스키\",\"description\":\"d\",\"providerType\":\"freelance\"}" "$OWN"
[ "$CODE" = "201" ] && L3=$(echo "$RESP" | jq -r '.id') && [ "$(echo "$RESP" | jq -r '.minPrice')" = "null" ] && ok "가격표 없이도 등록 (minPrice null)" || bad "가격 없음 CODE=$CODE"
# 검증
api POST /lessons "{\"name\":\"S39 x\",\"resortId\":\"$RID\",\"description\":\"d\",\"videoUrl\":\"https://evil.example/x\"}" "$OWN"; [ "$CODE" = "400" ] && ok "유튜브·인스타 아닌 영상 주소 400" || bad "영상 주소 CODE=$CODE"
api POST /lessons "{\"name\":\"S39 x\",\"resortId\":\"$RID\",\"description\":\"d\",\"priceTable\":[{\"label\":\"\",\"price\":1000}]}" "$OWN"; [ "$CODE" = "400" ] && ok "항목 이름 없는 가격표 400" || bad "빈 항목 CODE=$CODE"
api POST /lessons "{\"name\":\"S39 x\",\"resortId\":\"$RID\",\"description\":\"d\",\"priceTable\":[{\"label\":\"a\",\"price\":-5}]}" "$OWN"; [ "$CODE" = "400" ] && ok "음수 가격 400" || bad "음수 가격 CODE=$CODE"
ROWS=$(python3 -c "import json;print(json.dumps([{'label':'r%d'%i,'price':1000} for i in range(9)]))")
api POST /lessons "{\"name\":\"S39 x\",\"resortId\":\"$RID\",\"description\":\"d\",\"priceTable\":$ROWS}" "$OWN"; [ "$CODE" = "400" ] && ok "가격표 9줄 400 (최대 8)" || bad "9줄 CODE=$CODE"
api POST /lessons "{\"name\":\"S39 x\",\"resortId\":\"$RID\",\"description\":\"d\",\"priceTable\":\"not json\"}" "$OWN"; [ "$CODE" = "400" ] && ok "깨진 JSON 가격표 400" || bad "깨진 JSON CODE=$CODE"
api POST /lessons "{\"name\":\"S39 x\",\"resortId\":\"$RID\",\"description\":\"d\",\"career\":\"<script>alert(1)</script>경력\"}" "$OWN"; [ "$CODE" = "201" ] && ! echo "$RESP" | jq -r '.career' | grep -q "<script" && ok "경력에 스크립트 태그 제거" || bad "경력 XSS CODE=$CODE RESP=$(echo "$RESP" | jq -r '.career')"
pq "DELETE FROM lessons WHERE name='S39 x'" >/dev/null

# 승인(자격 확인 배지 포함) + 공개 목록
api PUT "/admin/lessons/$L1/approve" '{"certVerified":true}' "$ADM"; [ "$CODE" = "200" ] && ok "승인하면서 자격 확인 배지" || bad "승인1 CODE=$CODE RESP=$(echo "$RESP" | head -c 150)"
api PUT "/admin/lessons/$L2/approve" '{}' "$ADM" >/dev/null; api PUT "/admin/lessons/$L3/approve" '{}' "$ADM" >/dev/null
api GET "/lessons?resortId=$RID&type=%EC%8A%A4%ED%82%A4&limit=100" "" ""
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r ".items[] | select(.id==\"$L1\") | .certVerified")" = "true" ] && [ "$(echo "$RESP" | jq -r ".items[] | select(.id==\"$L1\") | .minPrice")" = "90000" ] && ok "공개 목록에 자격 확인·최저가 노출" || bad "목록 CODE=$CODE"
echo "$RESP" | jq -r ".items[] | select(.id==\"$L1\") | keys[]" | grep -q "instructorCert" && bad "공개 목록에 자격증 파일 노출" || ok "자격증 파일 주소는 공개 안 됨"
api GET "/lessons/$L1" "" ""; [ "$(echo "$RESP" | jq -r '.priceTable | fromjson | length')" = "2" ] && [ "$(echo "$RESP" | jq -r '.videoUrl')" = "https://youtu.be/abc123" ] && [ "$(echo "$RESP" | jq -r '.schedule')" = "주말 가능" ] && ok "상세에 가격표 2줄·영상·가능 시간" || bad "상세 RESP=$(echo "$RESP" | head -c 200)"
# 가격순 정렬: 60000 → 90000 → 가격 없음
api GET "/lessons?resortId=$RID&type=%EC%8A%A4%ED%82%A4&sort=price&limit=100" "" ""
ORDER=$(echo "$RESP" | jq -r '.items[] | select(.name | startswith("S39")) | .name' | tr '\n' ',')
[ "$ORDER" = "S39 싼레슨,S39 비싼레슨,S39 가격없음," ] && ok "가격순: 싼 → 비싼 → 가격 없음" || bad "가격순 ORDER=$ORDER"
api GET "/lessons?resortId=$RID&type=%EC%8A%A4%ED%82%A4&sort=bogus&limit=100" "" ""; [ "$CODE" = "200" ] && ok "이상한 sort 값은 기본 정렬" || bad "sort 검증 CODE=$CODE"

# 수정 — 가격표 바꾸면 최저가 갱신, 비우면 null / 배지 토글
api PUT "/lessons/$L1" '{"priceTable":[{"label":"1:1 2시간","price":200000}],"languages":"일본어"}' "$OWN"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.minPrice')" = "200000" ] && [ "$(echo "$RESP" | jq -r '.languages')" = "일본어" ] && ok "수정 — 최저가 200000·언어 갱신" || bad "수정 CODE=$CODE RESP=$(echo "$RESP" | head -c 150)"
api PUT "/lessons/$L1" '{"priceTable":null,"videoUrl":""}' "$OWN"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.minPrice')" = "null" ] && [ "$(echo "$RESP" | jq -r '.videoUrl')" = "null" ] && ok "가격표·영상 비우기" || bad "비우기 CODE=$CODE RESP=$(echo "$RESP" | head -c 150)"
api PUT "/admin/lessons/$L1/cert-badge" '{"verified":false}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.certVerified')" = "false" ] && ok "자격 확인 배지 떼기" || bad "배지 떼기 CODE=$CODE"
api PUT "/admin/lessons/$L2/cert-badge" '{"verified":true}' "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.certVerified')" = "true" ] && ok "자격 확인 배지 붙이기" || bad "배지 붙이기 CODE=$CODE"
OWN_ID=$(pq "SELECT id FROM users WHERE email='ls_owner@s39.test'")
[ "$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWN_ID' AND title='자격 확인 배지가 붙었어요'")" -ge 1 ] && ok "배지 붙으면 강사에게 알림" || bad "배지 알림 없음"
api PUT "/admin/lessons/$L2/cert-badge" '{"verified":true}' "$OWN"; [ "$CODE" = "403" ] && ok "일반 회원은 배지 토글 403" || bad "권한 CODE=$CODE"
api PUT "/admin/lessons/00000000-0000-0000-0000-000000000000/cert-badge" '{"verified":true}' "$ADM"; [ "$CODE" = "404" ] && ok "없는 레슨 404" || bad "없는 레슨 CODE=$CODE"

pq "DELETE FROM lessons WHERE name LIKE 'S39%'" >/dev/null
echo "----- STEP 39 결과: PASS=$PASS FAIL=$FAIL -----"
[ "$FAIL" = "0" ]
