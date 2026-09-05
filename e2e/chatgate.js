// 채팅 요청 게이트 소켓 검증 — pending 방에서 전송이 차단되는지 / accepted 후 전달되는지.
// argv: token roomId
// stdout: RESULT:DELIVERED | RESULT:BLOCKED:<msg> | RESULT:TIMEOUT
const path = require('path');
const { io } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'socket.io-client'));

const [token, roomId] = process.argv.slice(2);
const socket = io('http://localhost:4001', { auth: { token } });

const timer = setTimeout(() => { console.log('RESULT:TIMEOUT'); process.exit(0); }, 8000);

socket.on('connect', () => {
  socket.emit('join_room', roomId);
  setTimeout(() => socket.emit('send_message', { roomId, content: '게이트 테스트 메시지' }), 300);
});
socket.on('new_message', (m) => {
  if (m.roomId === roomId && m.content === '게이트 테스트 메시지') {
    clearTimeout(timer); console.log('RESULT:DELIVERED'); process.exit(0);
  }
});
socket.on('room_error', (e) => {
  clearTimeout(timer); console.log('RESULT:BLOCKED:' + (e.error || '')); process.exit(0);
});
socket.on('connect_error', (e) => {
  clearTimeout(timer); console.log('RESULT:CONNECT_ERROR:' + e.message); process.exit(0);
});
