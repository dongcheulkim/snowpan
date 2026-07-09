import { Router, Response } from 'express';
import prisma from '../config/database';
import { displayName } from '../utils/displayName';

const router = Router();

// 내 채팅방 목록 (with unread count)
router.get('/rooms', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const rooms = await prisma.chatRoom.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, name: true, nickname: true, profileImage: true } },
        user2: { select: { id: true, name: true, nickname: true, profileImage: true } },
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
      user1: { ...room.user1, name: displayName(room.user1) },
      user2: { ...room.user2, name: displayName(room.user2) },
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
    const { targetUserId, productName, productPath } = req.body;

    // 입력 검증 — 누락/형식/자기자신 채팅 차단 (이전엔 500 떨어짐).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({ error: 'targetUserId 가 필요합니다.' });
      return;
    }
    if (!UUID_RE.test(targetUserId)) {
      res.status(400).json({ error: 'targetUserId 형식이 올바르지 않습니다.' });
      return;
    }
    if (targetUserId === userId) {
      res.status(400).json({ error: '자기 자신과는 채팅할 수 없습니다.' });
      return;
    }
    // 대상 사용자 존재 확인 (deleted 계정 차단).
    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, role: true } });
    if (!target) {
      res.status(404).json({ error: '대상 사용자를 찾을 수 없습니다.' });
      return;
    }
    if (target.role === 'deleted') {
      res.status(410).json({ error: '탈퇴한 사용자입니다.' });
      return;
    }

    const [u1, u2] = [userId, targetUserId].sort();

    // upsert — "채팅하기" 더블탭 등 동시 요청 2건이 둘 다 create 를 타서
    // 두 번째가 unique 위반 500 나던 race 차단. 원자적으로 기존 방 반환.
    const existing = await prisma.chatRoom.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      select: { id: true },
    });
    const isNewRoom = !existing;
    const room = await prisma.chatRoom.upsert({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      create: { user1Id: u1, user2Id: u2 },
      update: {},
    });

    // 관리자 채팅방 새로 생성 시 관리자 자동 인사 (위에서 이미 fetch 한 target 재사용).
    if (isNewRoom && !productName && target.role === 'admin') {
      await prisma.message.create({
        data: { roomId: room.id, senderId: targetUserId, content: '안녕하세요! 무엇을 도와드릴까요? 😊', type: 'text' },
      });
      await prisma.chatRoom.update({ where: { id: room.id }, data: { updatedAt: new Date() } });
    }

    // 상품명이 있으면 안내 메시지 자동 전송
    if (productName) {
      const lastMsg = await prisma.message.findFirst({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
      });
      const noticeContent = JSON.stringify({ productName, productPath: productPath || null });
      let isAlreadySent = false;
      try { isAlreadySent = lastMsg?.type === 'product_inquiry' && JSON.parse(lastMsg.content || '{}').productName === productName; } catch {}
      if (!isAlreadySent) {
        await prisma.message.create({
          data: { roomId: room.id, senderId: userId, content: noticeContent, type: 'product_inquiry' },
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

// 채팅방 삭제 — 참여자 둘 중 누구든 삭제하면 방 + 메시지 전부 제거 (양쪽에서 사라짐).
// 당근마켓 "나가기" 와 같은 hard delete 방식.
router.delete('/rooms/:roomId', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    const room = await prisma.chatRoom.findFirst({
      where: { id: roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
    });
    if (!room) {
      res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
      return;
    }
    // Message.roomId 에 onDelete:Cascade 가 없어서 수동 삭제. 트랜잭션으로 묶어 원자성 보장.
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { roomId } }),
      prisma.chatRoom.delete({ where: { id: roomId } }),
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete chat room error:', error);
    res.status(500).json({ error: '채팅방 삭제 실패' });
  }
});

// 채팅방 정보 조회
router.get('/rooms/:roomId', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    const room = await prisma.chatRoom.findFirst({
      where: { id: roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, name: true, nickname: true, profileImage: true } },
        user2: { select: { id: true, name: true, nickname: true, profileImage: true } },
      },
    });
    if (!room) { res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' }); return; }
    res.json({ ...room, user1: { ...room.user1, name: displayName(room.user1) }, user2: { ...room.user2, name: displayName(room.user2) } });
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({ error: '채팅방 조회 실패' });
  }
});

// 채팅방 메시지 조회
router.get('/rooms/:roomId/messages', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    // 채팅방 멤버인지 확인
    const room = await prisma.chatRoom.findFirst({
      where: { id: roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
    });
    if (!room) { res.status(403).json({ error: '접근 권한이 없습니다.' }); return; }
    const messages = await prisma.message.findMany({
      where: { roomId },
      include: { sender: { select: { id: true, name: true, nickname: true, profileImage: true } } },
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
    const room = await prisma.chatRoom.findFirst({
      where: { id: roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
    });
    if (!room) { res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' }); return; }

    const now = new Date();
    if (room.user1Id === userId) {
      await prisma.chatRoom.update({ where: { id: roomId }, data: { user1LastReadAt: now } });
    } else if (room.user2Id === userId) {
      await prisma.chatRoom.update({ where: { id: roomId }, data: { user2LastReadAt: now } });
    }
    const io = req.app.get('io');
    if (io) io.to(`room:${roomId}`).emit('room_read', { roomId, userId, readAt: now.toISOString() });
    res.json({ message: '읽음 처리 완료' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: '읽음 처리 실패' });
  }
});

export default router;
