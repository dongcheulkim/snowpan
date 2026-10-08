#!/bin/bash
# STEP 40: 앱 로그인 유지 (2026-10-08) — refresh 90일, 응답 유실 뒤 옛 토큰 1회 재사용 허용, 세 번째는 도난으로 차단
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
post() { curl -s -m 20 -H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json' -X POST "$BASE$1" -d "$2"; }
exp_days() { python3 -c "import sys,json,base64,time; p=sys.argv[1].split('.')[1]; p+='='*(-len(p)%4); d=json.loads(base64.urlsafe_b64decode(p)); print(round((d['exp']-d['iat'])/86400))" "$1"; }
echo "===== STEP 40: 앱 로그인 유지 ====="
U=$(register_verified "01099990401" "rt_user@s40.test" "로그인유지40" "로그인유지40"); [ -n "$U" ] || U=$(login "rt_user@s40.test" 'Re!pass1234')
[ -n "$U" ] && ok "준비" || bad "준비 실패"

# 앱 채널(platform=app) 로그인 → body 에 refreshToken
L=$(post /auth/login '{"email":"rt_user@s40.test","password":"Re!pass1234","platform":"app","remember":true}')
RT0=$(echo "$L" | jq -r '.refreshToken // empty'); [ -n "$RT0" ] && ok "앱 로그인에 refreshToken 반환" || bad "앱 refreshToken 없음 $(echo "$L" | head -c 150)"
D=$(exp_days "$RT0"); [ "$D" = "90" ] && ok "자동 로그인 refresh 수명 90일" || bad "refresh 수명=$D 일"
LS=$(post /auth/login '{"email":"rt_user@s40.test","password":"Re!pass1234","platform":"app","remember":false}')
D2=$(exp_days "$(echo "$LS" | jq -r '.refreshToken')"); [ "$D2" = "14" ] && ok "자동 로그인 미선택은 14일" || bad "미선택 수명=$D2 일"

# 정상 회전: RT0 → RT1
R=$(post /auth/refresh "{\"refreshToken\":\"$RT0\"}"); RT1=$(echo "$R" | jq -r '.refreshToken // empty'); [ -n "$RT1" ] && [ "$RT1" != "$RT0" ] && ok "회전: 새 refresh 발급" || bad "회전 실패 $(echo "$R" | head -c 120)"
[ "$(exp_days "$RT1")" = "90" ] && ok "회전된 토큰도 90일 (쓰는 동안 계속 연장)" || bad "회전 토큰 수명=$(exp_days "$RT1")"
# 응답 유실 시나리오: 앱은 RT1 을 못 받고 RT0 으로 다시 시도 → 허용돼야 함
R=$(post /auth/refresh "{\"refreshToken\":\"$RT0\"}"); RT2=$(echo "$R" | jq -r '.refreshToken // empty'); [ -n "$RT2" ] && ok "응답 유실 뒤 직전 토큰 1회 재사용 허용 (로그아웃 안 됨)" || bad "직전 토큰 재사용 거절 $(echo "$R" | head -c 120)"
# 세 번째 RT0 사용 = 도난 → family 전체 차단
C=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json' -X POST "$BASE/auth/refresh" -d "{\"refreshToken\":\"$RT0\"}"); [ "$C" = "401" ] && ok "같은 옛 토큰 세 번째 사용은 401 (도난 감지)" || bad "세 번째 사용 CODE=$C"
C=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json' -X POST "$BASE/auth/refresh" -d "{\"refreshToken\":\"$RT2\"}"); [ "$C" = "401" ] && ok "도난 감지 뒤 최신 토큰도 차단 (family 무효화)" || bad "family 무효화 안 됨 CODE=$C"

# 새 로그인은 정상 (다른 family)
L=$(post /auth/login '{"email":"rt_user@s40.test","password":"Re!pass1234","platform":"app"}'); RTA=$(echo "$L" | jq -r '.refreshToken // empty')
R=$(post /auth/refresh "{\"refreshToken\":\"$RTA\"}"); [ -n "$(echo "$R" | jq -r '.token // empty')" ] && ok "새 로그인 family 는 정상 회전" || bad "새 family 회전 실패"
# 로그아웃하면 그 토큰은 바로 폐기
post /auth/logout "{\"refreshToken\":\"$(echo "$R" | jq -r '.refreshToken')\"}" >/dev/null
C=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -H 'X-Loadtest-Key: e2e-local-bypass' -H 'Content-Type: application/json' -X POST "$BASE/auth/refresh" -d "{\"refreshToken\":\"$(echo "$R" | jq -r '.refreshToken')\"}"); [ "$C" = "401" ] && ok "로그아웃 뒤 refresh 401" || bad "로그아웃 뒤 CODE=$C"
echo "----- STEP 40 결과: PASS=$PASS FAIL=$FAIL -----"
[ "$FAIL" = "0" ]
