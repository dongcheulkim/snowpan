#!/bin/bash
# STEP 25: 매장 직원 공동 응대 채팅 (2026-09-24) — 매장 문의·예약으로 연결된 방만 직원이 사장님 자리에서 보고 답한다.
# 사장님 개인 대화·연결 이전 메시지는 직원에게 안 보임, 손님 메시지 알림은 사장님+직원, 직원이 읽으면 사장님 쪽 읽음 공유, 해제 후 접근 불가.
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
E2E_DIR="$(cd "$(dirname "$0")" && pwd)"
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
send() { node "$E2E_DIR/chatsend.js" "$1" "$2" "$3"; } # token roomId content → sent / room_error
notif_count() { api GET "/notifications" "" "$1"; echo "$RESP" | jq -r "[.notifications[] | select(.title==\"$2\")] | length"; }

echo "===== STEP 25: 매장 직원 공동 응대 채팅 ====="
OWNER=$(register_verified "01099990251" "cs_owner@s25.test" "응대사장" "응대사장"); [ -z "$OWNER" ] && OWNER=$(login "cs_owner@s25.test" 'Re!pass1234')
STAFF=$(register_verified "01099990252" "cs_staff@s25.test" "응대직원" "응대직원"); [ -z "$STAFF" ] && STAFF=$(login "cs_staff@s25.test" 'Re!pass1234')
CUST=$(register_verified "01099990253" "cs_cust@s25.test" "응대손님" "응대손님"); [ -z "$CUST" ] && CUST=$(login "cs_cust@s25.test" 'Re!pass1234')
FRIEND=$(register_verified "01099990254" "cs_friend@s25.test" "응대지인" "응대지인"); [ -z "$FRIEND" ] && FRIEND=$(login "cs_friend@s25.test" 'Re!pass1234')
ADM=$(register_verified "01099990255" "cs_admin@s25.test" "응대관리자" "응대관리자")
pq "UPDATE users SET role='admin' WHERE email='cs_admin@s25.test'" >/dev/null
ADM=$(login "cs_admin@s25.test" 'Re!pass1234')
OWNER_ID=$(pq "SELECT id FROM users WHERE email='cs_owner@s25.test'"); STAFF_ID=$(pq "SELECT id FROM users WHERE email='cs_staff@s25.test'")
CUST_ID=$(pq "SELECT id FROM users WHERE email='cs_cust@s25.test'"); FRIEND_ID=$(pq "SELECT id FROM users WHERE email='cs_friend@s25.test'")
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$CUST" ] && [ -n "$FRIEND" ] && [ -n "$ADM" ] && [ -n "$OWNER_ID" ] && ok "유저 5명 준비" || bad "유저 준비 실패"
# 같은 DB 로 다시 돌릴 때 이전 실행의 방·알림·예약·직원 정리
IDS="'$OWNER_ID','$STAFF_ID','$CUST_ID','$FRIEND_ID'"
pq "DELETE FROM messages WHERE \"roomId\" IN (SELECT id FROM chat_rooms WHERE \"user1Id\" IN ($IDS) OR \"user2Id\" IN ($IDS))" >/dev/null
pq "DELETE FROM chat_rooms WHERE \"user1Id\" IN ($IDS) OR \"user2Id\" IN ($IDS)" >/dev/null
pq "DELETE FROM notifications WHERE \"userId\" IN ($IDS)" >/dev/null
pq "DELETE FROM reservations WHERE \"customerId\" IN ($IDS)" >/dev/null
pq "DELETE FROM shop_staff WHERE \"userId\" IN ($IDS)" >/dev/null

# ── 렌탈 등록·승인
api POST /rentals '{"name":"S25렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; RENTAL=$(echo "$RESP" | jq -r '.id // empty')
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && [ -n "$RENTAL" ] && ok "렌탈 등록·승인" || bad "렌탈 CODE=$CODE"

# ── 사장님 개인 대화(지인) + 손님이 연결 전에 보낸 개인 메시지
api POST /chat/rooms "{\"targetUserId\":\"$OWNER_ID\"}" "$FRIEND"; DM=$(echo "$RESP" | jq -r '.id // empty')
[ "$(send "$FRIEND" "$DM" "사장님 개인 메시지")" = "sent" ] && [ -n "$DM" ] && ok "지인↔사장님 개인 방 + 메시지" || bad "개인 방 실패 DM=$DM"
api POST /chat/rooms "{\"targetUserId\":\"$OWNER_ID\"}" "$CUST"; ROOM=$(echo "$RESP" | jq -r '.id // empty')
[ "$(send "$CUST" "$ROOM" "연결 전 메시지")" = "sent" ] && [ -n "$ROOM" ] && ok "손님↔사장님 방 + 연결 전 메시지" || bad "손님 방 실패 ROOM=$ROOM"

# ── 직원 초대·참여
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty')
api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"; [ "$CODE" = "201" ] && ok "직원 참여" || bad "직원 참여 CODE=$CODE"

# ── 아직 연결된 방 없음 → 직원 목록 비어 있고 접근 불가
api GET /chat/rooms "" "$STAFF"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq 'length')" = "0" ] && ok "연결 전엔 직원 채팅 목록 비어 있음" || bad "연결 전 목록 CODE=$CODE n=$(echo "$RESP" | jq 'length')"
api GET "/chat/rooms/$ROOM/messages" "" "$STAFF"; [ "$CODE" = "403" ] && ok "연결 전 방 메시지 403" || bad "연결 전 메시지 CODE=$CODE"

# ── 손님이 매장 페이지에서 '채팅 문의' → 같은 방이 매장에 연결됨
api POST /chat/rooms "{\"targetUserId\":\"$OWNER_ID\",\"productName\":\"S25렌탈\",\"productPath\":\"/rental/$RENTAL\"}" "$CUST"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.id')" = "$ROOM" ] && [ "$(pq "SELECT count(*) FROM chat_room_shops WHERE \"roomId\"='$ROOM' AND \"shopId\"='$RENTAL'")" = "1" ] && ok "매장 문의로 방이 매장에 연결됨 (같은 방)" || bad "연결 CODE=$CODE id=$(echo "$RESP" | jq -r '.id') links=$(pq "SELECT count(*) FROM chat_room_shops WHERE \"roomId\"='$ROOM'")"
[ "$(send "$CUST" "$ROOM" "장비 문의드려요")" = "sent" ] && ok "손님 문의 메시지 전송" || bad "손님 문의 전송 실패"
[ "$(notif_count "$STAFF" "응대손님님의 메시지")" = "1" ] && [ "$(notif_count "$OWNER" "응대손님님의 메시지")" -ge 1 ] && ok "손님 메시지 알림: 사장님 + 직원" || bad "알림 staff=$(notif_count "$STAFF" "응대손님님의 메시지") owner=$(notif_count "$OWNER" "응대손님님의 메시지")"

# ── 직원 목록·상세·메시지
api GET /chat/rooms "" "$STAFF"
N=$(echo "$RESP" | jq 'length'); OID=$(echo "$RESP" | jq -r '.[0].otherUser.id'); SN=$(echo "$RESP" | jq -r '.[0].shop.name'); VR=$(echo "$RESP" | jq -r '.[0].viewerRole'); UC=$(echo "$RESP" | jq -r '.[0].unreadCount'); HAS_DM=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$DM\")] | length")
[ "$N" = "1" ] && [ "$OID" = "$CUST_ID" ] && [ "$SN" = "S25렌탈" ] && [ "$VR" = "shop" ] && [ "$UC" = "2" ] && [ "$HAS_DM" = "0" ] && ok "직원 목록: 매장 방 1개 (상대=손님, 매장명, 매장 쪽, 안읽음 2=카드+문의), 개인 방 없음" || bad "직원 목록 n=$N other=$OID shop=$SN role=$VR unread=$UC dm=$HAS_DM"
api GET "/chat/rooms/$ROOM" "" "$STAFF"
SI=$(echo "$RESP" | jq -r ".sideIds | index(\"$OWNER_ID\") != null and index(\"$STAFF_ID\") != null"); LO=$(echo "$RESP" | jq -r ".sideLabels[\"$OWNER_ID\"]"); LS=$(echo "$RESP" | jq -r ".sideLabels[\"$STAFF_ID\"]"); OU=$(echo "$RESP" | jq -r '.otherUser.id'); MS=$(echo "$RESP" | jq -r '.mySide'); U1=$(echo "$RESP" | jq -r '.user1Id')
EXP_SIDE=1; [ "$U1" != "$OWNER_ID" ] && EXP_SIDE=2
[ "$CODE" = "200" ] && [ "$SI" = "true" ] && [ "$LO" = "사장님" ] && [ "$LS" = "직원" ] && [ "$OU" = "$CUST_ID" ] && [ "$MS" = "$EXP_SIDE" ] && ok "직원 방 상세: 내 쪽=사장님+직원, 라벨, 상대=손님, 자리=사장님 쪽" || bad "직원 상세 CODE=$CODE sideIds=$SI lo=$LO ls=$LS other=$OU side=$MS/$EXP_SIDE"
api GET "/chat/rooms/$ROOM/messages" "" "$STAFF"
[ "$CODE" = "200" ] && echo "$RESP" | grep -q "장비 문의드려요" && ! echo "$RESP" | grep -q "연결 전 메시지" && ok "직원 메시지: 연결 이후만 (연결 전 메시지 안 보임)" || bad "직원 메시지 CODE=$CODE has_pre=$(echo "$RESP" | grep -c '연결 전 메시지')"
api GET "/chat/rooms/$DM" "" "$STAFF"; C1=$CODE; api GET "/chat/rooms/$DM/messages" "" "$STAFF"
[ "$C1" = "404" ] && [ "$CODE" = "403" ] && ok "사장님 개인 방은 직원 접근 불가 (404/403)" || bad "개인 방 접근 $C1/$CODE"

# ── 손님 화면: 상대는 사장님, 라벨은 보이고 내 쪽 목록은 비어 있음
api GET "/chat/rooms/$ROOM" "" "$CUST"
[ "$(echo "$RESP" | jq -r '.viewerRole')" = "customer" ] && [ "$(echo "$RESP" | jq -r '.sideIds | length')" = "0" ] && [ "$(echo "$RESP" | jq -r ".sideLabels[\"$STAFF_ID\"]")" = "직원" ] && [ "$(echo "$RESP" | jq -r '.otherUser.id')" = "$OWNER_ID" ] && ok "손님 방 상세: 손님 역할, 직원 라벨, 상대=사장님" || bad "손님 상세 $(echo "$RESP" | jq -c '{viewerRole,sideIds,sideLabels}')"

# ── 직원 답장 → 손님에게 알림, 사장님에겐 알림 없음
[ "$(send "$STAFF" "$ROOM" "직원 답변입니다")" = "sent" ] && ok "직원 답장 전송" || bad "직원 답장 실패"
api GET "/chat/rooms/$ROOM/messages" "" "$CUST"
[ "$(echo "$RESP" | jq -r "[.[] | select(.content==\"직원 답변입니다\")][0].senderId")" = "$STAFF_ID" ] && ok "손님 메시지 목록에 직원 답변 (직원 명의)" || bad "손님 목록에 직원 답변 없음"
[ "$(notif_count "$CUST" "응대직원님의 메시지")" = "1" ] && [ "$(notif_count "$OWNER" "응대직원님의 메시지")" = "0" ] && ok "직원 답변 알림: 손님만" || bad "직원 답변 알림 cust=$(notif_count "$CUST" "응대직원님의 메시지") owner=$(notif_count "$OWNER" "응대직원님의 메시지")"

# ── 안읽음: 사장님 3(연결 전 1 + 카드 + 문의, 직원 답변은 제외) → 직원이 읽으면 사장님 쪽도 0
api GET /chat/rooms "" "$OWNER"; OU=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$ROOM\")][0].unreadCount")
[ "$OU" = "3" ] && ok "사장님 안읽음 3 (직원 답변은 내 쪽이라 제외)" || bad "사장님 안읽음=$OU"
api PUT "/chat/rooms/$ROOM/read" "" "$STAFF"; [ "$CODE" = "200" ] && ok "직원 읽음 처리" || bad "직원 읽음 CODE=$CODE"
api GET /chat/rooms "" "$OWNER"; OU=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$ROOM\")][0].unreadCount")
[ "$OU" = "0" ] && ok "직원이 읽으면 사장님 안읽음도 0 (매장 쪽 공용)" || bad "읽음 후 사장님 안읽음=$OU"
api GET /chat/rooms "" "$CUST"; CU=$(echo "$RESP" | jq -r "[.[] | select(.id==\"$ROOM\")][0].unreadCount")
[ "$CU" = "1" ] && ok "손님 안읽음 1 (직원 답변)" || bad "손님 안읽음=$CU"

# ── 사장님 현황: 직원도 매장 문의 안읽음을 본다
[ "$(send "$CUST" "$ROOM" "하나 더요")" = "sent" ] || bad "추가 문의 전송 실패"
api GET /owner/summary "" "$STAFF"; SU=$(echo "$RESP" | jq -r '.todo.unreadChats')
api GET /owner/summary "" "$OWNER"; OWU=$(echo "$RESP" | jq -r '.todo.unreadChats')
[ "$SU" = "1" ] && [ "$OWU" = "2" ] && ok "현황 안읽은 문의: 직원 1 (매장 방), 사장님 2 (매장 방 1 + 개인 방 1)" || bad "현황 unread staff=$SU owner=$OWU"

# ── 직원은 방 삭제(숨김) 불가
api DELETE "/chat/rooms/$ROOM" "" "$STAFF"; [ "$CODE" = "404" ] && ok "직원은 대화 삭제 불가" || bad "직원 삭제 CODE=$CODE"

# ── 예약으로 연결된 방: 지인이 예약 → 개인 방이 매장에 연결되지만 직원은 예약 이후만 본다
D3=$(date -v+3d +%F 2>/dev/null || date -d '+3 days' +%F)
api POST /reservations "{\"shopType\":\"rental\",\"shopId\":\"$RENTAL\",\"date\":\"$D3\",\"time\":\"10:00\",\"adults\":1}" "$FRIEND"
[ "$CODE" = "201" ] && [ "$(echo "$RESP" | jq -r '.roomId')" = "$DM" ] && ok "지인 예약 → 기존 개인 방에 카드" || bad "예약 CODE=$CODE room=$(echo "$RESP" | jq -r '.roomId')"
api GET "/chat/rooms/$DM/messages" "" "$STAFF"
[ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '[.[] | select(.type=="reservation")] | length')" = "1" ] && ! echo "$RESP" | grep -q "사장님 개인 메시지" && ok "예약으로 연결된 방: 직원은 예약 카드부터만 봄" || bad "예약 방 직원 메시지 CODE=$CODE n=$(echo "$RESP" | jq 'length')"
api GET "/chat/rooms/$DM" "" "$STAFF"; [ "$(echo "$RESP" | jq -r '.shop.name')" = "S25렌탈" ] && [ "$(echo "$RESP" | jq -r '.otherUser.id')" = "$FRIEND_ID" ] && ok "예약 방 상세: 매장명·상대=예약 손님" || bad "예약 방 상세 $(echo "$RESP" | jq -c '{shop,otherUser}')"
# 같은 손님·사장님 방에 두 번째 매장(정비샵) 예약 → 연결 2개, 대표 매장은 가장 최근 연결
api POST /repair-shops "{\"name\":\"S25정비\",\"area\":\"강원\",\"address\":\"평창\",\"description\":\"d\",\"businessLicense\":\"/uploads/e2e.jpg\"}" "$OWNER"; RS=$(echo "$RESP" | jq -r '.id // empty'); pq "UPDATE repair_shops SET approved=true WHERE id='$RS'" >/dev/null
api POST /reservations "{\"shopType\":\"repair\",\"shopId\":\"$RS\",\"date\":\"$D3\",\"adults\":1}" "$FRIEND"
api GET "/chat/rooms/$DM" "" "$OWNER"; [ "$(echo "$RESP" | jq -r '.shops | length')" = "2" ] && [ "$(echo "$RESP" | jq -r '.shop.name')" = "S25정비" ] && ok "연결 2개면 대표 매장은 최근 연결(S25정비)" || bad "대표 매장 $(echo "$RESP" | jq -c '{n: (.shops|length), shop}')"
# 정비샵을 지우면 그 연결·직원·찜 행도 같이 사라지고 대표 매장은 렌탈로 돌아간다
api DELETE "/repair-shops/$RS" "" "$OWNER"; sleep 1
api GET "/chat/rooms/$DM" "" "$OWNER"; [ "$(echo "$RESP" | jq -r '.shops | length')" = "1" ] && [ "$(echo "$RESP" | jq -r '.shop.name')" = "S25렌탈" ] && [ "$(pq "SELECT count(*) FROM chat_room_shops WHERE \"shopId\"='$RS'")" = "0" ] && ok "매장 삭제 → 채팅 연결 정리, 대표 매장 복귀" || bad "삭제 후 $(echo "$RESP" | jq -c '{n: (.shops|length), shop}') links=$(pq "SELECT count(*) FROM chat_room_shops WHERE \"shopId\"='$RS'")"

# ── 매장 사장님이 아닌 상대와의 방에 매장 경로를 붙여도 연결 안 됨
api POST /chat/rooms "{\"targetUserId\":\"$FRIEND_ID\",\"productName\":\"S25렌탈\",\"productPath\":\"/rental/$RENTAL\"}" "$CUST"; X=$(echo "$RESP" | jq -r '.id // empty')
[ -n "$X" ] && [ "$(pq "SELECT count(*) FROM chat_room_shops WHERE \"roomId\"='$X'")" = "0" ] && ok "상대가 그 매장 사장님이 아니면 연결 안 됨" || bad "엉뚱한 연결 X=$X links=$(pq "SELECT count(*) FROM chat_room_shops WHERE \"roomId\"='$X'")"

# ── 직원 해제 → 접근 불가
api DELETE "/shop-staff/shops/rental/$RENTAL/staff/$STAFF_ID" "" "$OWNER"; [ "$CODE" = "200" ] && ok "직원 해제" || bad "해제 CODE=$CODE"
api GET "/chat/rooms/$ROOM" "" "$STAFF"; C1=$CODE; api GET /chat/rooms "" "$STAFF"; N=$(echo "$RESP" | jq 'length')
[ "$C1" = "404" ] && [ "$N" = "0" ] && ok "해제 후 매장 방 접근 불가·목록 비움" || bad "해제 후 CODE=$C1 n=$N"
echo "----- STEP25: PASS=$PASS FAIL=$FAIL -----"
