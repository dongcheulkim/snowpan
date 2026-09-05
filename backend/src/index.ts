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
import { displayName } from './utils/displayName';
import { isTokenIatStale } from './utils/tokens';
import { isAllowedImageUrl } from './utils/validate';
import reviewRoutes from './routes/reviewRoutes';
import shopReviewRoutes from './routes/shopReviewRoutes';
import reportRoutes from './routes/reportRoutes';
import savedSearchRoutes from './routes/savedSearchRoutes';
import shopClaimRoutes from './routes/shopClaimRoutes';
import adBookingRoutes from './routes/adBookingRoutes';
import skiShopRoutes from './routes/skiShopRoutes';
import repairShopRoutes from './routes/repairShopRoutes';
import searchRoutes from './routes/searchRoutes';
import contactRoutes from './routes/contactRoutes';
import sitemapRoutes from './routes/sitemapRoutes';
import referralRoutes from './routes/referralRoutes';
import webcamRoutes from './routes/webcamRoutes';
import preRegisterRoutes from './routes/preRegisterRoutes';
import shopPostRoutes from './routes/shopPostRoutes';
import pollRoutes from './routes/pollRoutes';
import overseasRoutes from './routes/overseasRoutes';
import travelAgencyRoutes from './routes/travelAgencyRoutes';
import { authMiddleware as authenticate, validateAuthHeaderIfPresent } from './middleware/auth';
import { createNotification } from './controllers/notificationController';
import { setIO } from './realtime';
import { seedOverseas } from './utils/seedOverseas';
import { seedWebcams } from './utils/seedWebcams';
import { sendPushToUser } from './utils/push';
import { generalLimiter, authLimiter, writeLimiter, strictWriteLimiter } from './middleware/rateLimit';
import { trackVisit } from './middleware/trackVisit';
import { startAdBookingScheduler } from './utils/adBookingScheduler';
import { startShopVerifyScheduler } from './utils/shopVerifyScheduler';
import { seedAdPricing } from './utils/seedAdPricing';

const app = express();
const httpServer = createServer(app);

// Render / Vercel 리버스 프록시 뒤에 있을 때 req.ip 가 실제 클라이언트 IP 되도록.
// 이게 없으면 모든 사용자가 LB IP 하나로 잡혀 rate limit 이 전원 공유되는 버그 발생.
// 프록시 한 홉만 신뢰 (true 는 헤더 스푸핑에 취약).
app.set('trust proxy', 1);

// CORS 허용 origin 목록: CORS_ORIGIN 환경변수(콤마구분) 우선,
// 미설정 시 프로덕션=snowpan.kr(신규 대표) + www + 이전 snowpan.vercel.app(전환 호환), dev=localhost
// Capacitor 앱: 안드로이드 origin=https://localhost, iOS=capacitor://localhost — 앱에서 API 호출 허용.
const DEFAULT_ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://snowpan.kr', 'https://www.snowpan.kr', 'https://snowpan.vercel.app', 'https://localhost', 'capacitor://localhost']
  : ['http://localhost:5173', 'http://localhost:3000', 'https://localhost', 'capacitor://localhost'];
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
// 컨트롤러(밴/탈퇴)가 특정 유저 소켓을 끊을 수 있게 io 참조 공유.
setIO(io);

// === Security Headers (helmet) ===
// CSP 는 frontend 가 별도 도메인 (snowpan.vercel.app) 이고 API 만 서빙하므로
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
    // 미허용 오리진 — throw(500) 대신 조용히 거부(ACAO 헤더 미부여). 브라우저가 차단.
    return cb(null, false);
  },
  credentials: true,
}));
// JSON body 200KB 상한 — 일반 폼 충분, 거대 페이로드 DoS 방지.
// 이미지 업로드는 multipart 라 별도 (uploadRoutes 의 multer 가 20MB).
app.use(express.json({ limit: '200kb' }));

// 널바이트(0x00) 제거 — Postgres text 는 널바이트를 거부해 Prisma 500 을 유발.
// 요청 진입점에서 문자열 값의 \u0000 을 제거해 광범위한 500 을 원천 차단.
app.use((req, res, next) => {
  // 경로에 널바이트(%00) — 라우팅 후 req.params 로 들어가면 Prisma 500. 원시 URL 에서 조기 차단.
  if (req.originalUrl && /%00/i.test(req.originalUrl)) {
    res.status(400).json({ error: '잘못된 요청 경로입니다.' });
    return;
  }
  const strip = (v: unknown): unknown => {
    if (typeof v === 'string') return v.includes('\u0000') ? v.replace(/\u0000/g, '') : v;
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        (v as Record<string, unknown>)[k] = strip((v as Record<string, unknown>)[k]);
      }
      return v;
    }
    return v;
  };
  if (req.body) strip(req.body);
  if (req.query) { for (const k of Object.keys(req.query)) (req.query as Record<string, unknown>)[k] = strip((req.query as Record<string, unknown>)[k]); }
  if (req.params) strip(req.params);
  next();
});
// HttpOnly 쿠키 (refresh token) 파싱.
app.use(cookieParser());
// 업로드 이미지는 파일명에 uuid/해시 포함되어 있어 사실상 immutable.
// 1년 캐싱 + immutable → Vercel edge / 브라우저에서 재요청 안 함 (Cache-Control 1년).
// 이미지 변경 시엔 반드시 새 파일명으로 저장 필요 (기존 코드가 그렇게 동작).
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '365d',
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

// vertical 필터링은 각 controller 의 where 절에서 처리 (DB 에 vertical 컬럼 있음).
// emptyForNonSnow 미들웨어 제거됨 — 실제 vertical 별 데이터 반환.

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
app.use('/api/shop-reviews', strictWriteLimiter, shopReviewRoutes);
app.use('/api/reports', strictWriteLimiter, reportRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/shop-claims', strictWriteLimiter, shopClaimRoutes);
app.use('/api/ad-booking', adBookingRoutes);
app.use('/api/ski-shops', skiShopRoutes);
app.use('/api/repair-shops', repairShopRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/webcams', webcamRoutes);
app.use('/api/pre-register', strictWriteLimiter, preRegisterRoutes);
app.use('/api/shop-posts', shopPostRoutes);
app.use('/api/polls', strictWriteLimiter, pollRoutes);
app.use('/api/overseas', overseasRoutes);
app.use('/api/agencies', travelAgencyRoutes);

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
  const status = err.status || 500;
  // 5xx 내부 메시지(CORS 오리진 등)는 외부에 노출하지 않음 — 로그로만
  const msg = status >= 500 && process.env.NODE_ENV === 'production' ? '서버 내부 오류' : (err.message || '서버 내부 오류');
  res.status(status).json({ error: msg });
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
    }) as { userId: string; type?: string; iat?: number; tv?: number };
    if (decoded.type && decoded.type !== 'access') return next(new Error('잘못된 토큰 타입'));
    // HTTP authMiddleware 와 동일한 게이트 — 세션무효화/차단/탈퇴/존재확인. 소켓만 우회하던 구멍 차단.
    if (isTokenIatStale(decoded.userId, decoded.iat)) return next(new Error('세션 만료'));
    prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, role: true, sessionInvalidBefore: true, tokenVersion: true } })
      .then((user) => {
        if (!user) return next(new Error('존재하지 않는 사용자'));
        if (user.role === 'banned' || user.role === 'deleted') return next(new Error('이용이 제한된 계정'));
        // 비밀번호 변경 등으로 영속 무효화된 토큰 차단 — HTTP 경로(auth.ts)와 동일 게이트
        if (user.sessionInvalidBefore && decoded.iat && decoded.iat * 1000 < user.sessionInvalidBefore.getTime()) {
          return next(new Error('세션 만료'));
        }
        // 토큰 세대(tv) 검사 — HTTP 경로와 동일 (무효화 시 즉시 거절)
        if ((decoded.tv ?? 0) !== user.tokenVersion) return next(new Error('세션 만료'));
        socket.data.userId = user.id;
        next();
      })
      .catch(() => next(new Error('인증 실패')));
  } catch {
    next(new Error('인증 실패'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);

  // 소켓 이벤트 레이트리밋 — HTTP writeLimiter 우회 방지.
  // send_message: 10초당 10회 (사람 입력 속도 충분 + 봇 차단).
  // join_room: 1분당 30회 (정상 사용은 한 자리수).
  const buckets = {
    send: { count: 0, resetAt: 0 },
    join: { count: 0, resetAt: 0 },
  };
  const takeToken = (key: 'send' | 'join', limit: number, windowMs: number): boolean => {
    const now = Date.now();
    const b = buckets[key];
    if (now >= b.resetAt) { b.count = 1; b.resetAt = now + windowMs; return true; }
    if (b.count >= limit) return false;
    b.count++;
    return true;
  };

  socket.on('join_room', async (roomId: string) => {
    if (!takeToken('join', 30, 60_000)) {
      socket.emit('room_error', { roomId, error: '요청이 너무 잦습니다. 잠시 후 다시 시도하세요.' });
      return;
    }
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
    if (!takeToken('send', 10, 10_000)) {
      socket.emit('rate_limited', { error: '메시지를 너무 빠르게 보내고 있습니다.' });
      return;
    }
    try {
      // 입력 검증 — content 문자열/길이(최대 2000자), type 화이트리스트. 빈 메시지(이미지도 없음) 무시.
      const content = typeof data.content === 'string' ? data.content.trim() : '';
      // imageUrl 은 허용된 업로드 도메인만 — 임의 외부 URL(추적 픽셀/IP 로깅) 상대방 클라에 심는 것 차단.
      const imageUrl = typeof data.imageUrl === 'string' && data.imageUrl && isAllowedImageUrl(data.imageUrl) ? data.imageUrl : null;
      if (!content && !imageUrl) return;
      if (content.length > 2000) {
        socket.emit('rate_limited', { error: '메시지가 너무 깁니다. (최대 2000자)' });
        return;
      }
      const type = data.type === 'image' ? 'image' : 'text';

      // 채팅방 멤버인지 확인
      const room = await prisma.chatRoom.findFirst({
        where: { id: data.roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
      });
      if (!room) {
        // 상대가 방을 삭제한 경우 등 — 무음 드롭하면 보낸 내용이 증발한 것처럼 보임
        socket.emit('room_error', { roomId: data.roomId, error: '채팅방을 찾을 수 없어요. 목록을 새로고침해주세요.' });
        return;
      }

      const message = await prisma.message.create({
        data: { roomId: data.roomId, senderId: userId, content, imageUrl, type },
        include: { sender: { select: { id: true, name: true, nickname: true, profileImage: true } } },
      });
      await prisma.chatRoom.update({ where: { id: data.roomId }, data: { updatedAt: new Date() } });
      // sender 실명 비노출 — HTTP 메시지 조회와 동일하게 표시명 치환
      io.to(`room:${data.roomId}`).emit('new_message', { ...message, sender: { ...message.sender, name: message.sender.nickname || message.sender.name } });

      // 수신자 알림 — room(위 findFirst) 재사용 (중복 쿼리 제거).
      const recipientId = room.user1Id === userId ? room.user2Id : room.user1Id;
      // 수신자가 지금 이 방을 보고 있으면(해당 room 소켓 보유) new_message 로 이미 전달됨
      // → DB 알림·토스트·푸시 생략(메시지마다 알림 row 쌓이는 폭주 방지).
      const roomSockets = await io.in(`room:${data.roomId}`).fetchSockets();
      const recipientActive = roomSockets.some((s) => s.rooms.has(`user:${recipientId}`));
      if (!recipientActive) {
        // 알림 제목은 유저가 정한 닉네임 우선(displayName) — 카카오 원본 이름 대신 스노우판 닉네임 노출.
        const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } });
        const senderName = sender ? displayName(sender) : '알 수 없음';
        const preview = content.length > 30 ? content.slice(0, 30) + '...' : (content || '사진');
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

  // 해외 스키 콘텐츠 초기 시드 (비어있을 때만)
  seedOverseas().catch((err) => console.error('해외 시드 실패:', err));
  seedWebcams().catch((err) => console.error('웹캠 시드 실패:', err));

  try {
    startAdBookingScheduler();
  } catch (err) {
    console.error('광고 스케줄러 시작 실패:', err);
  }

  try {
    startShopVerifyScheduler(); // AI 직원 — 매장 네이버 더블체크
  } catch (err) {
    console.error('AI 직원 스케줄러 시작 실패:', err);
  }

  try {
    await seedAdPricing();
  } catch (err) {
    console.error('광고 가격 시드 실패:', err);
  }

  // Keep-alive: 14분마다 자기 자신에게 핑.
  // ⚠️ 무료(Free) 인스턴스에선 외부 트래픽 없이 슬립되며 슬립 시 이 setInterval 도
  //    멈추므로 자기 핑만으론 슬립 방지 불가 → 오픈 시 UptimeRobot 등 외부 핑 또는
  //    Starter 플랜($7) 필요. 유료 인스턴스에선 이 핑이 유휴 재시작을 예방.
  //    (Free 슬립 임계 15분 → 14분 주기로 여유 둠)
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    setInterval(() => {
      fetch(`${RENDER_URL}/api/health`).catch((err) => {
        console.warn('Keep-alive ping 실패:', err?.message || err);
      });
    }, 14 * 60 * 1000);
  }
});
