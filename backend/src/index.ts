import * as Sentry from '@sentry/node';
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

// 시작 시 JWT_SECRET 강도 검사 — 약한 시크릿이면 즉시 종료.
// "snowpan-super-secret..." 같은 placeholder 가 프로덕션에 새는 사고 방지.
const JWT_SECRET = process.env.JWT_SECRET;
const WEAK_SECRETS = ['change-in-production', 'snowpan-super-secret', 'your-secret', 'secret', 'changeme'];
if (!JWT_SECRET || JWT_SECRET.length < 32 || WEAK_SECRETS.some(w => JWT_SECRET.toLowerCase().includes(w))) {
  if (process.env.NODE_ENV === 'production') {
    console.error('🛑 JWT_SECRET 이 약합니다. 32자 이상 난수로 설정하세요 (openssl rand -hex 32).');
    process.exit(1);
  } else {
    console.warn('⚠️  JWT_SECRET 이 약합니다. 프로덕션 배포 전 교체 필수.');
  }
}

// Sentry init (SENTRY_DSN_BACKEND 설정 시 활성화)
// 형식 검증 후에만 init — 잘못된 DSN 으로 init 시 'Invalid Sentry Dsn' 노이즈 방지.
const SENTRY_DSN = process.env.SENTRY_DSN_BACKEND;
if (SENTRY_DSN && /^https?:\/\/[^@]+@[^/]+\/\d+/.test(SENTRY_DSN)) {
  // production 2% (5K DAU × 백엔드 RPS 감안 quota 보호), dev 100%.
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.02 : 1.0,
  });
  console.log('🔍 Sentry 활성화됨');
} else if (SENTRY_DSN) {
  console.warn('⚠️  SENTRY_DSN_BACKEND 형식이 올바르지 않습니다. Sentry 비활성화.');
}

import path from 'path';
import jwt from 'jsonwebtoken';
import { createGzip } from 'zlib';
import prisma from './config/database';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import rentalRoutes from './routes/rentalRoutes';
import lessonRoutes from './routes/lessonRoutes';
import resortRoutes from './routes/resortRoutes';
import accommodationRoutes from './routes/accommodationRoutes';
import communityRoutes from './routes/communityRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import uploadRoutes from './routes/uploadRoutes';
import chatRoutes from './routes/chatRoutes';
import reviewRoutes from './routes/reviewRoutes';
import reportRoutes from './routes/reportRoutes';
import adBookingRoutes from './routes/adBookingRoutes';
import skiShopRoutes from './routes/skiShopRoutes';
import repairShopRoutes from './routes/repairShopRoutes';
import searchRoutes from './routes/searchRoutes';
import contactRoutes from './routes/contactRoutes';
import sitemapRoutes from './routes/sitemapRoutes';
import referralRoutes from './routes/referralRoutes';
import webcamRoutes from './routes/webcamRoutes';
import { authMiddleware as authenticate, validateAuthHeaderIfPresent } from './middleware/auth';
import { createNotification } from './controllers/notificationController';
import { sendPushToUser } from './utils/push';
import { generalLimiter, authLimiter, writeLimiter, strictWriteLimiter } from './middleware/rateLimit';
import { emptyForNonSnow } from './middleware/verticalFilter';
import { trackVisit } from './middleware/trackVisit';
import { startAdBookingScheduler } from './utils/adBookingScheduler';
import { seedAdPricing } from './utils/seedAdPricing';

const app = express();
const httpServer = createServer(app);

// Render / Vercel 리버스 프록시 뒤에 있을 때 req.ip 가 실제 클라이언트 IP 되도록.
// 이게 없으면 모든 사용자가 LB IP 하나로 잡혀 rate limit 이 전원 공유되는 버그 발생.
// 프록시 한 홉만 신뢰 (true 는 헤더 스푸핑에 취약).
app.set('trust proxy', 1);

// CORS 허용 origin 목록: CORS_ORIGIN 환경변수(콤마구분) 우선,
// 미설정 시 프로덕션=pan-app.vercel.app + 이전 snowpan.vercel.app (전환 기간 동안 호환), dev=localhost
const DEFAULT_ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://pan-app.vercel.app', 'https://snowpan.vercel.app']
  : ['http://localhost:5173', 'http://localhost:3000'];
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS;

// === Socket.IO with optimized settings for scale ===
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB max message size
  connectTimeout: 45000,
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3000;

// Expose io for routers via app locals
app.set('io', io);

// === Security Headers (helmet) ===
// CSP 는 frontend 가 별도 도메인 (pan-app.vercel.app) 이고 API 만 서빙하므로
// connect-src 'self' 만으로 충분. 인라인 스크립트/스타일 없음.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
}));
app.disable('x-powered-by');

// === Gzip Compression Middleware (Node.js built-in zlib) ===
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) {
    next();
    return;
  }

  // Skip for small responses, streaming, or already-compressed content types
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    const json = JSON.stringify(body);
    if (json.length < 1024) {
      return originalJson(body);
    }
    res.set('Content-Encoding', 'gzip');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.removeHeader('Content-Length');
    const gzip = createGzip();
    gzip.pipe(res as unknown as NodeJS.WritableStream);
    gzip.end(json);
    return res;
  };

  next();
});

// === Request Logger Middleware ===
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'production') {
      // In production, only log slow requests (>1000ms)
      if (duration > 1000) {
        console.warn(`[SLOW] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      }
    } else {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// === Rate Limiting ===
app.use(generalLimiter);
app.use(writeLimiter);
app.use(trackVisit);

app.use(cors({
  origin: (origin, cb) => {
    // 서버 내부 호출 / Postman 등 origin 없을 땐 허용
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
// JSON body 200KB 상한 — 일반 폼 충분, 거대 페이로드 DoS 방지.
// 이미지 업로드는 multipart 라 별도 (uploadRoutes 의 multer 가 20MB).
app.use(express.json({ limit: '200kb' }));
// HttpOnly 쿠키 (refresh token) 파싱.
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  immutable: true,
}));

// 캐시 정책 — 5,000 DAU 시즌 피크 대비.
// 공개 read-only endpoint 에 Cache-Control 부여. Vercel edge / 브라우저 캐시 활용해 백엔드 부하 ↓.
// s-maxage = CDN 캐시 시간 (응답이 더 신선해야 하면 stale-while-revalidate 로 점진 갱신).
//
// 인증 endpoint 는 캐시 X (Authorization 헤더 있으면 Cache-Control 우회).
const publicCache = (maxAge: number, sMaxAge?: number) => (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET') { next(); return; }
  // 로그인 유저는 개인화된 데이터 가능성 — 캐시 안 함
  if (req.headers.authorization) { next(); return; }
  const s = sMaxAge ?? maxAge * 2;
  res.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${s}, stale-while-revalidate=${s * 2}`);
  next();
};

// vertical 필터 — non-snow vertical 요청은 빈 응답 즉시 반환 (DB 컬럼 미추가)
app.use('/api/products', emptyForNonSnow);
app.use('/api/rentals', emptyForNonSnow);
app.use('/api/lessons', emptyForNonSnow);
app.use('/api/accommodations', emptyForNonSnow);
app.use('/api/community', emptyForNonSnow);
app.use('/api/ski-shops', emptyForNonSnow);
app.use('/api/repair-shops', emptyForNonSnow);
app.use('/api/webcams', emptyForNonSnow);

app.use('/api/banners', publicCache(300));            // 배너 — 5분
app.use('/api/products', publicCache(30, 60));         // 매물 목록/상세 — 30s (목록 회전 빠름)
app.use('/api/rentals', publicCache(120));             // 렌탈 — 2분
app.use('/api/lessons', publicCache(120));             // 레슨 — 2분
app.use('/api/accommodations', publicCache(120));      // 숙소 — 2분
app.use('/api/ski-shops', publicCache(300));           // 스키샵 — 5분 (자주 안 바뀜)
app.use('/api/repair-shops', publicCache(300));        // 정비샵 — 5분
app.use('/api/webcams', publicCache(600));             // 웹캠 메타 — 10분 (스트림 자체는 라이브)
app.use('/api/resorts', publicCache(3600));            // 리조트 목록 — 1시간 (거의 안 바뀜)
app.use('/api/community', publicCache(20, 60));        // 커뮤니티 — 20s (실시간성 ↑)

app.get('/', (req, res) => {
  res.json({ message: '스노우프라이스 API 서버입니다.' });
});

// 모든 /api/* 요청에서 Authorization 헤더 검증 — 헤더 있을 때만.
// 만료/위조 토큰이 보내지면 endpoint 가 공개여도 즉시 401 → 클라 refresh 트리거.
// 인증 흐름 자체 (login/register/refresh/logout/reset) 는 예외 — 사용자가 만료된
// 옛 토큰을 sessionStorage 에 가지고 있어도 새로 로그인 가능해야 함.
const AUTH_BYPASS = new Set([
  '/auth/login', '/auth/register', '/auth/refresh', '/auth/logout',
  '/auth/reset-password-request', '/auth/reset-password',
  '/auth/phone/send', '/auth/phone/verify',
  '/auth/kakao', '/auth/kakao/callback', '/auth/naver', '/auth/naver/callback',
]);
app.use('/api', (req, res, next) => {
  if (AUTH_BYPASS.has(req.path)) return next();
  return validateAuthHeaderIfPresent(req, res, next);
});

// Auth routes with stricter rate limit
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/resorts', resortRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/community', strictWriteLimiter, communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check — DB ping + uptime
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      db: 'connected',
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// 공개 배너 API (인증 불필요)
import { getPublicBanners } from './controllers/adminController';
app.get('/api/banners', getPublicBanners);

// 홈 인기중고매물 경량 API
import { getHotDeals } from './controllers/productController';
app.get('/api/home/hot-deals', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60');
  next();
}, getHotDeals);
app.use('/api/upload', authenticate, uploadRoutes);
app.use('/api/chat', authenticate, chatRoutes);
app.use('/api/reviews', strictWriteLimiter, reviewRoutes);
app.use('/api/reports', strictWriteLimiter, reportRoutes);
app.use('/api/ad-booking', adBookingRoutes);
app.use('/api/ski-shops', skiShopRoutes);
app.use('/api/repair-shops', repairShopRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/webcams', webcamRoutes);

// SEO: sitemap은 /api/ 접두사 없이 루트에서 서빙 (Vercel rewrite로 /sitemap.xml → 여기로)
app.use('/', sitemapRoutes);

// 404 JSON 응답 — /api/* 매칭 안 되는 경로 (잘못된 메서드/경로 포함) 일 때
// Express 기본 HTML 페이지 대신 JSON 으로 일관성 유지.
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API 엔드포인트를 찾을 수 없습니다.',
    method: req.method,
    path: req.originalUrl,
  });
});

// Sentry error handler — must be AFTER all routes, BEFORE other error middleware
if (SENTRY_DSN && /^https?:\/\/[^@]+@[^/]+\/\d+/.test(SENTRY_DSN)) {
  Sentry.setupExpressErrorHandler(app);
}

// Fallback JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // body-parser 의 size/JSON 에러를 적절한 4xx 로 매핑.
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({ error: '요청 본문이 너무 큽니다 (최대 200KB).' });
    return;
  }
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({ error: '요청 본문이 올바른 JSON 이 아닙니다.' });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || '서버 내부 오류' });
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('인증 필요'));
  try {
    if (!process.env.JWT_SECRET) return next(new Error('서버 설정 오류'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: false,
    }) as { userId: string; type?: string };
    if (decoded.type && decoded.type !== 'access') return next(new Error('잘못된 토큰 타입'));
    socket.data.userId = decoded.userId;
    next();
  } catch {
    next(new Error('인증 실패'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);

  socket.on('join_room', async (roomId: string) => {
    try {
      const room = await prisma.chatRoom.findFirst({
        where: { id: roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
      });
      if (!room) {
        socket.emit('room_error', { roomId, error: '접근할 수 없는 채팅방입니다.' });
        return;
      }
      socket.join(`room:${roomId}`);
    } catch (err) {
      console.error('join_room error:', err);
      socket.emit('room_error', { roomId, error: '채팅방 접근 중 오류가 발생했습니다.' });
    }
  });

  socket.on('send_message', async (data: { roomId: string; content: string; imageUrl?: string; type?: string }) => {
    try {
      // 채팅방 멤버인지 확인
      const room = await prisma.chatRoom.findFirst({
        where: { id: data.roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
      });
      if (!room) return;

      const message = await prisma.message.create({
        data: { roomId: data.roomId, senderId: userId, content: data.content, imageUrl: data.imageUrl || null, type: data.type || 'text' },
        include: { sender: { select: { id: true, name: true, nickname: true, profileImage: true } } },
      });
      await prisma.chatRoom.update({ where: { id: data.roomId }, data: { updatedAt: new Date() } });
      io.to(`room:${data.roomId}`).emit('new_message', message);

      // Find the recipient and send real-time notification
      const chatRoom = await prisma.chatRoom.findUnique({ where: { id: data.roomId } });
      if (chatRoom) {
        const recipientId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
        const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        const senderName = sender?.name || '알 수 없음';
        const preview = data.content.length > 30 ? data.content.slice(0, 30) + '...' : data.content;
        await createNotification(recipientId, 'chat', `${senderName}님의 메시지`, preview, `/chat/${data.roomId}`);
        io.to(`user:${recipientId}`).emit('new_notification', { type: 'chat', title: `${senderName}님의 메시지`, message: preview });
        sendPushToUser(recipientId, `${senderName}님의 메시지`, preview, `/chat/${data.roomId}`);
      }
    } catch (err) {
      console.error('Send message error:', err);
    }
  });

  socket.on('leave_room', (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });
});

// === Global Error Handler ===
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// === Unhandled Promise Rejections & Uncaught Exceptions ===
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Allow existing requests to finish, then exit
  gracefulShutdown('uncaughtException');
});

// === Graceful Shutdown ===
let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    console.log('HTTP server closed.');
    try {
      // Close all Socket.IO connections
      io.close();
      console.log('Socket.IO connections closed.');

      // Disconnect Prisma client
      await prisma.$disconnect();
      console.log('Prisma client disconnected.');
    } catch (err) {
      console.error('Error during shutdown:', err);
    }
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

httpServer.listen(PORT, async () => {
  console.log(`🎿 스노우프라이스 서버가 포트 ${PORT}에서 실행중입니다.`);

  try {
    startAdBookingScheduler();
  } catch (err) {
    console.error('광고 스케줄러 시작 실패:', err);
  }

  try {
    await seedAdPricing();
  } catch (err) {
    console.error('광고 가격 시드 실패:', err);
  }

  // Keep-alive: 5분마다 자기 자신에게 핑 (Render 슬립 방지)
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    setInterval(() => {
      fetch(`${RENDER_URL}/api/health`).catch((err) => {
        console.warn('Keep-alive ping 실패:', err?.message || err);
      });
    }, 5 * 60 * 1000);
  }
});
