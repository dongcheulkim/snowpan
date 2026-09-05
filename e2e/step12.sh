#!/bin/bash
# STEP 12: 매장 5종(스키샵·정비샵·렌탈·레슨·숙소) 전주기 — 등록 → 미승인 비공개 → 대시보드(/my) → 승인 → 공개 → 소유자 수정(재심사) → 타인 수정·삭제 차단(IDOR) → 삭제
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

echo "===== STEP 12: 매장 5종 전주기 (등록→승인→공개→수정→IDOR→삭제) ====="

OWNER_TOKEN=$(register_verified "01088880001" "shop_owner@re.test" "매장주인" "매장주인")
OTHER_TOKEN=$(register_verified "01088880002" "shop_other@re.test" "남의매장" "남의매장")
OWNER_ID=$(pq "SELECT id FROM users WHERE email='shop_owner@re.test'")
pq "UPDATE users SET role='admin' WHERE email='shop_other@re.test'" >/dev/null   # 잠시 후 admin 으로 씀 (아래 ADMIN_TOKEN)
ADMIN_TOKEN=$(login "shop_other@re.test" 'Re!pass1234')
pq "UPDATE users SET role='user' WHERE email='shop_other@re.test'" >/dev/null   # OTHER 는 일반유저로 되돌림 — admin 토큰은 tv/role 재확인 후 실패해야 정상
# 위 트릭은 혼동되니 별도 어드민 계정을 명확히 둔다
ADM_TOKEN=$(register_verified "01088880003" "shop_admin@re.test" "매장관리자" "매장관리자")
pq "UPDATE users SET role='admin' WHERE email='shop_admin@re.test'" >/dev/null
ADM_TOKEN=$(login "shop_admin@re.test" 'Re!pass1234')
[ -n "$OWNER_TOKEN" ] && [ -n "$OTHER_TOKEN" ] && [ -n "$ADM_TOKEN" ] && ok "유저 3명(소유자·타인·관리자) 준비" || bad "유저 준비 실패 owner=$OWNER_TOKEN other=$OTHER_TOKEN adm=$ADM_TOKEN"

# 강등된 계정의 옛 admin 토큰이 admin 라우트에 못 들어가는지 (role 은 DB 재확인)
api GET /ski-shops/pending "" "$ADMIN_TOKEN"
[ "$CODE" = "403" ] && ok "강등 후 옛 admin 토큰 관리자 라우트 차단 (403)" || bad "강등 토큰 admin 접근 CODE=$CODE"

# ─────────────────────────────────────────────────────────────
# 공통 검증 함수: run_shop <label> <createPath> <listPath> <myPath> <detailBase> <approve method+path template> <createBody> <updateBody>
# approve: "admin_put /ski-shops/ID/approve" | "admin_put /admin/rentals/ID/approve"
run_shop() {
  local label=$1 create=$2 list=$3 my=$4 detail=$5 approve=$6 body=$7 upd=$8 idfield=${9:-id}

  # 1) 비로그인 등록 401
  api POST "$create" "$body" ""
  [ "$CODE" = "401" ] && ok "[$label] 비로그인 등록 401" || bad "[$label] 비로그인 등록 CODE=$CODE"

  # 2) 필수값 누락 400
  api POST "$create" '{"name":"x"}' "$OWNER_TOKEN"
  [ "$CODE" = "400" ] && ok "[$label] 필수값 누락 400" || bad "[$label] 필수누락 CODE=$CODE RESP=$(echo $RESP|head -c 100)"

  # 3) 외부 이미지 URL 거부 400
  local badimg; badimg=$(echo "$body" | jq -c '. + {image:"https://evil.example.com/x.jpg"}')
  api POST "$create" "$badimg" "$OWNER_TOKEN"
  [ "$CODE" = "400" ] && ok "[$label] 외부 이미지 URL 거부 400" || bad "[$label] 외부이미지 CODE=$CODE"

  # 4) 정상 등록 201 + approved=false
  api POST "$create" "$body" "$OWNER_TOKEN"
  local id; id=$(echo "$RESP" | jq -r ".$idfield // .id // empty")
  local appr; appr=$(echo "$RESP" | jq -r '.approved')
  [ "$CODE" = "201" ] && [ -n "$id" ] && [ "$appr" = "false" ] && ok "[$label] 등록 201 (미승인 상태)" || bad "[$label] 등록 CODE=$CODE appr=$appr RESP=$(echo $RESP|head -c 150)"
  [ -z "$id" ] && return

  # 5) 미승인: 공개 목록/상세에 안 보임
  api GET "$list" ""
  local inlist; inlist=$(echo "$RESP" | jq -r "[(if type==\"array\" then . else (.items // .shops // .users // .reports // .deals // []) end)[]? | select(.id==\"$id\")] | length")
  [ "$inlist" = "0" ] && ok "[$label] 미승인 매장 공개 목록 비노출" || bad "[$label] 미승인 목록 노출=$inlist"
  api GET "$detail/$id" ""
  [ "$CODE" = "404" ] && ok "[$label] 미승인 매장 공개 상세 404" || bad "[$label] 미승인 상세 CODE=$CODE"

  # 6) 대시보드 /my 에는 보임 (승인 전에도)
  api GET "$my" "" "$OWNER_TOKEN"
  local inmy; inmy=$(echo "$RESP" | jq -r "[.[]? | select(.id==\"$id\")] | length")
  [ "$inmy" = "1" ] && ok "[$label] 대시보드 /my 미승인 매장 노출" || bad "[$label] /my 노출=$inmy CODE=$CODE"
  api GET "$my" "" "$OTHER_TOKEN"
  local inother; inother=$(echo "$RESP" | jq -r "[.[]? | select(.id==\"$id\")] | length")
  [ "$inother" = "0" ] && ok "[$label] 타인 /my 에 안 섞임" || bad "[$label] 타인 /my 노출=$inother"

  # 7) 일반유저 승인 시도 403 / 관리자 승인 200
  local appath; appath=${approve//ID/$id}
  api PUT "$appath" "{}" "$OTHER_TOKEN"
  [ "$CODE" = "403" ] && ok "[$label] 일반유저 승인 시도 403" || bad "[$label] 일반 승인 CODE=$CODE"
  api PUT "$appath" "{}" "$ADM_TOKEN"
  [ "$CODE" = "200" ] && ok "[$label] 관리자 승인 200" || bad "[$label] 관리자 승인 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
  local nc; nc=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWNER_ID' AND type='approve' AND message LIKE '%승인%'")
  [ "$nc" -ge 1 ] && ok "[$label] 승인 알림 생성" || bad "[$label] 승인 알림 수=$nc"

  # 8) 승인 후 공개 상세 200 + 개인정보(이메일·전화 원문) 미노출
  api GET "$detail/$id" ""
  [ "$CODE" = "200" ] && ok "[$label] 승인 후 공개 상세 200" || bad "[$label] 승인 후 상세 CODE=$CODE"
  local leak; leak=$(echo "$RESP" | grep -c "shop_owner@re.test\|\"email\"")
  [ "$leak" = "0" ] && ok "[$label] 공개 상세에 소유자 이메일 미노출" || bad "[$label] 이메일 노출!"
  local leak2; leak2=$(echo "$RESP" | jq -r '.user.phone // .user.email // empty')
  [ -z "$leak2" ] && ok "[$label] 공개 상세 user 객체에 phone/email 없음" || bad "[$label] user 개인정보 노출: $leak2"

  # 9) 타인 수정·삭제 403 (IDOR)
  api PUT "$detail/$id" "$upd" "$OTHER_TOKEN"
  [ "$CODE" = "403" ] && ok "[$label] 타인 수정 403" || bad "[$label] 타인 수정 CODE=$CODE"
  api DELETE "$detail/$id" "" "$OTHER_TOKEN"
  [ "$CODE" = "403" ] && ok "[$label] 타인 삭제 403" || bad "[$label] 타인 삭제 CODE=$CODE"

  # 10) 소유자 수정 200 → 재심사(approved=false) → 공개 상세 다시 404
  api PUT "$detail/$id" "$upd" "$OWNER_TOKEN"
  [ "$CODE" = "200" ] && ok "[$label] 소유자 수정 200" || bad "[$label] 소유자 수정 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
  local reap; reap=$(pq "SELECT approved FROM $(shop_table "$label") WHERE id='$id'")
  [ "$reap" = "f" ] && ok "[$label] 소유자 수정 후 재심사 상태(approved=false)" || bad "[$label] 수정 후 approved=$reap"
  api GET "$detail/$id" ""
  [ "$CODE" = "404" ] && ok "[$label] 재심사 중 공개 상세 404" || bad "[$label] 재심사 상세 CODE=$CODE"
  # 소유자 본인은 미승인 상세 열람 가능 (렌탈·레슨·숙소는 optionalAuth)
  api GET "$detail/$id" "" "$OWNER_TOKEN"
  case "$label" in
    rental|lesson|accommodation) [ "$CODE" = "200" ] && ok "[$label] 소유자 본인 미승인 상세 열람 200" || bad "[$label] 소유자 미승인 상세 CODE=$CODE";;
  esac

  # 11) XSS 스크립트가 이름에 저장되지 않음
  local xss; xss=$(echo "$upd" | jq -c '. + {name:"<script>alert(1)</script>매장"}')
  api PUT "$detail/$id" "$xss" "$OWNER_TOKEN"
  local stored; stored=$(pq "SELECT name FROM $(shop_table "$label") WHERE id='$id'")
  case "$stored" in *"<script>"*) bad "[$label] XSS 스크립트가 저장됨: $stored";; *) ok "[$label] 이름 XSS 새니타이즈";; esac

  # 12) 관리자 삭제 → 소유자 알림 / 실제 삭제
  api DELETE "$detail/$id" "" "$ADM_TOKEN"
  [ "$CODE" = "200" ] && ok "[$label] 관리자 삭제 200" || bad "[$label] 관리자 삭제 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
  local gone; gone=$(pq "SELECT count(*) FROM $(shop_table "$label") WHERE id='$id'")
  [ "$gone" = "0" ] && ok "[$label] DB 에서 삭제 확인" || bad "[$label] 삭제 후 row=$gone"
}

shop_table() {
  case "$1" in
    skishop) echo ski_shops;; repair) echo repair_shops;; rental) echo rentals;; lesson) echo lessons;; accommodation) echo accommodations;;
  esac
}

run_shop skishop /ski-shops "/ski-shops" /ski-shops/my /ski-shops "/ski-shops/ID/approve" \
  '{"name":"E2E스키샵","area":"용평","address":"강원 평창","description":"테스트 스키샵","businessLicense":"/uploads/e2e.jpg"}' \
  '{"description":"수정된 설명"}'

run_shop repair /repair-shops "/repair-shops" /repair-shops/my /repair-shops "/repair-shops/ID/approve" \
  '{"name":"E2E정비샵","area":"용평","address":"강원 평창","description":"테스트 정비","businessLicense":"/uploads/e2e.jpg"}' \
  '{"description":"수정된 정비 설명"}'

run_shop rental /rentals "/rentals" /rentals/my /rentals "/admin/rentals/ID/approve" \
  "{\"name\":\"E2E렌탈\",\"area\":\"용평\",\"businessLicense\":\"/uploads/e2e.jpg\",\"resortId\":\"$YONGPYONG\"}" \
  '{"description":"수정된 렌탈 설명"}'

run_shop lesson /lessons "/lessons" /lessons/my /lessons "/admin/lessons/ID/approve" \
  "{\"name\":\"E2E레슨\",\"resortId\":\"$YONGPYONG\",\"description\":\"테스트 레슨\",\"type\":\"스키\",\"specialties\":\"인터\"}" \
  '{"description":"수정된 레슨 설명"}'

run_shop accommodation /accommodations "/accommodations" /accommodations/my /accommodations "/admin/accommodations/ID/approve" \
  "{\"name\":\"E2E숙소\",\"type\":\"pension\",\"price\":80000,\"guests\":\"4\",\"image\":\"/uploads/e2e.jpg\",\"resortId\":\"$YONGPYONG\"}" \
  '{"price":90000}'

# 숙소 유효성: 인원 범위·유형
api POST /accommodations "{\"name\":\"X\",\"type\":\"castle\",\"price\":1000,\"guests\":\"4\",\"image\":\"/uploads/e2e.jpg\",\"resortId\":\"$YONGPYONG\"}" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "숙소 잘못된 유형 400" || bad "숙소 유형 CODE=$CODE"
api POST /accommodations "{\"name\":\"X\",\"type\":\"pension\",\"price\":1000,\"guests\":\"99\",\"image\":\"/uploads/e2e.jpg\",\"resortId\":\"$YONGPYONG\"}" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "숙소 인원 99 → 400" || bad "숙소 인원 CODE=$CODE"
# 레슨 분야 화이트리스트 (없는 분야는 걸러짐)
api POST /lessons "{\"name\":\"E2E레슨2\",\"resortId\":\"$YONGPYONG\",\"description\":\"d\",\"specialties\":\"인터,해킹,모글\"}" "$OWNER_TOKEN"
SPEC=$(echo "$RESP" | jq -r '.specialties')
[ "$CODE" = "201" ] && [ "$SPEC" = "인터,모글" ] && ok "레슨 분야 화이트리스트 필터 (인터,모글)" || bad "레슨 분야 CODE=$CODE spec=$SPEC"
LID2=$(echo "$RESP" | jq -r '.id')
# 관리자 반려(reject) → 소유자 알림 + 삭제
api DELETE "/admin/lessons/$LID2/reject" "" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "관리자 레슨 반려 200" || bad "레슨 반려 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
GONE=$(pq "SELECT count(*) FROM lessons WHERE id='$LID2'")
[ "$GONE" = "0" ] && ok "반려 레슨 삭제됨" || bad "반려 후 row=$GONE"

# business-status: 승인 매장 없으면 isOwner=false, 대기 매장 있으면 hasPending=true
api POST /rentals "{\"name\":\"E2E렌탈대기\",\"area\":\"용평\",\"businessLicense\":\"/uploads/e2e.jpg\"}" "$OWNER_TOKEN"
api GET /auth/business-status "" "$OWNER_TOKEN"
BO=$(echo "$RESP" | jq -r '.isOwner'); BP=$(echo "$RESP" | jq -r '.hasPending')
[ "$BO" = "false" ] && [ "$BP" = "true" ] && ok "business-status 대기만 있음 (isOwner=false, hasPending=true)" || bad "business-status isOwner=$BO hasPending=$BP"

# 관리자 pending 목록에 노출 + 일반유저 403
api GET /admin/rentals/pending "" "$ADM_TOKEN"
PC=$(echo "$RESP" | jq -r '[.[]? | select(.name=="E2E렌탈대기")] | length')
[ "$CODE" = "200" ] && [ "$PC" = "1" ] && ok "관리자 렌탈 대기 목록 노출" || bad "대기 목록 CODE=$CODE cnt=$PC"
api GET /admin/rentals/pending "" "$OWNER_TOKEN"
[ "$CODE" = "403" ] && ok "일반유저 관리자 대기목록 403" || bad "일반 대기목록 CODE=$CODE"

echo "----- STEP12: PASS=$PASS FAIL=$FAIL -----"
