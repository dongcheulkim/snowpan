#!/bin/bash
# Snowpan DB 백업 스크립트
# 사용법: ./scripts/backup.sh
# 크론탭: 0 3 * * * cd /path/to/snowpan/backend && ./scripts/backup.sh

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/snowpan_${TIMESTAMP}.sql"

# .env에서 DATABASE_URL 읽기
if [ -f .env ]; then
  export $(grep -E '^(DATABASE_URL|DIRECT_URL)=' .env | head -1)
fi

DB_URL="${DIRECT_URL:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "ERROR: DATABASE_URL 또는 DIRECT_URL이 설정되지 않았습니다."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "백업 시작: $TIMESTAMP"
pg_dump "$DB_URL" --no-owner --no-acl > "$BACKUP_FILE"
gzip "$BACKUP_FILE"
echo "백업 완료: ${BACKUP_FILE}.gz ($(du -h "${BACKUP_FILE}.gz" | cut -f1))"

# 30일 이상 된 백업 삭제
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "30일 이상 된 백업 정리 완료"
