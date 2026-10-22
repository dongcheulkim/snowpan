import { PrismaClient } from '@prisma/client';
import { cacheDelPrefix } from '../utils/cache';

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
const SHOP_MODELS = new Set(['Rental', 'SkiShop', 'RepairShop']);
const WRITE_OPS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);
const liveProduct = <A extends { where?: Record<string, unknown> }>(args: A): A => ({ ...args, where: { deletedAt: null, ...(args.where || {}) } });
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  datasources: {
    db: { url: withPoolDefaults(process.env.DATABASE_URL) },
  },
}).$extends({
  query: {
    // 매장 목록 캐시(utils/shopKinds.ts, 'shops:') 무효화 — 렌탈·스키샵·정비샵에 쓰기가 생기면 바로 비운다 (33군데 쓰기 지점을 하나로)
    $allModels: {
      $allOperations: async ({ model, operation, args, query }) => {
        const result = await query(args);
        if (SHOP_MODELS.has(model) && WRITE_OPS.has(operation)) cacheDelPrefix('shops:');
        return result;
      },
    },
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
