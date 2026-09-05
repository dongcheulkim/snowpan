#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Snowpan E2E 러너 — 로컬 Postgres + 백엔드 자동 기동 후 전체 스위트 실행
#
#   ./e2e/run.sh          # 전체 (step1~10)
#   ./e2e/run.sh 9        # 특정 스텝만 (state 는 이전 실행 것 재사용)
#
# 구성:
#   - Postgres 16: $HOME/.snowpan-e2e/pgdata, 포트 5433, 유저 snowtest, DB snowpan_test
#     (없으면 initdb 로 자동 생성 — 프로덕션 DB 는 절대 건드리지 않음)
#   - 백엔드: 포트 4001, DATABASE_URL 을 테스트 DB 로 강제 (backend/.env 무관)
#   - 시드 테이블(ski_resorts·overseas_resorts·ad_slot_pricings)만 유지, 나머지 초기화
#   - lib.sh 의 리조트 ID(용평·곤지암)가 없으면 자동 시드
# ─────────────────────────────────────────────────────────────
set -u
E2E_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$E2E_DIR/.." && pwd)"
export E2E_STATE_DIR="$E2E_DIR/.state"
mkdir -p "$E2E_STATE_DIR"

PGHOME="$HOME/.snowpan-e2e"
PGDATA="$PGHOME/pgdata"
PGPORT=5433
PGURL="postgresql://snowtest@localhost:$PGPORT/snowpan_test"
APIPORT=4001

# ── Postgres 바이너리 (homebrew 우선)
PGBIN=$(ls -d /opt/homebrew/opt/postgresql@*/bin 2>/dev/null | sort -V | tail -1)
[ -z "$PGBIN" ] && PGBIN=$(dirname "$(command -v pg_ctl 2>/dev/null)" 2>/dev/null)
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "ERROR: postgresql 이 없습니다. brew install postgresql@16" >&2; exit 1
fi
export PATH="$PGBIN:$PATH"

# ── Postgres 준비 (initdb → start → role/db)
if [ ! -d "$PGDATA" ]; then
  echo "[setup] initdb $PGDATA"
  mkdir -p "$PGHOME"
  initdb -D "$PGDATA" -U "$USER" --auth=trust -E UTF8 >/dev/null
fi
if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  pg_ctl -D "$PGDATA" -l "$PGHOME/pg.log" -o "-p $PGPORT" start >/dev/null
  sleep 1
fi
psql -h localhost -p $PGPORT -U "$USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='snowtest'" | grep -q 1 \
  || psql -h localhost -p $PGPORT -U "$USER" -d postgres -c "CREATE ROLE snowtest LOGIN SUPERUSER" >/dev/null
psql -h localhost -p $PGPORT -U "$USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='snowpan_test'" | grep -q 1 \
  || psql -h localhost -p $PGPORT -U "$USER" -d postgres -c "CREATE DATABASE snowpan_test OWNER snowtest" >/dev/null

# ── 스키마 동기화 (Prisma 스키마 기준)
( cd "$REPO/backend" && DATABASE_URL="$PGURL" npx prisma db push --skip-generate >/dev/null 2>&1 ) \
  || { echo "ERROR: prisma db push 실패"; exit 1; }

# ── 광고 슬롯 가격 시드 — 서버 기동 시에도 돌지만, 이미 떠 있는 백엔드를 재사용하는
#    경우(새 DB 인데 서버는 옛 기동) 시드가 빈다 → 러너가 항상 명시적으로 보장
if [ "$(psql "$PGURL" -tAc 'SELECT count(*) FROM ad_slot_pricings')" = "0" ]; then
  echo "[setup] ad_slot_pricings 시드"
  ( cd "$REPO/backend" && DATABASE_URL="$PGURL" npx tsx -e \
    "import('./src/utils/seedAdPricing').then(m=>((m.seedAdPricing||m.default?.seedAdPricing||m.default)()) ).then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})" ) \
    || { echo "ERROR: 광고 가격 시드 실패"; exit 1; }
fi

# ── 백엔드 기동 — 항상 최신 코드로 새로 띄움.
#    (기존 리스너 재사용은 옛 코드로 테스트하는 함정 + 서브셸 kill 이 node 자식을
#     못 죽여 다음 실행에 좀비가 남던 문제 → 4001 리스너를 정리하고 시작)
OLD_PIDS=$(lsof -ti :$APIPORT -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$OLD_PIDS" ]; then
  echo "[setup] 4001 기존 프로세스 정리 ($OLD_PIDS)"
  kill $OLD_PIDS 2>/dev/null; sleep 1
  kill -9 $(lsof -ti :$APIPORT -sTCP:LISTEN 2>/dev/null) 2>/dev/null || true
fi
echo "[setup] backend 기동 (port $APIPORT, test DB)"
( cd "$REPO/backend" && DATABASE_URL="$PGURL" PORT=$APIPORT LOADTEST_BYPASS_KEY=e2e-local-bypass \
    npx tsx src/index.ts > "$E2E_STATE_DIR/backend.log" 2>&1 ) &
STARTED_BACKEND=$!
for i in $(seq 1 30); do
  curl -s -o /dev/null -m 2 "http://localhost:$APIPORT/api/webcams" && break
  sleep 1
done
cleanup() {
  # 서브셸이 아니라 실제 리스너(node)까지 정리 — 좀비 방지
  [ -n "$STARTED_BACKEND" ] && kill "$STARTED_BACKEND" 2>/dev/null
  kill $(lsof -ti :$APIPORT -sTCP:LISTEN 2>/dev/null) 2>/dev/null || true
}
trap cleanup EXIT

# ── 리조트 시드 (lib.sh 하드코딩 ID) — 없으면 삽입
psql "$PGURL" -tAc "SELECT count(*) FROM ski_resorts WHERE id IN ('2808048b-a13b-42da-bb92-b24e6ed990b5','2d28363e-a466-49e9-b480-a8e9d7c91122')" | grep -q 2 || \
psql "$PGURL" -q <<'SQL'
INSERT INTO ski_resorts (id, name, location, "createdAt", "updatedAt") VALUES
 ('2808048b-a13b-42da-bb92-b24e6ed990b5','용평리조트','강원도 평창군', now(), now()),
 ('2d28363e-a466-49e9-b480-a8e9d7c91122','곤지암리조트','경기도 광주시', now(), now())
ON CONFLICT (id) DO NOTHING;
SQL

# ── DB 초기화 (시드 테이블 제외) — 특정 스텝만 돌릴 땐 초기화 생략
ONLY="${1:-}"
if [ -z "$ONLY" ]; then
  psql "$PGURL" -q <<'SQL' 2>/dev/null
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
           AND tablename NOT IN ('_prisma_migrations','ski_resorts','overseas_resorts','ad_slot_pricings')
  LOOP
    EXECUTE format('TRUNCATE TABLE %I CASCADE', t);
  END LOOP;
END $$;
SQL
fi

# ── 실행
OUT="$E2E_STATE_DIR/last-run.txt"
: > "$OUT"
if [ -n "$ONLY" ]; then
  bash "$E2E_DIR/step$ONLY.sh" 2>&1 | tee -a "$OUT"
else
  for i in 1 2 3 4 5 6 7 8 9 10 11; do
    [ -f "$E2E_DIR/step$i.sh" ] && bash "$E2E_DIR/step$i.sh" >> "$OUT" 2>&1
  done
fi

PASSN=$(grep -ac 'PASS | ' "$OUT" || true)
FAILN=$(grep -ac 'FAIL | ' "$OUT" || true)
echo ""
echo "========== E2E 결과: PASS $PASSN / FAIL $FAILN =========="
[ "$FAILN" != "0" ] && grep -a 'FAIL | ' "$OUT"
echo "(전체 로그: $OUT)"
[ "$FAILN" = "0" ]
