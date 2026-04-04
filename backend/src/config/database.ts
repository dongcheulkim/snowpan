import { PrismaClient } from '@prisma/client';

// Connection pool: append pool params to DATABASE_URL if not already present
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

// 전역: User 조회 시 name을 nickname으로 자동 치환
prisma.$use(async (params, next) => {
  const result = await next(params);
  if (!result) return result;

  const replaceNameWithNickname = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    // user 객체에 name과 nickname이 둘 다 있으면 치환
    if ('name' in obj && 'nickname' in obj && obj.nickname) {
      obj.name = obj.nickname;
    }
    // 중첩 객체/배열 처리
    if ('user' in obj && obj.user && typeof obj.user === 'object') {
      replaceNameWithNickname(obj.user);
    }
    if ('user1' in obj && obj.user1) replaceNameWithNickname(obj.user1);
    if ('user2' in obj && obj.user2) replaceNameWithNickname(obj.user2);
    if ('sender' in obj && obj.sender) replaceNameWithNickname(obj.sender);
    if ('buyer' in obj && obj.buyer) replaceNameWithNickname(obj.buyer);
    if ('seller' in obj && obj.seller) replaceNameWithNickname(obj.seller);
    if ('reporter' in obj && obj.reporter) replaceNameWithNickname(obj.reporter);
  };

  if (Array.isArray(result)) {
    result.forEach(replaceNameWithNickname);
  } else if (typeof result === 'object') {
    replaceNameWithNickname(result);
  }

  return result;
});

export default prisma;
