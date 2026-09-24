import { Router, Response } from 'express';
import prisma from '../config/database';
import { getAdminIds, roomAccessWhere, adminSideOf, viewerOf, sideOf, staffLinkOf, isParticipant, shopSideOf, unreadByRoom } from '../utils/supportInbox';
import { linkRoomIfShopInquiry } from '../utils/chatRoomShops';
import { isBlockedEither, BLOCKED_CHAT_MESSAGE } from '../utils/blocks';
import { displayName } from '../utils/displayName';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from '../utils/push';

const router = Router();

// 채팅 요청 남발 방지 — 유저당 1시간에 신규 요청 10건 (콜드 DM 스팸 캡).
// 인메모리 (재시작 초기화 OK — 남발 억제가 목적이지 정확한 회계가 아님).
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const REQ_CAP = 10;
const REQ_WINDOW_MS = 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of requestBuckets) if (now >= v.resetAt) requestBuckets.delete(k);
}, 10 * 60 * 1000);
function takeRequestToken(userId: string): boolean {
  const now = Date.now();
  let b = requestBuckets.get(userId);
  if (!b || now >= b.resetAt) { b = { count: 0, resetAt: now + REQ_WINDOW_MS }; requestBuckets.set(userId, b); }
  if (b.count >= REQ_CAP) return false;
  b.count++;
  return true;
}

// 내 채팅방 목록 (with unread count)
router.get('/rooms', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const viewer = await viewerOf(userId, req.user.role); // 관리자 목록 + 직원인 매장 목록
    const allRooms = await prisma.chatRoom.findMany({
      where: {
        ...(await roomAccessWhere(userId, req.user.role)),
        // 거절 방은 거절한 쪽에서만 숨김 — 요청자에겐 계속 보여야 '목록에서 사라짐=거절' 신호가 안 샘
        NOT: { status: 'declined', requestedBy: { not: userId } },
      },
      include: {
        user1: { select: { id: true, name: true, nickname: true, profileImage: true } },
        user2: { select: { id: true, name: true, nickname: true, profileImage: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }, // 목록 미리보기용 마지막 메시지
        shops: true, // 매장 연결 (직원 공동 응대·매장명 표시)
        // _count 제거 — 방마다 전체 메시지 카운트 서브쿼리를 돌렸으나 응답에서 버려지던 순수 낭비
      },
      orderBy: { updatedAt: 'desc' },
      take: 80,
    });
    // "대화 삭제"한 방은 내 쪽에서만 숨김 — 숨긴 뒤 새 메시지가 왔으면 다시 보인다 (상대 내역은 항상 유지)
    const rooms = allRooms.filter((room) => {
      const side = sideOf(room, viewer);
      const hiddenAt = side === 1 ? room.user1HiddenAt : side === 2 ? room.user2HiddenAt : null;
      if (!hiddenAt) return true;
      const last = room.messages[0];
      return !!last && last.createdAt > hiddenAt;
    }).slice(0, 50);

    // 방별 안읽음 — 내 쪽(나 / 관리자 전원 / 매장의 사장님+직원)이 아닌 사람이 내 쪽 읽음 시각 뒤에 보낸 메시지 수 (unnest 한 쿼리)
    const unreadCounts = await unreadByRoom(rooms, viewer);

    const roomsWithUnread = rooms.map(room => {
      const side = sideOf(room, viewer);
      return {
        ...room,
        // 요청자에게 거절 사실 비노출 — declined 를 pending 으로 위장 (여기 도달한 declined 는 전부 요청자 본인 것)
        status: room.status === 'declined' ? 'pending' : room.status,
        user1: { ...room.user1, name: displayName(room.user1) },
        user2: { ...room.user2, name: displayName(room.user2) },
        unreadCount: unreadCounts[room.id] || 0,
        // 공용 받은편지함: 관리자가 자기 방이 아닌 고객센터 방을 볼 때 "상대"를 서버가 정해준다
        mySide: side,
        otherUser: side ? { ...(side === 1 ? room.user2 : room.user1), name: displayName(side === 1 ? room.user2 : room.user1) } : null,
        // 매장 연결 방 — 목록에 매장명, 내 자리가 매장 쪽(사장님·직원)인지
        shop: room.shops[0] ? { shopType: room.shops[0].shopType, shopId: room.shops[0].shopId, name: room.shops[0].shopName } : null,
        viewerRole: room.shops.length ? (room.shops.some((l) => l.ownerUserId === (side === 1 ? room.user1Id : room.user2Id)) ? 'shop' : 'customer') : null,
      };
    });

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
    // 탈퇴/정지 구분 비노출 — 제재 상태 조회 오라클 차단 (둘 다 대화 불가)
    if (target.role === 'deleted' || target.role === 'banned') {
      res.status(410).json({ error: '대화할 수 없는 사용자입니다.' });
      return;
    }
    // 차단 관계면 어느 쪽이든 방을 열 수 없음 (방향은 노출하지 않음)
    if (await isBlockedEither(userId, targetUserId)) { res.status(403).json({ error: BLOCKED_CHAT_MESSAGE }); return; }

    const [u1, u2] = [userId, targetUserId].sort();

    // upsert — "채팅하기" 더블탭 등 동시 요청 2건이 둘 다 create 를 타서
    // 두 번째가 unique 위반 500 나던 race 차단. 원자적으로 기존 방 반환.
    const existing = await prisma.chatRoom.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      select: { id: true, status: true, requestedBy: true },
    });
    const isNewRoom = !existing;
    let room = await prisma.chatRoom.upsert({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      create: { user1Id: u1, user2Id: u2 },
      update: {},
    });
    // 요청 대기/거절 방 승격 — 상대방(수신자)이 직접 대화를 개시한 경우만 (=동의).
    // productName 은 클라이언트 임의 문자열이라 승격 근거가 될 수 없음 (검증 감사에서
    // 요청자가 아무 문자열로 수락 게이트를 우회하던 CRITICAL 확인 → 조건에서 제거).
    if (existing && existing.status !== 'accepted' && existing.requestedBy !== userId) {
      room = await prisma.chatRoom.update({ where: { id: room.id }, data: { status: 'accepted', requestedBy: null } });
    }
    // 성사 전(pending/declined) 방엔 어떤 메시지도 새로 만들지 않음 — 요청자가
    // 매물문의 메시지로 수락 전 메시지를 밀어넣던 구멍 차단. 방 정보만 반환.
    // (거절 비노출 — 요청자에겐 declined 도 pending 으로 위장)
    if (room.status !== 'accepted') {
      res.json({ ...room, status: room.status === 'declined' && room.requestedBy === userId ? 'pending' : room.status });
      return;
    }

    // 관리자 채팅방 새로 생성 시 관리자 자동 인사 (위에서 이미 fetch 한 target 재사용).
    if (isNewRoom && !productName && target.role === 'admin') {
      await prisma.message.create({
        data: { roomId: room.id, senderId: targetUserId, content: '안녕하세요! 무엇을 도와드릴까요?', type: 'text' },
      });
      await prisma.chatRoom.update({ where: { id: room.id }, data: { updatedAt: new Date() } });
    }

    // 매장 페이지에서 온 문의면 방을 매장에 연결 — 직원도 같이 보고 답할 수 있게 (상대가 그 매장 사장님일 때만).
    // 문의 카드보다 먼저 연결해야 직원에게 카드부터 보인다 (직원은 연결 시점 이후 메시지만 봄).
    await linkRoomIfShopInquiry(room.id, productPath, [userId, targetUserId]).catch((e) => console.warn('chat room shop link failed:', e instanceof Error ? e.message : e));

    // 상품명이 있으면 안내 메시지 자동 전송
    if (productName) {
      // productName 은 길이 제한, productPath 는 내부 경로만 허용 — 상대방 채팅에 외부 링크(오픈리다이렉트/피싱) 심는 것 차단.
      const safeName = typeof productName === 'string' ? productName.slice(0, 100) : '';
      const safePath = typeof productPath === 'string' && productPath.startsWith('/') && !productPath.startsWith('//') && !productPath.includes(':')
        ? productPath.slice(0, 300)
        : null;
      const lastMsg = await prisma.message.findFirst({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
      });
      const noticeContent = JSON.stringify({ productName: safeName, productPath: safePath });
      let isAlreadySent = false;
      try { isAlreadySent = lastMsg?.type === 'product_inquiry' && JSON.parse(lastMsg.content || '{}').productName === safeName; } catch {}
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

// ───────── 채팅 요청 (커뮤니티 등 콜드 DM) ─────────
// 프로필에서 "채팅 요청하기" — 첫 메시지와 함께 pending 방 생성, 상대가 수락해야 대화 시작.
// 매물 문의(POST /rooms)는 기존대로 즉시 성사 — 이 게이트는 비거래 DM 의 동의 절차.
router.post('/requests', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { targetUserId, message } = req.body;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!targetUserId || typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId)) {
      res.status(400).json({ error: 'targetUserId 가 필요합니다.' });
      return;
    }
    if (targetUserId === userId) {
      res.status(400).json({ error: '자기 자신에게는 요청할 수 없습니다.' });
      return;
    }
    const firstMsg = typeof message === 'string' ? message.trim().slice(0, 500) : '';
    if (!firstMsg) {
      res.status(400).json({ error: '첫 메시지를 입력해주세요.' });
      return;
    }
    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, role: true } });
    if (!target) { res.status(404).json({ error: '대상 사용자를 찾을 수 없습니다.' }); return; }
    // 탈퇴/정지 를 구분 노출하지 않음 — 임의 userId 의 제재 상태를 조회하는 오라클 차단
    if (target.role === 'deleted' || target.role === 'banned') {
      res.status(410).json({ error: '대화할 수 없는 사용자입니다.' });
      return;
    }
    if (await isBlockedEither(userId, targetUserId)) { res.status(403).json({ error: BLOCKED_CHAT_MESSAGE }); return; }

    const [u1, u2] = [userId, targetUserId].sort();
    const existing = await prisma.chatRoom.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      select: { id: true, status: true, requestedBy: true },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        // 이미 대화 가능한 방 — 그대로 안내 (프론트가 방으로 이동)
        res.json({ id: existing.id, status: 'accepted' });
        return;
      }
      if (existing.requestedBy === userId) {
        // 내 요청이 대기/거절 상태 — 스팸 재요청 차단 (거절 여부는 노출하지 않음)
        res.status(409).json({ error: '이미 채팅 요청을 보냈어요. 상대가 수락하면 대화할 수 있어요.' });
        return;
      }
      // 상대가 먼저 보낸 요청이 있던 것 — 상호 관심 = 즉시 성사 + 내 메시지 추가
      const [, mutualMsg] = await prisma.$transaction([
        prisma.chatRoom.update({ where: { id: existing.id }, data: { status: 'accepted', requestedBy: null, updatedAt: new Date() } }),
        prisma.message.create({
          data: { roomId: existing.id, senderId: userId, content: firstMsg, type: 'text' },
          include: { sender: { select: { id: true, name: true, nickname: true, profileImage: true } } },
        }),
      ]);
      // 상호성사도 알림·소켓 전달 — 기존엔 조용히 성사돼 상대(원요청자)가 모르던 것
      {
        const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } });
        const myName = me ? displayName(me) : '스노우판 회원';
        createNotification(targetUserId, 'chat', '채팅 요청 수락', `${myName}님과의 채팅이 시작됐어요.`, `/chat/${existing.id}`).catch(() => {});
        sendPushToUser(targetUserId, '채팅 시작', `${myName}님과의 채팅이 시작됐어요`, `/chat/${existing.id}`).catch(() => {});
        const io2 = req.app.get('io');
        if (io2) io2.to(`room:${existing.id}`).emit('new_message', { ...mutualMsg, sender: { ...mutualMsg.sender, name: mutualMsg.sender.nickname || mutualMsg.sender.name } });
      }
      res.json({ id: existing.id, status: 'accepted' });
      return;
    }

    // 유저당 신규 요청 캡 — 여기서 소모 (기존 방 경로는 캡 미소모)
    if (!takeRequestToken(userId)) {
      res.status(429).json({ error: '채팅 요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
      return;
    }

    // 방+첫 메시지 원자 생성. 동시 더블탭 → 두 번째가 unique(P2002) → 409 로 처리 (500 아님)
    let room;
    try {
      [room] = await prisma.$transaction(async (tx) => {
        const r = await tx.chatRoom.create({ data: { user1Id: u1, user2Id: u2, status: 'pending', requestedBy: userId } });
        await tx.message.create({ data: { roomId: r.id, senderId: userId, content: firstMsg, type: 'text' } });
        return [r];
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        res.status(409).json({ error: '이미 채팅 요청을 보냈어요. 상대가 수락하면 대화할 수 있어요.' });
        return;
      }
      throw e;
    }

    // 상대에게 알림 + 푸시 (닉네임 표시)
    const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } });
    const senderName = sender ? displayName(sender) : '스노우판 회원';
    const preview = firstMsg.length > 30 ? `${firstMsg.slice(0, 30)}...` : firstMsg;
    createNotification(targetUserId, 'chat', '새 채팅 요청', `${senderName}님이 채팅을 요청했어요: ${preview}`, `/chat/${room.id}`).catch(() => {});
    sendPushToUser(targetUserId, '새 채팅 요청', `${senderName}님이 채팅을 요청했어요`, `/chat/${room.id}`).catch(() => {});
    const io = req.app.get('io');
    if (io) io.to(`user:${targetUserId}`).emit('new_notification', { type: 'chat', title: '새 채팅 요청', message: `${senderName}님이 채팅을 요청했어요` });

    res.status(201).json({ id: room.id, status: 'pending' });
  } catch (error) {
    console.error('Chat request error:', error);
    res.status(500).json({ error: '채팅 요청 실패' });
  }
});

// 채팅 요청 수락 — 수신자만 가능
router.post('/rooms/:roomId/accept', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    const room = await prisma.chatRoom.findFirst({
      where: { id: roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
    });
    if (!room) { res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' }); return; }
    if (room.status !== 'pending') { res.status(400).json({ error: '수락 대기 중인 요청이 아닙니다.' }); return; }
    if (room.requestedBy === userId) { res.status(403).json({ error: '요청을 보낸 쪽은 수락할 수 없습니다.' }); return; }
    const requesterId = room.requestedBy!;
    // 원자적 CAS — 수락/거절 동시 탭이 상태를 뒤섞던 레이스 차단 (pending 인 경우에만 전이)
    const claimed = await prisma.chatRoom.updateMany({ where: { id: roomId, status: 'pending' }, data: { status: 'accepted', requestedBy: null, updatedAt: new Date() } });
    if (claimed.count === 0) { res.status(409).json({ error: '이미 처리된 요청입니다.' }); return; }
    // 요청자에게 수락 알림
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } });
    const myName = me ? displayName(me) : '스노우판 회원';
    createNotification(requesterId, 'chat', '채팅 요청 수락', `${myName}님이 채팅 요청을 수락했어요. 대화를 시작해보세요!`, `/chat/${roomId}`).catch(() => {});
    sendPushToUser(requesterId, '채팅 요청 수락', `${myName}님이 채팅 요청을 수락했어요`, `/chat/${roomId}`).catch(() => {});
    res.json({ id: roomId, status: 'accepted' });
  } catch (error) {
    console.error('Chat request accept error:', error);
    res.status(500).json({ error: '요청 수락 실패' });
  }
});

// 채팅 요청 거절 — 수신자만. 소프트 거절: 방은 declined 로 남고(재요청 차단용)
// 목록에서만 사라짐. 요청자에겐 거절 사실을 따로 알리지 않음 (계속 '대기중'으로 보임).
router.post('/rooms/:roomId/decline', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    const room = await prisma.chatRoom.findFirst({
      where: { id: roomId, OR: [{ user1Id: userId }, { user2Id: userId }] },
    });
    if (!room) { res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' }); return; }
    if (room.status !== 'pending') { res.status(400).json({ error: '수락 대기 중인 요청이 아닙니다.' }); return; }
    if (room.requestedBy === userId) { res.status(403).json({ error: '요청을 보낸 쪽은 거절할 수 없습니다.' }); return; }
    const claimed = await prisma.chatRoom.updateMany({ where: { id: roomId, status: 'pending' }, data: { status: 'declined' } });
    if (claimed.count === 0) { res.status(409).json({ error: '이미 처리된 요청입니다.' }); return; }
    res.json({ id: roomId, status: 'declined' });
  } catch (error) {
    console.error('Chat request decline error:', error);
    res.status(500).json({ error: '요청 거절 실패' });
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
    // 성사 전(pending/declined) 방은 요청자가 삭제 불가 — 삭제 후 재요청으로
    // 거절당한 상대에게 알림 스팸을 반복하는 루프 차단 (수신자 삭제는 허용)
    if (room.status !== 'accepted' && room.requestedBy === userId) {
      res.status(403).json({ error: '수락 대기 중인 채팅 요청은 삭제할 수 없습니다.' });
      return;
    }
    // 실제로 지우지 않고 내 쪽만 숨긴다 — 상대방 화면과 기록은 그대로 남아 중고거래 사기·욕설·비방 분쟁 때 근거가 된다
    // (사용자 결정 2026-09-13). 숨긴 시점까지 읽음 처리해 옛 메시지가 안읽음으로 남지 않게 한다.
    const now = new Date();
    const mine = room.user1Id === userId ? { user1HiddenAt: now, user1LastReadAt: now } : { user2HiddenAt: now, user2LastReadAt: now };
    await prisma.chatRoom.update({ where: { id: roomId }, data: mine });
    res.json({ success: true, hidden: true });
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
      where: { id: roomId, ...(await roomAccessWhere(userId, req.user.role)) },
      include: {
        user1: { select: { id: true, name: true, nickname: true, profileImage: true } },
        user2: { select: { id: true, name: true, nickname: true, profileImage: true } },
        shops: true,
      },
    });
    if (!room) { res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' }); return; }
    // 거절 비노출 — 요청자가 단건 조회해도 pending 으로 보임
    const shownStatus = room.status === 'declined' && room.requestedBy === userId ? 'pending' : room.status;
    const allAdminIds = await getAdminIds();
    const adminIds = req.user.role === 'admin' ? allAdminIds : [];
    const viewer = await viewerOf(userId, req.user.role);
    const side = sideOf(room, viewer);
    // 매장 연결 방: 매장 쪽 사람들(사장님+직원)과 라벨, 내 자리가 매장 쪽인지
    const shopSide = room.shops.length ? await shopSideOf(room) : { ids: [] as string[], labels: {} as Record<string, string> };
    const mySideUser = side === 1 ? room.user1Id : side === 2 ? room.user2Id : null;
    const onShopSide = !!mySideUser && room.shops.some((l) => l.ownerUserId === mySideUser);
    res.json({
      ...room, status: shownStatus,
      // 고객센터 방 여부 — 손님 화면에 안내 메뉴(고정)를 띄우는 기준
      isSupportRoom: adminSideOf(room, allAdminIds) !== null,
      user1: { ...room.user1, name: displayName(room.user1) }, user2: { ...room.user2, name: displayName(room.user2) },
      mySide: side,
      otherUser: side ? { ...(side === 1 ? room.user2 : room.user1), name: displayName(side === 1 ? room.user2 : room.user1) } : null,
      // 관리자끼리 보낸 메시지는 전부 "내 쪽" 말풍선으로 — 클라이언트가 senderId 로 정렬할 때 씀
      supportAdminIds: req.user.role === 'admin' && adminSideOf(room, adminIds) ? adminIds : [],
      // 매장 연결 방 (직원 공동 응대): 매장명, 내 역할, 내 쪽 전원(사장님+직원 — 내 말풍선으로), 라벨(사장님/직원)
      shop: room.shops[0] ? { shopType: room.shops[0].shopType, shopId: room.shops[0].shopId, name: room.shops[0].shopName } : null,
      viewerRole: room.shops.length ? (onShopSide ? 'shop' : 'customer') : null,
      sideIds: onShopSide ? shopSide.ids : [],
      sideLabels: shopSide.labels,
    });
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
    // 채팅방 멤버인지 확인 (관리자는 고객센터 방 전체)
    const room = await prisma.chatRoom.findFirst({
      where: { id: roomId, ...(await roomAccessWhere(userId, req.user.role)) },
      include: { shops: true },
    });
    if (!room) { res.status(403).json({ error: '접근 권한이 없습니다.' }); return; }
    // 내가 "대화 삭제"한 시점 이전 메시지는 내 화면에서만 제외 (상대는 전부 봄)
    const viewer = await viewerOf(userId, req.user.role);
    const side = sideOf(room, viewer);
    const hiddenAt = side === 1 ? room.user1HiddenAt : side === 2 ? room.user2HiddenAt : null;
    // 직원(참여자 아님)은 매장에 연결된 시점 이후 메시지만 — 그 전 사장님 개인 대화는 안 보임
    const staffLink = isParticipant(room, userId) ? null : staffLinkOf(room, viewer);
    const cutoffs = [hiddenAt, staffLink ? new Date(staffLink.createdAt.getTime() - 1) : null].filter((d): d is Date => !!d);
    const from = cutoffs.length ? new Date(Math.max(...cutoffs.map((d) => d.getTime()))) : null;
    const messages = await prisma.message.findMany({
      where: { roomId, ...(from ? { createdAt: { gt: from } } : {}) },
      include: { sender: { select: { id: true, name: true, nickname: true, profileImage: true } } },
      orderBy: { createdAt: 'asc' },
    });
    // 상대 실명 비노출 — 표시명(닉네임 우선)으로 치환 (rooms 목록과 정책 통일)
    res.json(messages.map((m) => ({ ...m, sender: { ...m.sender, name: m.sender.nickname || m.sender.name } })));
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
      where: { id: roomId, ...(await roomAccessWhere(userId, req.user.role)) },
      include: { shops: true },
    });
    if (!room) { res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' }); return; }

    const now = new Date();
    // 관리자가 남의 고객센터 방을 읽으면 관리자 쪽, 직원이 매장 방을 읽으면 사장님 쪽 읽음 시각을 갱신 (같은 쪽 공용)
    const side = sideOf(room, await viewerOf(userId, req.user.role));
    if (side === 1) {
      await prisma.chatRoom.update({ where: { id: roomId }, data: { user1LastReadAt: now } });
    } else if (side === 2) {
      await prisma.chatRoom.update({ where: { id: roomId }, data: { user2LastReadAt: now } });
    }
    const io = req.app.get('io');
    // 성사 전(pending/declined) 방은 read receipt 미방출 — 수신자가 요청을 '봤다'는
    // 사실이 요청자에게 새는 것 차단 (lastReadAt 자체는 갱신해 뱃지 정리는 정상)
    if (io && room.status === 'accepted') io.to(`room:${roomId}`).emit('room_read', { roomId, userId, readAt: now.toISOString() });
    res.json({ message: '읽음 처리 완료' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: '읽음 처리 실패' });
  }
});

export default router;
