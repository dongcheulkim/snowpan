// 소켓으로 메시지 1건 보내기 — argv: token roomId content. 성공하면 'sent', 방 접근 거부면 'room_error <msg>'.
const path = require('path');
const { io } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'socket.io-client'));
const [,, token, roomId, content] = process.argv;
const s = io('http://localhost:4001', { auth: { token }, transports: ['websocket'], reconnection: false });
let done = false;
const finish = (msg, code) => { if (done) return; done = true; console.log(msg); s.close(); process.exit(code); };
s.on('connect', () => {
  s.emit('join_room', roomId);
  setTimeout(() => {
    s.emit('send_message', { roomId, content: content || '테스트 메시지', type: 'text' });
    setTimeout(() => finish('sent', 0), 1200);
  }, 400);
});
s.on('room_error', (e) => finish('room_error ' + (e && e.error), 2));
s.on('connect_error', (e) => finish('connect_error ' + e.message, 1));
setTimeout(() => finish('timeout', 1), 8000);
