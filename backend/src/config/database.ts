import { PrismaClient } from '@prisma/client';

const rawUrl = process.env.DATABASE_URL || '';
const poolParams = 'connection_limit=20&pool_timeout=30';
const databaseUrl = rawUrl.includes('connection_limit')
  ? rawUrl
  : rawUrl.includes('?')
    ? `${rawUrl}&${poolParams}`
    : `${rawUrl}?${poolParams}`;

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
});

export default prisma;
