#!/bin/bash
# Shared helpers for Snowpan owner/advertiser journey re-verification
BASE=http://localhost:4001/api
PSQL="psql -h localhost -p 5433 -U snowtest -d snowpan_test -tA"
YONGPYONG=2808048b-a13b-42da-bb92-b24e6ed990b5   # 용평 (강원도 평창군)
GONJIAM=2d28363e-a466-49e9-b480-a8e9d7c91122      # 곤지암 (경기도 광주시)

pq() { psql -h localhost -p 5433 -U snowtest -d snowpan_test -tA -c "$1"; }

# register_verified <phone> <email> <name> [nickname]
# Does phone/send -> read code from DB -> phone/verify -> register. Prints access token.
register_verified() {
  local phone="$1" email="$2" name="$3" nick="${4:-}"
  local pass='Re!pass1234'
  curl -s -X POST "$BASE/auth/phone/send" -H 'Content-Type: application/json' -H 'X-Loadtest-Key: e2e-local-bypass' \
    -d "{\"phone\":\"$phone\"}" >/dev/null
  local code
  code=$(pq "select code from phone_verifications where phone='$phone' order by \"createdAt\" desc limit 1")
  curl -s -X POST "$BASE/auth/phone/verify" -H 'Content-Type: application/json' -H 'X-Loadtest-Key: e2e-local-bypass' \
    -d "{\"phone\":\"$phone\",\"code\":\"$code\"}" >/dev/null
  local body
  if [ -n "$nick" ]; then
    body="{\"email\":\"$email\",\"password\":\"$pass\",\"name\":\"$name\",\"nickname\":\"$nick\",\"phone\":\"$phone\"}"
  else
    body="{\"email\":\"$email\",\"password\":\"$pass\",\"name\":\"$name\",\"phone\":\"$phone\"}"
  fi
  curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -H 'X-Loadtest-Key: e2e-local-bypass' -d "$body" | jq -r '.token // empty'
}

# login <email> <password> -> token
login() {
  curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -H 'X-Loadtest-Key: e2e-local-bypass' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | jq -r '.token // empty'
}
