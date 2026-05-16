import { PrismaClient } from '@prisma/client';

// Prisma 기본 connection_limit = 10. 5,000 DAU 시즌 피크 트래픽 (~100~200 동시 쿼리) 에서 큐잉 발생.
// DATABASE_URL 에 명시되어 있지 않으면 자동으로 connection_limit=20, pool_timeout=20s 추가.
// Render Standard PG 는 ~97 max connections 까지 허용 — 단일 인스턴스 기준 20개면 안전 마진.
function withPoolDefaults(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '20');
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '20');
    return u.toString();
  } catch {
    return url;
  }
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  datasources: {
    db: { url: withPoolDefaults(process.env.DATABASE_URL) },
  },
});

export default prisma;
