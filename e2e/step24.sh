#!/bin/bash
# step24: 프록시 체인 클라이언트 IP 판별 — Cloudflare 엣지·Render 내부 홉을 건너뛰고 실제 클라이언트 IP 로
# 로그인 잠금(10회/30분)이 걸리는지. (운영은 클라이언트 → Cloudflare → Render LB → 앱 순서)
# 로컬 백엔드는 소켓 상대가 127.0.0.1(홉 0) 이고, X-Forwarded-For 로 나머지 체인을 흉내낸다.
BASE="http://localhost:4001/api"
BYPASS="X-Loadtest-Key: e2e-local-bypass"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "PASS | $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL | $1"; }
# login_xff "<X-Forwarded-For>" email password → CODE, RESP
login_xff() {
  local xff=$1 email=$2 pw=$3 out
  out=$(curl -s -m 20 -H "$BYPASS" -H 'Content-Type: application/json' -H "X-Forwarded-For: $xff" \
    -X POST "$BASE/auth/login" -d "{\"email\":\"$email\",\"password\":\"$pw\"}" -w $'\n%{http_code}')
  CODE=$(printf '%s' "$out" | tail -n1); RESP=$(printf '%s' "$out" | sed '$d')
}
STAMP=$(date +%s)
# 요청마다 바뀌는 Cloudflare 엣지 IP (공개 대역 10개)
CF=(172.71.10.1 172.68.20.2 141.101.64.3 104.16.5.4 162.158.6.5 108.162.192.6 173.245.48.7 198.41.128.8 190.93.240.9 188.114.96.10)

echo "=== step24: 프록시 체인 IP 판별 + 로그인 잠금 ==="

# A. 같은 클라이언트(203.0.113.77), 엣지 IP 는 매번 다름 → 10회 실패 모두 401, 11번째 잠금 429
E1="lock-proxy-$STAMP@e2e.test"; codes=""
for i in 0 1 2 3 4 5 6 7 8 9; do login_xff "203.0.113.77, ${CF[$i]}" "$E1" "wrong-$i"; codes="$codes$CODE "; done
[ "$codes" = "401 401 401 401 401 401 401 401 401 401 " ] && ok "엣지 IP 가 매번 바뀌는 10회 실패 모두 401" || bad "10회 실패 코드: $codes"
login_xff "203.0.113.77, 172.71.99.99" "$E1" "wrong-11"
[ "$CODE" = "429" ] && echo "$RESP" | grep -q "로그인 시도가 너무 많습니다" \
  && ok "11번째: 실제 클라이언트 IP 기준 잠금 429 (엣지 IP 무관)" || bad "11번째 CODE=$CODE RESP=$(echo "$RESP" | head -c 100)"
RA=$(curl -s -m 20 -o /dev/null -D - -H "$BYPASS" -H 'Content-Type: application/json' -H "X-Forwarded-For: 203.0.113.77, 172.71.99.98" \
  -X POST "$BASE/auth/login" -d "{\"email\":\"$E1\",\"password\":\"wrong-12\"}" | grep -i '^retry-after:' | tr -dc '0-9')
[ -n "$RA" ] && [ "$RA" -gt 0 ] && ok "잠금 응답 Retry-After 헤더 ($RA 초)" || bad "Retry-After 없음: '$RA'"

# B. 다른 클라이언트(203.0.113.78)가 같은 이메일 → 잠금 아님 401 (엣지가 아니라 클라이언트별 키)
login_xff "203.0.113.78, 172.71.10.1" "$E1" "wrong-x"
[ "$CODE" = "401" ] && ok "다른 클라이언트 IP 는 잠금 안 걸림 401" || bad "다른 클라이언트 CODE=$CODE"

# C. 클라이언트가 X-Forwarded-For 를 위조해 앞에 붙여도(가짜, 실제, 엣지) 실제 IP 기준 → 잠금 우회 불가
E2="lock-spoof-$STAMP@e2e.test"
for i in 0 1 2 3 4 5 6 7 8 9; do login_xff "198.51.100.$((i+1)), 203.0.113.79, ${CF[$i]}" "$E2" "wrong-$i"; done
login_xff "198.51.100.200, 203.0.113.79, 172.71.10.1" "$E2" "wrong-11"
[ "$CODE" = "429" ] && ok "위조 XFF(앞에 가짜 IP 회전)로 잠금 우회 불가 429" || bad "위조 XFF CODE=$CODE"

# D. Render 내부 사설 홉이 끼어도(클라이언트, 엣지, 10.x) 클라이언트 기준
E3="lock-private-$STAMP@e2e.test"
for i in 0 1 2 3 4 5 6 7 8 9; do login_xff "203.0.113.80, ${CF[$i]}, 10.0.$i.1" "$E3" "wrong-$i"; done
login_xff "203.0.113.80, 172.71.10.1, 10.0.99.1" "$E3" "wrong-11"
[ "$CODE" = "429" ] && ok "사설 내부 홉 포함 체인도 클라이언트 IP 기준 잠금" || bad "사설 홉 CODE=$CODE"

# E. IPv6 클라이언트 + IPv6 Cloudflare 엣지
E4="lock-v6-$STAMP@e2e.test"
for i in 0 1 2 3 4 5 6 7 8 9; do login_xff "2001:db8::77, 2606:4700::$i:1" "$E4" "wrong-$i"; done
login_xff "2001:db8::77, 2400:cb00::9:1" "$E4" "wrong-11"
[ "$CODE" = "429" ] && ok "IPv6 클라이언트·엣지 체인도 잠금" || bad "IPv6 CODE=$CODE"

# F. 엣지가 아닌 공개 IP 가 마지막 홉이면 그 IP 가 클라이언트 (신뢰 대역 밖은 건너뛰지 않음)
E5="lock-edge-$STAMP@e2e.test"
for i in 0 1 2 3 4 5 6 7 8 9; do login_xff "203.0.113.$((81+i)), 198.51.100.50" "$E5" "wrong-$i"; done
login_xff "203.0.113.99, 198.51.100.50" "$E5" "wrong-11"
[ "$CODE" = "429" ] && ok "신뢰 대역 밖 마지막 홉(198.51.100.50)은 그대로 클라이언트로 취급" || bad "비신뢰 홉 CODE=$CODE"

# G. X-Forwarded-For 없이(직접 접속) 잘못된 비밀번호 → 정상 401
E6="lock-direct-$STAMP@e2e.test"
out=$(curl -s -m 20 -H "$BYPASS" -H 'Content-Type: application/json' -X POST "$BASE/auth/login" -d "{\"email\":\"$E6\",\"password\":\"wrong\"}" -w $'\n%{http_code}')
[ "$(printf '%s' "$out" | tail -n1)" = "401" ] && ok "XFF 없는 직접 접속도 정상 401" || bad "직접 접속 CODE=$(printf '%s' "$out" | tail -n1)"

echo "step24 결과: PASS $PASS / FAIL $FAIL"
[ "$FAIL" -eq 0 ]
