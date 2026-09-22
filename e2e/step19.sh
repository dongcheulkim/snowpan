#!/bin/bash
# STEP 19: 방문 예약 (요청·확정·거절·취소) — 손님이 렌탈·레슨에 예약 요청 → 채팅 카드(type reservation) + 사장님 알림,
#          사장님 확정/거절 → 손님 알림, 손님 취소 → 사장님 알림, 목록(mine/shop)·상세 권한, 개인정보 비노출
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
# 응답에 이메일·전화번호 키가 없어야 한다
no_pii() { echo "$RESP" | grep -Eqi '"(email|phone)"' && bad "$1 응답에 email/phone 노출" || ok "$1 응답 개인정보 없음"; }

echo "===== STEP 19: 방문 예약 (요청·확정·거절·취소) ====="

OWNER_TOKEN=$(register_verified "01099990101" "rv_owner@s19.test" "예약사장" "예약사장")
CUST_TOKEN=$(register_verified "01099990102" "rv_cust@s19.test" "손님" "손님")
OTHER_TOKEN=$(register_verified "01099990103" "rv_other@s19.test" "남남" "남남")
ADM_TOKEN=$(register_verified "01099990104" "rv_admin@s19.test" "예약관리자" "예약관리자")
pq "UPDATE users SET role='admin' WHERE email='rv_admin@s19.test'" >/dev/null
ADM_TOKEN=$(login "rv_admin@s19.test" 'Re!pass1234')
OWNER_ID=$(pq "SELECT id FROM users WHERE email='rv_owner@s19.test'")
CUST_ID=$(pq "SELECT id FROM users WHERE email='rv_cust@s19.test'")
[ -n "$OWNER_TOKEN" ] && [ -n "$CUST_TOKEN" ] && [ -n "$OTHER_TOKEN" ] && [ -n "$ADM_TOKEN" ] && ok "유저 4명 준비" || bad "유저 준비 실패"

# ── 매장 준비: 렌탈(승인) · 렌탈(미승인) · 레슨(승인)
api POST /rentals '{"name":"S19렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER_TOKEN"
RENTAL=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$RENTAL" ] && ok "렌탈 등록" || bad "렌탈 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "렌탈 승인" || bad "렌탈 승인 CODE=$CODE"
api POST /rentals '{"name":"S19미승인렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg"}' "$OWNER_TOKEN"
RENTAL_NA=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$RENTAL_NA" ] && ok "미승인 렌탈 등록" || bad "미승인 렌탈 CODE=$CODE"
api POST /lessons "{\"name\":\"S19레슨\",\"resortId\":\"$YONGPYONG\",\"description\":\"예약 테스트 레슨\",\"type\":\"스키\",\"specialties\":\"인터\"}" "$OWNER_TOKEN"
LESSON=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$LESSON" ] && ok "레슨 등록" || bad "레슨 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api PUT "/admin/lessons/$LESSON/approve" "{}" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "레슨 승인" || bad "레슨 승인 CODE=$CODE"
api POST /repair-shops '{"name":"S19정비샵","area":"용평","address":"평창","description":"예약 테스트 정비샵","businessLicense":"/uploads/e2e.jpg"}' "$OWNER_TOKEN"
REPAIR=$(echo "$RESP" | jq -r '.id // empty')
[ "$CODE" = "201" ] && [ -n "$REPAIR" ] && ok "정비샵 등록" || bad "정비샵 등록 CODE=$CODE RESP=$(echo $RESP|head -c 120)"
api PUT "/repair-shops/$REPAIR/approve" "{}" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "정비샵 승인" || bad "정비샵 승인 CODE=$CODE"

DATE=$(date -v+7d +%F 2>/dev/null || date -d '+7 days' +%F)
PAST=$(date -v-1d +%F 2>/dev/null || date -d '-1 day' +%F)
BODY_OK="{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"time\":\"10:30\",\"adults\":2,\"children\":1,\"details\":{\"ski\":2,\"options\":[\"헬멧\",\"고글\"],\"hack\":\"x\"},\"note\":\"<b>키 180</b> 부츠 280\"}"

# ── 검증 실패 케이스 (형식 오류는 제3자 토큰으로 — 손님의 시간당 10건 사용자 리미터 여유 확보)
api POST /reservations "$BODY_OK" ""
[ "$CODE" = "401" ] && ok "비로그인 예약 401" || bad "비로그인 CODE=$CODE"
api POST /reservations "{\"shopType\":\"hack\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"adults\":1}" "$CUST_TOKEN"
[ "$CODE" = "400" ] && ok "알 수 없는 shopType 400" || bad "shopType CODE=$CODE"
api POST /reservations "$BODY_OK" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "내 매장 예약 400" || bad "내 매장 CODE=$CODE"
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL_NA\",\"date\":\"$DATE\",\"adults\":1}" "$CUST_TOKEN"
[ "$CODE" = "400" ] && ok "미승인 매장 예약 400" || bad "미승인 매장 CODE=$CODE"
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$PAST\",\"adults\":1}" "$OTHER_TOKEN"
[ "$CODE" = "400" ] && ok "지난 날짜 400" || bad "지난 날짜 CODE=$CODE"
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"adults\":0,\"children\":0}" "$OTHER_TOKEN"
[ "$CODE" = "400" ] && ok "인원 0명 400" || bad "인원 0 CODE=$CODE"
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"time\":\"25:00\",\"adults\":1}" "$OTHER_TOKEN"
[ "$CODE" = "400" ] && ok "잘못된 시각 400" || bad "시각 CODE=$CODE"
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"endDate\":\"$PAST\",\"adults\":1}" "$OTHER_TOKEN"
[ "$CODE" = "400" ] && ok "종료일 < 방문일 400" || bad "종료일 CODE=$CODE"

# ── 정상 요청 (렌탈)
api POST /reservations "$BODY_OK" "$CUST_TOKEN"
RES1=$(echo "$RESP" | jq -r '.reservation.id // empty'); ROOM=$(echo "$RESP" | jq -r '.roomId // empty')
ST=$(echo "$RESP" | jq -r '.reservation.status'); SKI=$(echo "$RESP" | jq -r '.reservation.details.ski'); OPT=$(echo "$RESP" | jq -r '.reservation.details.options | join(",")')
HACK=$(echo "$RESP" | jq -r '.reservation.details.hack // "none"'); NOTE=$(echo "$RESP" | jq -r '.reservation.note'); RDATE=$(echo "$RESP" | jq -r '.reservation.date')
[ "$CODE" = "201" ] && [ -n "$RES1" ] && [ -n "$ROOM" ] && [ "$ST" = "requested" ] && ok "렌탈 예약 요청 201 (roomId·requested)" || bad "예약 요청 CODE=$CODE st=$ST RESP=$(echo $RESP|head -c 200)"
[ "$SKI" = "2" ] && [ "$OPT" = "헬멧,고글" ] && ok "details 반영 (ski=2, options)" || bad "details ski=$SKI opt=$OPT"
[ "$HACK" = "none" ] && ok "허용 안 된 details 키 제거" || bad "details hack=$HACK"
case "$NOTE" in *"<b>"*) bad "요청사항 HTML 미제거: $NOTE";; *) ok "요청사항 HTML 새니타이즈";; esac
[ "$RDATE" = "$DATE" ] && ok "date KST 'YYYY-MM-DD' 그대로" || bad "date=$RDATE (기대 $DATE)"
no_pii "예약 생성"

# 채팅방에 예약 카드 (type reservation, event requested)
api GET "/chat/rooms/$ROOM/messages" "" "$CUST_TOKEN"
NCARD=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")] | length')
EV=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][0].content | fromjson | .event')
CID=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][0].content | fromjson | .reservationId')
SNAME=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][0].sender.name')
[ "$CODE" = "200" ] && [ "$NCARD" = "1" ] && [ "$EV" = "requested" ] && [ "$CID" = "$RES1" ] && ok "채팅방 예약 카드 1건 (event=requested)" || bad "카드 CODE=$CODE n=$NCARD ev=$EV"
[ "$SNAME" = "손님" ] && ok "카드 보낸이 표시명" || bad "카드 sender.name=$SNAME"
no_pii "채팅 메시지"
# 사장님도 같은 방을 볼 수 있다
api GET "/chat/rooms/$ROOM/messages" "" "$OWNER_TOKEN"
[ "$CODE" = "200" ] && ok "사장님 채팅방 접근 200" || bad "사장님 채팅방 CODE=$CODE"

# 사장님 알림
NREQ=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWNER_ID' AND title='손님님의 예약 요청'")
[ "$NREQ" = "1" ] && ok "사장님 알림 '손님님의 예약 요청'" || bad "사장님 알림 n=$NREQ"
NLINK=$(pq "SELECT link FROM notifications WHERE \"userId\"='$OWNER_ID' AND title='손님님의 예약 요청' LIMIT 1")
[ "$NLINK" = "/chat/$ROOM" ] && ok "알림 링크 채팅방" || bad "알림 link=$NLINK"

# ── 확정 권한
api PUT "/reservations/$RES1/confirm" '{"message":"x"}' "$OTHER_TOKEN"
[ "$CODE" = "404" ] || [ "$CODE" = "403" ] && ok "제3자 확정 $CODE" || bad "제3자 확정 CODE=$CODE"
api PUT "/reservations/$RES1/confirm" '{"message":"x"}' "$CUST_TOKEN"
[ "$CODE" = "403" ] && ok "손님 확정 403" || bad "손님 확정 CODE=$CODE"
api PUT "/reservations/$RES1/confirm" "{\"message\":\"$(printf 'a%.0s' $(seq 1 201))\"}" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "확정 메시지 201자 400" || bad "긴 메시지 CODE=$CODE"

# ── 사장님 확정
api PUT "/reservations/$RES1/confirm" '{"message":"10시 반에 뵐게요"}' "$OWNER_TOKEN"
ST=$(echo "$RESP" | jq -r '.reservation.status'); OM=$(echo "$RESP" | jq -r '.reservation.ownerMessage'); RA=$(echo "$RESP" | jq -r '.reservation.respondedAt // empty')
[ "$CODE" = "200" ] && [ "$ST" = "confirmed" ] && [ "$OM" = "10시 반에 뵐게요" ] && [ -n "$RA" ] && ok "사장님 확정 200 (confirmed·ownerMessage·respondedAt)" || bad "확정 CODE=$CODE st=$ST om=$OM"
NCONF=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$CUST_ID' AND title='예약이 확정됐어요'")
[ "$NCONF" = "1" ] && ok "손님 알림 '예약이 확정됐어요'" || bad "확정 알림 n=$NCONF"
CMSG=$(pq "SELECT message FROM notifications WHERE \"userId\"='$CUST_ID' AND title='예약이 확정됐어요' LIMIT 1")
case "$CMSG" in *"S19렌탈"*"10:30"*"10시 반에 뵐게요"*) ok "확정 알림 본문 (매장·시각·메시지)";; *) bad "확정 알림 본문=$CMSG";; esac
api GET "/chat/rooms/$ROOM/messages" "" "$CUST_TOKEN"
NCARD=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")] | length')
EV=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][-1].content | fromjson | .event')
EVMSG=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][-1].content | fromjson | .message')
EVSENDER=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][-1].senderId')
[ "$NCARD" = "2" ] && [ "$EV" = "confirmed" ] && [ "$EVMSG" = "10시 반에 뵐게요" ] && ok "확정 카드 (예약 카드 2건, event=confirmed)" || bad "확정 카드 n=$NCARD ev=$EV msg=$EVMSG"
[ "$EVSENDER" = "$OWNER_ID" ] && ok "확정 카드 보낸이 = 사장님" || bad "확정 카드 sender=$EVSENDER"
api PUT "/reservations/$RES1/confirm" '{}' "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "재확정 400" || bad "재확정 CODE=$CODE"
api PUT "/reservations/$RES1/decline" '{"reason":"x"}' "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "확정 후 거절 400" || bad "확정 후 거절 CODE=$CODE"

# ── 손님 취소 (확정 상태)
api PUT "/reservations/$RES1/cancel" '{}' "$OTHER_TOKEN"
[ "$CODE" = "404" ] && ok "제3자 취소 404" || bad "제3자 취소 CODE=$CODE"
api PUT "/reservations/$RES1/cancel" '{}' "$CUST_TOKEN"
ST=$(echo "$RESP" | jq -r '.reservation.status')
[ "$CODE" = "200" ] && [ "$ST" = "cancelled" ] && ok "손님 취소 200 (cancelled)" || bad "취소 CODE=$CODE st=$ST"
NCAN=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWNER_ID' AND title='예약이 취소됐어요'")
[ "$NCAN" = "1" ] && ok "사장님 알림 '예약이 취소됐어요'" || bad "취소 알림 n=$NCAN"
api GET "/chat/rooms/$ROOM/messages" "" "$CUST_TOKEN"
NCARD=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")] | length')
EV=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][-1].content | fromjson | .event')
BY=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][-1].content | fromjson | .by')
[ "$NCARD" = "3" ] && [ "$EV" = "cancelled" ] && [ "$BY" = "customer" ] && ok "취소 카드 (event=cancelled, by=customer)" || bad "취소 카드 n=$NCARD ev=$EV by=$BY"
api PUT "/reservations/$RES1/cancel" '{}' "$CUST_TOKEN"
[ "$CODE" = "400" ] && ok "재취소 400" || bad "재취소 CODE=$CODE"

# ── 두 번째 요청 → 사장님 거절 (사유)
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"adults\":1}" "$CUST_TOKEN"
RES2=$(echo "$RESP" | jq -r '.reservation.id // empty'); ROOM2=$(echo "$RESP" | jq -r '.roomId // empty')
[ "$CODE" = "201" ] && [ -n "$RES2" ] && ok "두 번째 예약 요청 201" || bad "두 번째 요청 CODE=$CODE"
[ "$ROOM2" = "$ROOM" ] && ok "같은 손님·사장님 = 같은 채팅방 재사용" || bad "roomId 다름 $ROOM2 != $ROOM"
api PUT "/reservations/$RES2/cancel" '{}' "$OWNER_TOKEN"
[ "$CODE" = "400" ] && ok "사장님이 요청 상태 취소 400 (거절로 안내)" || bad "사장님 요청 취소 CODE=$CODE"
api PUT "/reservations/$RES2/decline" '{"reason":"그날은 휴무예요"}' "$OWNER_TOKEN"
ST=$(echo "$RESP" | jq -r '.reservation.status'); OM=$(echo "$RESP" | jq -r '.reservation.ownerMessage')
[ "$CODE" = "200" ] && [ "$ST" = "declined" ] && [ "$OM" = "그날은 휴무예요" ] && ok "사장님 거절 200 (declined·사유)" || bad "거절 CODE=$CODE st=$ST om=$OM"
NDEC=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$CUST_ID' AND title='예약이 어려워요' AND message LIKE '%휴무%'")
[ "$NDEC" = "1" ] && ok "손님 알림 '예약이 어려워요' + 사유" || bad "거절 알림 n=$NDEC"
api GET "/chat/rooms/$ROOM/messages" "" "$CUST_TOKEN"
EV=$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")][-1].content | fromjson | .event')
[ "$EV" = "declined" ] && ok "거절 카드 (event=declined)" || bad "거절 카드 ev=$EV"
api PUT "/reservations/$RES2/cancel" '{}' "$CUST_TOKEN"
[ "$CODE" = "400" ] && ok "거절된 예약 취소 400" || bad "거절 후 취소 CODE=$CODE"

# ── 목록: 손님(mine) · 사장님(shop) · 제3자
api GET /reservations/mine "" "$CUST_TOKEN"
N=$(echo "$RESP" | jq -r '.items | length'); STS=$(echo "$RESP" | jq -r '[.items[].status] | sort | join(",")')
[ "$CODE" = "200" ] && [ "$N" = "2" ] && [ "$STS" = "cancelled,declined" ] && ok "내 예약 목록 2건 (cancelled, declined)" || bad "mine CODE=$CODE n=$N sts=$STS"
FIRST=$(echo "$RESP" | jq -r '.items[0].id')
[ "$FIRST" = "$RES2" ] && ok "내 예약 최신순" || bad "mine 첫 항목=$FIRST (기대 $RES2)"
no_pii "내 예약 목록"
api GET "/reservations/mine?status=declined" "" "$CUST_TOKEN"
N=$(echo "$RESP" | jq -r '.items | length')
[ "$N" = "1" ] && ok "내 예약 status 필터" || bad "mine?status n=$N"
api GET "/reservations/mine?status=hack" "" "$CUST_TOKEN"
[ "$CODE" = "400" ] && ok "잘못된 status 필터 400" || bad "status=hack CODE=$CODE"
api GET /reservations/shop "" "$OWNER_TOKEN"
N=$(echo "$RESP" | jq -r '.items | length'); CN=$(echo "$RESP" | jq -r '.items[0].customer.name'); CIDR=$(echo "$RESP" | jq -r '.items[0].customer.id')
[ "$CODE" = "200" ] && [ "$N" = "2" ] && [ "$CN" = "손님" ] && [ "$CIDR" = "$CUST_ID" ] && ok "매장 예약 목록 2건 + customer 표시명" || bad "shop CODE=$CODE n=$N cn=$CN"
no_pii "매장 예약 목록"
api GET "/reservations/shop?shopType=lesson" "" "$OWNER_TOKEN"
N=$(echo "$RESP" | jq -r '.items | length')
[ "$N" = "0" ] && ok "매장 예약 shopType 필터" || bad "shop?shopType=lesson n=$N"
api GET /reservations/shop "" "$OTHER_TOKEN"
N=$(echo "$RESP" | jq -r '.items | length')
[ "$CODE" = "200" ] && [ "$N" = "0" ] && ok "제3자 매장 예약 목록 0건" || bad "other shop CODE=$CODE n=$N"
api GET /reservations/mine "" "$OWNER_TOKEN"
N=$(echo "$RESP" | jq -r '.items | length')
[ "$N" = "0" ] && ok "사장님 본인 예약 0건" || bad "owner mine n=$N"

# ── 상세
api GET "/reservations/$RES1" "" "$OTHER_TOKEN"
[ "$CODE" = "404" ] && ok "제3자 상세 404" || bad "제3자 상세 CODE=$CODE"
api GET "/reservations/$RES1" "" "$CUST_TOKEN"
ON=$(echo "$RESP" | jq -r '.owner.name'); CN=$(echo "$RESP" | jq -r '.customer.name'); ST=$(echo "$RESP" | jq -r '.status')
[ "$CODE" = "200" ] && [ "$ON" = "예약사장" ] && [ "$CN" = "손님" ] && [ "$ST" = "cancelled" ] && ok "손님 상세 200 (owner·customer 표시명)" || bad "상세 CODE=$CODE on=$ON cn=$CN st=$ST"
no_pii "예약 상세"
api GET "/reservations/$RES1" "" "$OWNER_TOKEN"
[ "$CODE" = "200" ] && ok "사장님 상세 200" || bad "사장님 상세 CODE=$CODE"
api GET "/reservations/$RES1" "" "$ADM_TOKEN"
[ "$CODE" = "200" ] && ok "관리자 상세 200" || bad "관리자 상세 CODE=$CODE"
api GET "/reservations/not-a-uuid" "" "$CUST_TOKEN"
[ "$CODE" = "400" ] && ok "잘못된 id 형식 400" || bad "bad id CODE=$CODE"
api GET "/reservations/00000000-0000-4000-8000-000000000000" "" "$CUST_TOKEN"
[ "$CODE" = "404" ] && ok "없는 예약 404" || bad "없는 예약 CODE=$CODE"

# ── 레슨 예약 (기간 + 수준)
DATE2=$(date -v+8d +%F 2>/dev/null || date -d '+8 days' +%F)
api POST /reservations "{\"shopType\":\"lesson\",\"shopId\":\"$LESSON\",\"date\":\"$DATE\",\"endDate\":\"$DATE2\",\"adults\":1,\"details\":{\"level\":\"초급\",\"lessonType\":\"스키\"}}" "$CUST_TOKEN"
RES3=$(echo "$RESP" | jq -r '.reservation.id // empty'); LV=$(echo "$RESP" | jq -r '.reservation.details.level'); ED=$(echo "$RESP" | jq -r '.reservation.endDate')
[ "$CODE" = "201" ] && [ -n "$RES3" ] && [ "$LV" = "초급" ] && [ "$ED" = "$DATE2" ] && ok "레슨 예약 요청 201 (endDate·level)" || bad "레슨 예약 CODE=$CODE lv=$LV ed=$ED RESP=$(echo $RESP|head -c 160)"
NREQ2=$(pq "SELECT count(*) FROM notifications WHERE \"userId\"='$OWNER_ID' AND title='손님님의 예약 요청' AND message LIKE '%S19레슨%~%'")
[ "$NREQ2" = "1" ] && ok "레슨 알림 본문에 기간(~) 표기" || bad "레슨 알림 n=$NREQ2"
api GET "/reservations/shop?status=requested" "" "$OWNER_TOKEN"
N=$(echo "$RESP" | jq -r '.items | length'); F=$(echo "$RESP" | jq -r '.items[0].id')
[ "$N" = "1" ] && [ "$F" = "$RES3" ] && ok "매장 예약 status=requested 필터 1건" || bad "shop?status=requested n=$N"
api GET /reservations/shop "" "$OWNER_TOKEN"
F=$(echo "$RESP" | jq -r '.items[0].status')
[ "$F" = "requested" ] && ok "매장 예약 목록 requested 우선 정렬" || bad "shop 첫 status=$F"

# ── 차단 관계면 예약 불가 (403)
api POST "/blocks/$CUST_ID" "" "$OWNER_TOKEN"
if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
  api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$DATE\",\"adults\":1}" "$CUST_TOKEN"
  [ "$CODE" = "403" ] && ok "차단 관계 예약 403" || bad "차단 예약 CODE=$CODE"
  api DELETE "/blocks/$CUST_ID" "" "$OWNER_TOKEN"
else
  bad "차단 생성 CODE=$CODE"
fi

# ── 문자·메일 알림 (2026-09-21, ALERT_DRY_RUN=1 이라 실제 발송 없이 alert_logs 에 dry 로 기록)
OWNER19_ID=$(pq "SELECT id FROM users WHERE email='rv_owner@s19.test'"); CUST19_ID=$(pq "SELECT id FROM users WHERE email='rv_cust@s19.test'")
NS=$(pq "SELECT count(*) FROM alert_logs WHERE \"userId\"='$OWNER19_ID' AND channel='sms' AND kind='reservation_request' AND status='dry'")
[ "$NS" -ge 1 ] && ok "예약 요청 → 사장님 문자 알림 기록(dry)" || bad "사장님 문자 기록=$NS"
NE=$(pq "SELECT count(*) FROM alert_logs WHERE \"userId\"='$OWNER19_ID' AND channel='email' AND kind='reservation_request' AND status='dry'")
[ "$NE" -ge 1 ] && ok "예약 요청 → 사장님 메일 알림 기록(dry)" || bad "사장님 메일 기록=$NE"
NC=$(pq "SELECT count(*) FROM alert_logs WHERE \"userId\"='$CUST19_ID' AND kind='reservation_result' AND status='dry'")
[ "$NC" -ge 1 ] && ok "예약 확정·거절 → 손님 알림 기록(dry)" || bad "손님 알림 기록=$NC"
NA=$(pq "SELECT count(*) FROM alert_logs WHERE \"userId\"='$OWNER19_ID' AND kind='approval' AND status='dry'")
[ "$NA" -ge 1 ] && ok "매장 승인 → 사장님 알림 기록(dry)" || bad "승인 알림 기록=$NA"
LEAK=$(pq "SELECT count(*) FROM alert_logs WHERE text LIKE '%rv_cust@s19.test%'")
[ "$LEAK" = "0" ] && ok "알림 문구에 상대 이메일 없음" || bad "알림 문구 이메일 노출 $LEAK"
# 문자 끄면 기록도 skipped 로
api PUT /auth/alert-settings '{"smsAlerts":false}' "$OWNER_TOKEN"; expect 200 "사장님 문자 알림 끔"

# ── 레슨 리뷰 문구 (2026-09-22): 레슨은 '매장' 이 아니라 '레슨' 으로 안내
api POST /shop-reviews "{\"shopType\":\"lesson\",\"shopId\":\"$LESSON\",\"rating\":5,\"content\":\"내 레슨 최고예요\"}" "$OWNER_TOKEN"
[ "$CODE" = "400" ] && echo "$RESP" | grep -q "본인 레슨에는" && ok "강사 본인 레슨 리뷰 차단 (레슨 문구)" || bad "본인 레슨 리뷰 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST /shop-reviews "{\"shopType\":\"lesson\",\"shopId\":\"$LESSON\",\"rating\":5,\"content\":\"설명이 쉽고 친절했어요\"}" "$OTHER_TOKEN"
[ "$CODE" = "201" ] && ok "레슨 리뷰 등록 201" || bad "레슨 리뷰 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api POST /shop-reviews "{\"shopType\":\"lesson\",\"shopId\":\"$LESSON\",\"rating\":4,\"content\":\"두 번째 레슨 리뷰\"}" "$OTHER_TOKEN"
[ "$CODE" = "409" ] && echo "$RESP" | grep -q "이 레슨에" && ok "레슨 리뷰 1인 1회 (레슨 문구)" || bad "레슨 중복 리뷰 CODE=$CODE RESP=$(echo $RESP|head -c 100)"

# ── 끝난 예약 기록 정리 (2026-09-22): 요청 대기 400, 남 403, 손님 200(손님 목록만 제외·사장 목록 유지), 사장 200
api DELETE "/reservations/$RES3" "" "$CUST_TOKEN"
[ "$CODE" = "400" ] && ok "요청 대기 예약은 정리 불가 400" || bad "대기 예약 정리 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api DELETE "/reservations/$RES1" "" "$OTHER_TOKEN"
[ "$CODE" = "403" ] && ok "남의 예약 정리 403" || bad "남 예약 정리 CODE=$CODE"
api DELETE "/reservations/$RES1" "" "$CUST_TOKEN"
[ "$CODE" = "200" ] && ok "취소된 예약 손님 정리 200" || bad "손님 정리 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
api GET /reservations/mine "" "$CUST_TOKEN"; HN=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$RES1\")] | length")
[ "$HN" = "0" ] && ok "정리한 예약이 내 예약에서 사라짐" || bad "내 예약에 남음 n=$HN"
api GET /reservations/shop "" "$OWNER_TOKEN"; ON=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$RES1\")] | length")
[ "$ON" = "1" ] && ok "사장님 목록에는 그대로 유지" || bad "사장 목록에서 사라짐 n=$ON"
api DELETE "/reservations/$RES1" "" "$OWNER_TOKEN"
[ "$CODE" = "200" ] && ok "사장님도 정리 200" || bad "사장 정리 CODE=$CODE"
api GET /reservations/shop "" "$OWNER_TOKEN"; ON=$(echo "$RESP" | jq -r "[.items[] | select(.id==\"$RES1\")] | length")
[ "$ON" = "0" ] && ok "사장님 목록에서도 사라짐" || bad "사장 목록에 남음 n=$ON"
api DELETE "/reservations/$RES2" "" "$OWNER_TOKEN"
[ "$CODE" = "200" ] && ok "거절된 예약 정리 200" || bad "거절 예약 정리 CODE=$CODE"

# ── 정비샵 방문 예약 (2026-09-22): 장비·수량·정비 항목(options) details, 모르는 키 제거, 사장님 목록·확정
api POST /reservations "{\"shopType\":\"repair\",\"shopId\":\"$REPAIR\",\"date\":\"$DATE\",\"time\":\"14:00\",\"adults\":1,\"details\":{\"equipment\":\"스키\",\"qty\":2,\"options\":[\"왁싱\",\"엣지 정비\"],\"hack\":\"x\"},\"note\":\"엣지가 많이 상했어요\"}" "$CUST_TOKEN"
RES4=$(echo "$RESP" | jq -r '.reservation.id // empty'); EQ=$(echo "$RESP" | jq -r '.reservation.details.equipment'); QT=$(echo "$RESP" | jq -r '.reservation.details.qty'); OPN=$(echo "$RESP" | jq -r '.reservation.details.options | length'); HK=$(echo "$RESP" | jq -r '.reservation.details.hack // "none"')
[ "$CODE" = "201" ] && [ -n "$RES4" ] && [ "$EQ" = "스키" ] && [ "$QT" = "2" ] && [ "$OPN" = "2" ] && [ "$HK" = "none" ] && ok "정비샵 예약 201 (장비·수량·정비 항목, 모르는 키 제거)" || bad "정비샵 예약 CODE=$CODE eq=$EQ qty=$QT opts=$OPN hack=$HK RESP=$(echo $RESP|head -c 160)"
api GET "/reservations/shop?shopType=repair" "" "$OWNER_TOKEN"; RN=$(echo "$RESP" | jq -r '.items | length')
[ "$RN" = "1" ] && ok "사장님 정비샵 예약 목록 1건" || bad "정비 예약 목록 n=$RN"
api PUT "/reservations/$RES4/confirm" '{"message":"내일 오전에 찾아가세요"}' "$OWNER_TOKEN"
[ "$CODE" = "200" ] && ok "정비샵 예약 확정 200" || bad "정비 예약 확정 CODE=$CODE RESP=$(echo $RESP|head -c 100)"
NC=$(pq "SELECT count(*) FROM messages WHERE type='reservation' AND content LIKE '%\"shopType\":\"repair\"%'")
[ "$NC" -ge 2 ] && ok "정비샵 예약 카드가 채팅에 (요청·확정)" || bad "정비 예약 카드 n=$NC"

echo "----- STEP19: PASS=$PASS FAIL=$FAIL -----"
