// Buyer sends a message with seller OFFLINE -> triggers a 'chat' DB notification for seller.
// argv: buyerToken roomId
const path = require('path');
// repo 상대 경로 — e2e/ 는 repo 루트에 있고 socket.io-client 는 backend 의존성
const { io } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'socket.io-client'));
const [,, buyerToken, roomId] = process.argv;
const s = io('http://localhost:4001', { auth: { token: buyerToken }, transports: ['websocket'], reconnection: false });
s.on('connect', () => {
  s.emit('join_room', roomId);
  setTimeout(() => {
    s.emit('send_message', { roomId, content: '판매자 오프라인일 때 알림 테스트 메시지', type: 'text' });
    setTimeout(() => { s.close(); console.log('sent'); process.exit(0); }, 1500);
  }, 400);
});
s.on('connect_error', (e) => { console.log('connect_error ' + e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); process.exit(1); }, 8000);
