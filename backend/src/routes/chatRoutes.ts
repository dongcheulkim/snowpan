import { Router, Response } from 'express';
import prisma from '../config/database';

const router = Router();

// 내 채팅방 목록
router.get('/rooms', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const rooms = await prisma.chatRoom.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, name: true } },
        user2: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(rooms);
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ error: '채팅방 조회 실패' });
  }
});

// 채팅방 생성 or 기존 반환
router.post('/rooms', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { targetUserId, productName } = req.body;

    const [u1, u2] = [userId, targetUserId].sort();

    let room = await prisma.chatRoom.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    });

    const isNew = !room;
    if (!room) {
      room = await prisma.chatRoom.create({
        data: { user1Id: u1, user2Id: u2 },
      });
    }

    // 상품명이 있으면 안내 메시지 자동 전송 (시스템 메시지)
    if (productName) {
      const lastMsg = await prisma.message.findFirst({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
      });
      // 마지막 메시지가 같은 상품 안내가 아닐 때만 전송
      const notice = `📦 "${productName}" 상품에 대한 문의입니다.`;
      if (!lastMsg || lastMsg.content !== notice) {
        await prisma.message.create({
          data: { roomId: room.id, senderId: userId, content: notice },
        });
        await prisma.chatRoom.update({ where: { id: room.id }, data: { updatedAt: new Date() } });
      }
    }

    res.json(room);
  } catch (error) {
    console.error('Create chat room error:', error);
    res.status(500).json({ error: '채팅방 생성 실패' });
  }
});

// 채팅방 정보 조회
router.get('/rooms/:roomId', async (req: any, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        user1: { select: { id: true, name: true } },
        user2: { select: { id: true, name: true } },
      },
    });
    if (!room) { res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' }); return; }
    res.json(room);
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({ error: '채팅방 조회 실패' });
  }
});

// 채팅방 메시지 조회
router.get('/rooms/:roomId/messages', async (req: any, res: Response) => {
  try {
    const { roomId } = req.params;
    const messages = await prisma.message.findMany({
      where: { roomId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: '메시지 조회 실패' });
  }
});

export default router;
