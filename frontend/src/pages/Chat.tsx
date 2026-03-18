import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, getUser, getToken, SERVER_URL } from '../api';

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; name: string };
  createdAt: string;
}

const Chat = () => {
  const { productId } = useParams();
  const location = useLocation();
  const { seller, sellerId, productName, productImage, productPrice } = (location.state as {
    seller: string; sellerId: string; productName: string; productImage: string; productPrice: number;
  }) || { seller: '판매자', sellerId: '', productName: '상품', productImage: '📦', productPrice: 0 };

  const user = getUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !sellerId) return;

    const token = getToken();
    if (!token) return;

    api<{ id: string }>('/chat/rooms', {
      method: 'POST',
      body: { targetUserId: sellerId, productId },
    }).then(room => {
      setRoomId(room.id);

      api<Message[]>(`/chat/rooms/${room.id}/messages`).then(setMessages);

      const socket = io(SERVER_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join_room', room.id);
      });
      socket.on('new_message', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
      });
      socket.on('disconnect', () => setConnected(false));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !roomId || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomId, content: input.trim() });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <p className="text-gray-400 mb-4">로그인이 필요합니다.</p>
        <Link to="/login" className="text-primary-dark hover:underline text-sm">로그인하기</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-3">
          <Link to={`/used/${productId}`} className="text-gray-400 hover:text-gray-900 transition-colors text-sm">←</Link>
          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-sm">👤</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-gray-900">{seller}</div>
            <div className="text-[10px] text-gray-400">{connected ? '온라인' : '연결 중...'}</div>
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-mint' : 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Product Info */}
      <div className="card p-3 mb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl">{productImage}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-900 truncate">{productName}</div>
          <div className="text-sm font-bold text-mint">{productPrice.toLocaleString()}원</div>
        </div>
        <Link to={`/used/${productId}`} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-[11px] border border-gray-300 hover:bg-gray-200 transition-colors flex-shrink-0">
          상품보기
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 px-1">
        <div className="text-center text-[10px] text-gray-400 py-2">
          거래는 당사자 간 직접 진행됩니다. 안전거래를 이용해주세요.
        </div>
        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {!isMe && <div className="text-[10px] text-gray-400 mb-1">{msg.sender.name}</div>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-700 rounded-bl-md border border-gray-300'
                }`}>
                  {msg.content}
                </div>
                <div className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="card p-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !connected}
          className="px-4 py-2.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default Chat;
