import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
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
import { authMiddleware as authenticate } from './middleware/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.json({ message: '스노우프라이스 API 서버입니다.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/resorts', resortRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', authenticate, chatRoutes);

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('인증 필요'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    socket.data.userId = decoded.userId;
    next();
  } catch {
    next(new Error('인증 실패'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);

  socket.on('join_room', (roomId: string) => {
    socket.join(`room:${roomId}`);
  });

  socket.on('send_message', async (data: { roomId: string; content: string; imageUrl?: string }) => {
    try {
      const message = await prisma.message.create({
        data: { roomId: data.roomId, senderId: userId, content: data.content, imageUrl: data.imageUrl || null },
        include: { sender: { select: { id: true, name: true } } },
      });
      await prisma.chatRoom.update({ where: { id: data.roomId }, data: { updatedAt: new Date() } });
      io.to(`room:${data.roomId}`).emit('new_message', message);
    } catch (err) {
      console.error('Send message error:', err);
    }
  });

  socket.on('leave_room', (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });
});

// 중복 채팅방 병합 (기존 productId별로 분리된 방들을 합침)
async function mergeDuplicateChatRooms() {
  try {
    const rooms = await prisma.chatRoom.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const seen = new Map<string, string>(); // "u1:u2" → keepRoomId
    for (const room of rooms) {
      const key = `${room.user1Id}:${room.user2Id}`;
      if (!seen.has(key)) {
        seen.set(key, room.id);
      } else {
        const keepId = seen.get(key)!;
        // 메시지를 기존 방으로 이동
        await prisma.message.updateMany({
          where: { roomId: room.id },
          data: { roomId: keepId },
        });
        // 중복 방 삭제
        await prisma.chatRoom.delete({ where: { id: room.id } });
        console.log(`🔄 채팅방 병합: ${room.id} → ${keepId}`);
      }
    }
  } catch (err) {
    console.error('채팅방 병합 오류:', err);
  }
}

httpServer.listen(PORT, async () => {
  console.log(`🎿 스노우프라이스 서버가 포트 ${PORT}에서 실행중입니다.`);
  await mergeDuplicateChatRooms();
});
