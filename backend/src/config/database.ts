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

// 지운 매물(deletedAt 있음)은 모든 조회에서 자동으로 뺀다 — 거래 기록은 남기되 화면엔 안 보이게 (2026-09-26).
// 지운 것까지 보려면 where 에 deletedAt 을 직접 적는다 (예: 관리자 분쟁 조회 { deletedAt: { not: null } }).
const liveProduct = <A extends { where?: Record<string, unknown> }>(args: A): A => ({ ...args, where: { deletedAt: null, ...(args.where || {}) } });
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  datasources: {
    db: { url: withPoolDefaults(process.env.DATABASE_URL) },
  },
}).$extends({
  query: {
    product: {
      findMany: ({ args, query }) => query(liveProduct(args)),
      findFirst: ({ args, query }) => query(liveProduct(args)),
      findUnique: ({ args, query }) => query(liveProduct(args)),
      count: ({ args, query }) => query(liveProduct(args)),
      aggregate: ({ args, query }) => query(liveProduct(args)),
      groupBy: ({ args, query }) => query(liveProduct(args)),
    },
  },
});

export default prisma;
