// DB 사이즈 리포트 — Render Shell 에서 1회 실행: npx tsx prisma/db-size-report.ts
// 테이블별 디스크 사용량, 인덱스 사용량, 행 개수 출력.
// 한도 추적용. PostgreSQL 의 pg_total_relation_size + pg_relation_size 사용.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SizeRow {
  schemaname: string;
  tablename: string;
  total_bytes: bigint;
  table_bytes: bigint;
  index_bytes: bigint;
  toast_bytes: bigint;
  row_estimate: bigint;
}

interface DbSize {
  pg_database_size: bigint;
}

function fmt(bytes: bigint): string {
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function main() {
  console.log('🗄️  DB 사이즈 리포트\n');

  // 전체 DB 사이즈
  const dbSize = await prisma.$queryRaw<DbSize[]>`
    SELECT pg_database_size(current_database()) AS pg_database_size
  `;
  console.log(`📦 전체 DB 사이즈: ${fmt(dbSize[0].pg_database_size)}`);

  // 사용자 테이블만 (public 스키마)
  const rows = await prisma.$queryRaw<SizeRow[]>`
    SELECT
      schemaname,
      relname AS tablename,
      pg_total_relation_size(C.oid) AS total_bytes,
      pg_relation_size(C.oid) AS table_bytes,
      pg_indexes_size(C.oid) AS index_bytes,
      pg_total_relation_size(reltoastrelid) AS toast_bytes,
      n_live_tup AS row_estimate
    FROM pg_class C
    LEFT JOIN pg_namespace N ON N.oid = C.relnamespace
    LEFT JOIN pg_stat_user_tables S ON S.relid = C.oid
    WHERE relkind = 'r' AND N.nspname = 'public'
    ORDER BY pg_total_relation_size(C.oid) DESC
  `;

  console.log('\n📋 테이블별 사용량 (큰 순)\n');
  console.log(
    [
      '테이블',
      '전체',
      '데이터',
      '인덱스',
      'TOAST',
      '행수(추정)',
    ].map((s) => s.padEnd(14)).join(' | ')
  );
  console.log('-'.repeat(110));

  let totalTables = 0n;
  for (const r of rows) {
    totalTables += r.total_bytes;
    const row = [
      r.tablename.padEnd(14),
      fmt(r.total_bytes).padEnd(14),
      fmt(r.table_bytes).padEnd(14),
      fmt(r.index_bytes).padEnd(14),
      fmt(r.toast_bytes ?? 0n).padEnd(14),
      String(r.row_estimate).padEnd(14),
    ].join(' | ');
    console.log(row);
  }
  console.log('-'.repeat(110));
  console.log(`합계 (모든 public 테이블): ${fmt(totalTables)}`);

  // 평균 행 사이즈 (큰 테이블만)
  console.log('\n📐 평균 행 사이즈 (행수 100 초과 테이블만)\n');
  for (const r of rows) {
    if (r.row_estimate > 100n) {
      const avgBytes = Number(r.total_bytes) / Number(r.row_estimate);
      console.log(`  ${r.tablename.padEnd(20)} ${avgBytes.toFixed(0)} bytes / row`);
    }
  }

  // 한도별 잔여 추정
  console.log('\n🎯 외부 호스팅 한도별 잔여 비교\n');
  const limits: { name: string; bytes: number }[] = [
    { name: 'Supabase Free (500MB)', bytes: 500 * 1024 * 1024 },
    { name: 'Supabase Pro (8GB)', bytes: 8 * 1024 * 1024 * 1024 },
    { name: 'Neon Free (3GB)', bytes: 3 * 1024 * 1024 * 1024 },
    { name: 'Render PG Free (256MB)', bytes: 256 * 1024 * 1024 },
    { name: 'Render PG Starter (1GB)', bytes: 1024 * 1024 * 1024 },
  ];
  const current = Number(dbSize[0].pg_database_size);
  for (const l of limits) {
    const used = (current / l.bytes) * 100;
    const free = (l.bytes - current) / 1024 / 1024;
    const flag = used > 80 ? '🔴' : used > 50 ? '🟡' : '🟢';
    console.log(
      `  ${flag} ${l.name.padEnd(28)} 사용 ${used.toFixed(1)}% (남은 공간 ${free.toFixed(0)} MB)`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
