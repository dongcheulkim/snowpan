import { Router, Response } from 'express';
import prisma from '../config/database';

const router = Router();

// 내 채팅방 목록 (with unread count)
router.get('/rooms', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const rooms = await prisma.chatRoom.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, name: true, profileImage: true } },
        user2: { select: { id: true, name: true, profileImage: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    // Batch unread count: single grouped query instead of N individual queries
    const roomIds = rooms.map(r => r.id);
    const unreadCounts: Record<string, number> = {};

    if (roomIds.length > 0) {
      // Build conditions per room based on lastReadAt
      const countResults = await Promise.all(
        // Use groupBy to count unread messages for all rooms at once
        // Since each room has a different lastReadAt, we batch into a single grouped query
        [prisma.message.groupBy({
          by: ['roomId'],
          where: {
            roomId: { in: roomIds },
            senderId: { not: userId },
          },
          _count: { id: true },
        })]
      );

      const totalPerRoom: Record<string, number> = {};
      for (const row of countResults[0]) {
        totalPerRoom[row.roomId] = row._count.id;
      }

      // Now count messages before lastReadAt to subtract
      const roomsWithLastRead = rooms
        .map(room => {
          const isUser1 = room.user1Id === userId;
          const lastReadAt = isUser1 ? room.user1LastReadAt : room.user2LastReadAt;
          return { roomId: room.id, lastReadAt };
        })
        .filter(r => r.lastReadAt != null);

      if (roomsWithLastRead.length > 0) {
        const readCountResults = await Promise.all(
          roomsWithLastRead.map(r =>
            prisma.message.count({
              where: {
                roomId: r.roomId,
                senderId: { not: userId },
                createdAt: { lte: r.lastReadAt! },
              },
            }).then(count => ({ roomId: r.roomId, count }))
          )
        );

        for (const { roomId, count } of readCountResults) {
          unreadCounts[roomId] = Math.max(0, (totalPerRoom[roomId] || 0) - count);
        }
      }

      // For rooms without lastReadAt, all messages from other user are unread
      for (const room of rooms) {
        if (!(room.id in unreadCounts)) {
          const isUser1 = room.user1Id === userId;
          const lastReadAt = isUser1 ? room.user1LastReadAt : room.user2LastReadAt;
          if (!lastReadAt) {
            unreadCounts[room.id] = totalPerRoom[room.id] || 0;
          }
        }
      }
    }

    const roomsWithUnread = rooms.map(room => ({
      ...room,
      _count: undefined,
      unreadCount: unreadCounts[room.id] || 0,
    }));

    res.json(roomsWithUnread);
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
        user1: { select: { id: true, name: true, profileImage: true } },
        user2: { select: { id: true, name: true, profileImage: true } },
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
      include: { sender: { select: { id: true, name: true, profileImage: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: '메시지 조회 실패' });
  }
});

// 채팅방 읽음 처리
router.put('/rooms/:roomId/read', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) { res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' }); return; }

    const now = new Date();
    if (room.user1Id === userId) {
      await prisma.chatRoom.update({ where: { id: roomId }, data: { user1LastReadAt: now } });
    } else if (room.user2Id === userId) {
      await prisma.chatRoom.update({ where: { id: roomId }, data: { user2LastReadAt: now } });
    }
    res.json({ message: '읽음 처리 완료' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: '읽음 처리 실패' });
  }
});

export default router;
