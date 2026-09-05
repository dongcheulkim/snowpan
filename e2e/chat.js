// Socket.IO real message exchange between buyer and seller.
// argv: buyerToken sellerToken roomId buyerNick sellerNick
const path = require('path');
// repo 상대 경로 — e2e/ 는 repo 루트에 있고 socket.io-client 는 backend 의존성
const { io } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'socket.io-client'));

const [,, buyerToken, sellerToken, roomId, buyerNick, sellerNick] = process.argv;
const URL = 'http://localhost:4001';
const result = { events: [], errors: [] };

function mk(name, token) {
  const s = io(URL, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 8000 });
  s.on('connect_error', (e) => result.errors.push(`${name} connect_error: ${e.message}`));
  s.on('room_error', (e) => result.errors.push(`${name} room_error: ${JSON.stringify(e)}`));
  s.on('rate_limited', (e) => result.errors.push(`${name} rate_limited: ${JSON.stringify(e)}`));
  return s;
}

(async () => {
  const buyer = mk('buyer', buyerToken);
  const seller = mk('seller', sellerToken);

  const connected = (s, name) => new Promise((res, rej) => {
    s.on('connect', () => res(true));
    s.on('connect_error', (e) => rej(new Error(`${name}: ${e.message}`)));
    setTimeout(() => rej(new Error(`${name} connect timeout`)), 8000);
  });

  try {
    await Promise.all([connected(buyer, 'buyer'), connected(seller, 'seller')]);
    result.connected = true;
  } catch (e) {
    result.connected = false;
    result.errors.push(String(e.message));
    console.log(JSON.stringify(result)); process.exit(0);
  }

  buyer.emit('join_room', roomId);
  seller.emit('join_room', roomId);
  await new Promise(r => setTimeout(r, 600));

  // seller waits for buyer's message
  const sellerGot = new Promise((res) => {
    seller.on('new_message', (m) => { if (m.senderId && m.content && m.content.includes('구매 문의')) res(m); });
  });
  const buyerGot = new Promise((res) => {
    buyer.on('new_message', (m) => { if (m.content && m.content.includes('네 안녕하세요')) res(m); });
  });

  buyer.emit('send_message', { roomId, content: '안녕하세요 스키 구매 문의드려요', type: 'text' });
  const m1 = await Promise.race([sellerGot, new Promise(r => setTimeout(() => r(null), 6000))]);
  if (m1) {
    result.sellerReceived = { content: m1.content, senderName: m1.sender && m1.sender.name, senderId: m1.senderId };
  } else result.errors.push('seller did not receive buyer message');

  seller.emit('send_message', { roomId, content: '네 안녕하세요 판매 가능합니다', type: 'text' });
  const m2 = await Promise.race([buyerGot, new Promise(r => setTimeout(() => r(null), 6000))]);
  if (m2) {
    result.buyerReceived = { content: m2.content, senderName: m2.sender && m2.sender.name, senderId: m2.senderId };
  } else result.errors.push('buyer did not receive seller reply');

  result.expect = { buyerNick, sellerNick };
  buyer.close(); seller.close();
  console.log(JSON.stringify(result));
  process.exit(0);
})();
