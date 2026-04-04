import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { authMiddleware as authenticate } from './middleware/auth';
import { createNotification } from './controllers/notificationController';
import { sendPushToUser } from './utils/push';
import { generalLimiter, authLimiter, writeLimiter } from './middleware/rateLimit';
import { startAdBookingScheduler } from './utils/adBookingScheduler';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// === Socket.IO with optimized settings for scale ===
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB max message size
  connectTimeout: 45000,
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3000;

// === Security Headers Middleware ===
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

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

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  immutable: true,
}));

// Cache headers for banner API (5 minutes)
app.use('/api/banners', (req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'public, max-age=300');
  next();
});

// Cache headers for product listings (30 seconds)
app.use('/api/products', (req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'public, max-age=30');
  next();
});

app.get('/', (req, res) => {
  res.json({ message: '스노우프라이스 API 서버입니다.' });
});

// Auth routes with stricter rate limit
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/resorts', resortRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

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
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ad-booking', adBookingRoutes);
app.use('/api/ski-shops', skiShopRoutes);
app.use('/api/repair-shops', repairShopRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/contact', contactRoutes);

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('인증 필요'));
  try {
    if (!process.env.JWT_SECRET) return next(new Error('서버 설정 오류'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
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
    const room = await prisma.chatRoom.findFirst({
      where: { id: roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
    });
    if (room) socket.join(`room:${roomId}`);
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
  startAdBookingScheduler();


  // Keep-alive: 5분마다 자기 자신에게 핑 (Render 슬립 방지)
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    setInterval(() => {
      fetch(`${RENDER_URL}/api/health`).catch(() => {});
    }, 5 * 60 * 1000);
  }
});
