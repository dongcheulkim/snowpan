#!/bin/bash
# STEP 30: 답장 속도 (2026-09-24) — 매장 연결 방의 손님 문의 → 매장 쪽 첫 답장까지 중앙값·24시간 안 답장률. 묶음 3개 미만이면 라벨 없음. 관리자 즉시 갱신.
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
# 메시지를 지정 시각으로 넣기 (분 단위 과거) — msg <room> <sender> <minutes_ago> <text>
# createdAt 은 시간대 없는 timestamp 에 UTC 값이 들어가므로(Prisma 방식) now() AT TIME ZONE 'UTC' 로 넣는다
msg() { pq "INSERT INTO messages (id, content, type, \"roomId\", \"senderId\", \"createdAt\") VALUES (gen_random_uuid()::text, '$4', 'text', '$1', '$2', (now() AT TIME ZONE 'UTC') - interval '$3 minutes')" >/dev/null; }
# 통계는 매장 연결 시점 이후 메시지만 보므로, 과거 메시지를 넣기 전에 연결 시각을 과거로 돌린다
backdate_link() { pq "UPDATE chat_room_shops SET \"createdAt\" = (now() AT TIME ZONE 'UTC') - interval '5000 minutes' WHERE \"roomId\"='$1'" >/dev/null; }
echo "===== STEP 30: 답장 속도 ====="
OWNER=$(register_verified "01099990301" "rs_owner@s30.test" "속도사장" "속도사장"); [ -z "$OWNER" ] && OWNER=$(login "rs_owner@s30.test" 'Re!pass1234')
STAFF=$(register_verified "01099990302" "rs_staff@s30.test" "속도직원" "속도직원"); [ -z "$STAFF" ] && STAFF=$(login "rs_staff@s30.test" 'Re!pass1234')
C1=$(register_verified "01099990303" "rs_c1@s30.test" "속도손님1" "속도손님1"); [ -z "$C1" ] && C1=$(login "rs_c1@s30.test" 'Re!pass1234')
C2=$(register_verified "01099990304" "rs_c2@s30.test" "속도손님2" "속도손님2"); [ -z "$C2" ] && C2=$(login "rs_c2@s30.test" 'Re!pass1234')
C3=$(register_verified "01099990306" "rs_c3@s30.test" "속도손님3" "속도손님3"); [ -z "$C3" ] && C3=$(login "rs_c3@s30.test" 'Re!pass1234')
ADM=$(register_verified "01099990305" "rs_admin@s30.test" "속도관리자" "속도관리자")
pq "UPDATE users SET role='admin' WHERE email='rs_admin@s30.test'" >/dev/null
ADM=$(login "rs_admin@s30.test" 'Re!pass1234')
OWNER_ID=$(pq "SELECT id FROM users WHERE email='rs_owner@s30.test'"); STAFF_ID=$(pq "SELECT id FROM users WHERE email='rs_staff@s30.test'")
C1_ID=$(pq "SELECT id FROM users WHERE email='rs_c1@s30.test'"); C2_ID=$(pq "SELECT id FROM users WHERE email='rs_c2@s30.test'"); C3_ID=$(pq "SELECT id FROM users WHERE email='rs_c3@s30.test'")
IDS="'$OWNER_ID','$STAFF_ID','$C1_ID','$C2_ID','$C3_ID'"
pq "DELETE FROM messages WHERE \"roomId\" IN (SELECT id FROM chat_rooms WHERE \"user1Id\" IN ($IDS) OR \"user2Id\" IN ($IDS))" >/dev/null; pq "DELETE FROM chat_rooms WHERE \"user1Id\" IN ($IDS) OR \"user2Id\" IN ($IDS)" >/dev/null
[ -n "$OWNER" ] && [ -n "$STAFF" ] && [ -n "$C1" ] && [ -n "$C2" ] && [ -n "$C3" ] && [ -n "$ADM" ] && ok "유저 6명 준비" || bad "유저 준비 실패"
api POST /rentals '{"name":"S30렌탈","area":"용평","businessLicense":"/uploads/e2e.jpg","priceSkiSet":30000}' "$OWNER"; RENTAL=$(echo "$RESP" | jq -r '.id // empty')
api PUT "/admin/rentals/$RENTAL/approve" "{}" "$ADM"; [ "$CODE" = "200" ] && ok "렌탈 등록·승인" || bad "렌탈 CODE=$CODE"
api POST "/shop-staff/shops/rental/$RENTAL/invites" "" "$OWNER"; INV=$(echo "$RESP" | jq -r '.code // empty'); api POST "/shop-staff/invites/$INV/accept" "" "$STAFF"

# 통계 전: 라벨 없음
api GET "/shop-stats/response/rental/$RENTAL" ""; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.label')" = "null" ] && [ "$(echo "$RESP" | jq -r '.sampleCount')" = "0" ] && ok "문의 없으면 라벨 없음" || bad "초기 CODE=$CODE RESP=$RESP"

# 손님1: 문의(120분 전) → 사장님 답(90분 전) = 30분 | 손님2: 문의(3000분 전) → 답 없음(24h 넘음) = 미답장
api POST /chat/rooms "{\"targetUserId\":\"$OWNER_ID\",\"productName\":\"S30렌탈\",\"productPath\":\"/rental/$RENTAL\"}" "$C1"; R1=$(echo "$RESP" | jq -r '.id')
api POST /chat/rooms "{\"targetUserId\":\"$OWNER_ID\",\"productName\":\"S30렌탈\",\"productPath\":\"/rental/$RENTAL\"}" "$C2"; R2=$(echo "$RESP" | jq -r '.id')
pq "DELETE FROM messages WHERE \"roomId\" IN ('$R1','$R2')" >/dev/null
backdate_link "$R1"; backdate_link "$R2"
msg "$R1" "$C1_ID" 120 "장비 문의요"; msg "$R1" "$C1_ID" 115 "하나 더요"; msg "$R1" "$OWNER_ID" 90 "네 가능해요"
msg "$R2" "$C2_ID" 3000 "예약 되나요"
api POST /admin/jobs/response-stats "{}" "$ADM"; [ "$CODE" = "200" ] && [ "$(echo "$RESP" | jq -r '.shops')" -ge 1 ] && ok "즉시 갱신 실행" || bad "갱신 CODE=$CODE RESP=$RESP"
api GET "/shop-stats/response/rental/$RENTAL" ""; S=$(echo "$RESP" | jq -c '{label,medianMinutes,replyRate,sampleCount}')
[ "$(echo "$RESP" | jq -r '.sampleCount')" = "2" ] && [ "$(echo "$RESP" | jq -r '.label')" = "null" ] && ok "묶음 2개(연속 메시지는 하나로): 아직 라벨 없음" || bad "2묶음 $S"
# 손님3: 문의(60분 전) → 직원 답(50분 전) = 10분 → 묶음 3 → 중앙값 (10, 30 → 20분), 답장률 2/3=67
api POST /chat/rooms "{\"targetUserId\":\"$OWNER_ID\",\"productName\":\"S30렌탈\",\"productPath\":\"/rental/$RENTAL\"}" "$C3"; R3=$(echo "$RESP" | jq -r '.id'); pq "DELETE FROM messages WHERE \"roomId\"='$R3'" >/dev/null
backdate_link "$R3"
msg "$R3" "$C3_ID" 60 "왁싱 되나요"; msg "$R3" "$STAFF_ID" 50 "네 됩니다"
api POST /admin/jobs/response-stats "{}" "$ADM"
api GET "/shop-stats/response/rental/$RENTAL" ""; S=$(echo "$RESP" | jq -c '{label,medianMinutes,replyRate,sampleCount}')
[ "$S" = '{"label":"보통 1시간 안에 답장","medianMinutes":20,"replyRate":67,"sampleCount":3}' ] && ok "묶음 3: 중앙값 20분(직원 답장 포함) → '보통 1시간 안에 답장', 답장률 67%" || bad "3묶음 $S"
# 사장님 현황에 라벨
api GET /owner/summary "" "$OWNER"; [ "$(echo "$RESP" | jq -r "[.shops[] | select(.shopId==\"$RENTAL\")][0].response.label")" = "보통 1시간 안에 답장" ] && ok "현황에 답장 속도 라벨" || bad "현황 라벨=$(echo "$RESP" | jq -r "[.shops[] | select(.shopId==\"$RENTAL\")][0].response.label")"
# 미답장 방에 늦게 답하면 (3000분 뒤) 24h 넘긴 답 → 답장률에서 제외되지만 중앙값엔 반영
msg "$R2" "$OWNER_ID" 1 "늦어서 죄송해요"
api POST /admin/jobs/response-stats "{}" "$ADM"; api GET "/shop-stats/response/rental/$RENTAL" ""; S=$(echo "$RESP" | jq -c '{medianMinutes,replyRate,sampleCount}')
[ "$S" = '{"medianMinutes":30,"replyRate":67,"sampleCount":3}' ] && ok "늦은 답장(2999분): 중앙값 30, 24h 넘어 답장률 그대로 67" || bad "늦은 답 $S"
api GET "/shop-stats/response/rental/not-a-uuid" ""; [ "$CODE" = "400" ] && ok "잘못된 id 400" || bad "잘못된 id CODE=$CODE"
api POST /admin/jobs/response-stats "{}" "$OWNER"; [ "$CODE" = "403" ] && ok "관리자 아니면 403" || bad "비관리자 CODE=$CODE"
echo "----- STEP30: PASS=$PASS FAIL=$FAIL -----"
