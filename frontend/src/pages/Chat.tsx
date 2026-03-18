import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, getUser, getToken, SERVER_URL, uploadImages } from '../api';

interface Message {
  id: string;
  content: string;
  imageUrl: string | null;
  senderId: string;
  sender: { id: string; name: string };
  createdAt: string;
}

const Chat = () => {
  const { chatId } = useParams();
  const location = useLocation();
  const { seller, sellerId, productName, productImage, productPrice, backTo } = (location.state as {
    seller: string; sellerId: string; productName: string; productImage: string; productPrice: number; backTo?: string;
  }) || { seller: '판매자', sellerId: '', productName: '', productImage: '💬', productPrice: 0 };
  const backPath = backTo || '/chat/rooms';

  const user = getUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectToRoom = (id: string) => {
    const token = getToken();
    if (!token) return;
    setRoomId(id);
    api<Message[]>(`/chat/rooms/${id}/messages`).then(setMessages);

    const socket = io(SERVER_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', id);
    });
    socket.on('new_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('disconnect', () => setConnected(false));
  };

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    if (sellerId) {
      // 상품에서 채팅하기로 진입 → 방 생성/조회
      api<{ id: string }>('/chat/rooms', {
        method: 'POST',
        body: { targetUserId: sellerId, productName: productName || undefined },
      }).then(room => connectToRoom(room.id));
    } else if (chatId) {
      // 채팅 목록에서 진입 → roomId로 바로 연결
      connectToRoom(chatId);
    }

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !roomId || !socketRef.current) return;
    e.target.value = '';
    setUploading(true);
    try {
      const urls = await uploadImages(files);
      for (const url of urls) {
        const isVideo = url.includes('/video/');
        socketRef.current.emit('send_message', {
          roomId,
          content: isVideo ? '동영상을 보냈습니다.' : '사진을 보냈습니다.',
          imageUrl: url,
        });
      }
    } catch {
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
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
          <Link to={backPath} className="text-gray-400 hover:text-gray-900 transition-colors text-sm">←</Link>
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
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl overflow-hidden">
          {productImage.startsWith('http') || productImage.startsWith('/') ? (
            <img src={productImage.startsWith('/') ? `${SERVER_URL}${productImage}` : productImage} alt="" className="w-full h-full object-cover" />
          ) : (
            productImage
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-900 truncate">{productName}</div>
          <div className="text-sm font-bold text-mint">{productPrice.toLocaleString()}원</div>
        </div>
        <Link to={backPath} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-[11px] border border-gray-300 hover:bg-gray-200 transition-colors flex-shrink-0">
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
                {msg.imageUrl && (
                  msg.imageUrl.includes('/video/') ? (
                    <video src={msg.imageUrl} controls className="rounded-2xl max-w-full mb-1" style={{ maxHeight: 240 }} />
                  ) : (
                    <img
                      src={msg.imageUrl}
                      alt=""
                      className="rounded-2xl max-w-full cursor-pointer mb-1"
                      style={{ maxHeight: 240 }}
                      onClick={() => setFullImage(msg.imageUrl)}
                    />
                  )
                )}
                {(!msg.imageUrl || msg.content !== '사진을 보냈습니다.' && msg.content !== '동영상을 보냈습니다.') && (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-700 rounded-bl-md border border-gray-300'
                  }`}>
                    {msg.content}
                  </div>
                )}
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
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!connected || uploading}
          className="p-2.5 bg-gray-100 text-gray-500 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors active:scale-95 disabled:opacity-30 flex-shrink-0"
        >
          {uploading ? (
            <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin block" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          )}
        </button>
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

      {/* Full Image Viewer */}
      {fullImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullImage(null)}>
          <button className="absolute top-4 right-4 text-white text-2xl" onClick={() => setFullImage(null)}>✕</button>
          <img src={fullImage} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default Chat;
