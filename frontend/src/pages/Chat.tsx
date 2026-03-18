import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, getUser, getToken, SERVER_URL, uploadImages } from '../api';

interface Message {
  id: string;
  content: string;
  imageUrl: string | null;
  type: string;
  senderId: string;
  sender: { id: string; name: string; profileImage?: string };
  createdAt: string;
}

interface ChatRoomInfo {
  id: string;
  user1: { id: string; name: string };
  user2: { id: string; name: string };
}

const Chat = () => {
  const { chatId } = useParams();
  const location = useLocation();
  const state = location.state as {
    seller?: string; sellerId?: string; productName?: string; productImage?: string; productPrice?: number; backTo?: string;
  } | null;

  const user = getUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [otherName, setOtherName] = useState(state?.seller || '판매자');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasProductInfo = !!(state?.productName && state?.productPrice);
  const backPath = state?.backTo || '/chat/rooms';

  const markAsRead = (id: string) => {
    api(`/chat/rooms/${id}/read`, { method: 'PUT' }).catch(() => { /* ignore */ });
  };

  const connectToRoom = (id: string) => {
    const token = getToken();
    if (!token) return;
    setRoomId(id);
    api<Message[]>(`/chat/rooms/${id}/messages`).then(setMessages);
    markAsRead(id);

    const socket = io(SERVER_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', id);
    });
    socket.on('new_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      markAsRead(id);
    });
    socket.on('disconnect', () => setConnected(false));
  };

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    if (state?.sellerId) {
      // 상품에서 채팅하기로 진입 -> 방 생성/조회
      api<{ id: string }>('/chat/rooms', {
        method: 'POST',
        body: { targetUserId: state.sellerId, productName: state.productName || undefined },
      }).then(room => connectToRoom(room.id));
    } else if (chatId) {
      // 채팅 목록에서 진입 -> roomId로 바로 연결 + 상대방 정보 조회
      connectToRoom(chatId);
      api<ChatRoomInfo>(`/chat/rooms/${chatId}`).then(room => {
        const other = room.user1.id === user.id ? room.user2 : room.user1;
        setOtherName(other.name);
      }).catch(() => {});
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !roomId || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomId, content: input.trim() });
    setInput('');
  };

  const sendPriceOffer = () => {
    const price = parseInt(priceInput);
    if (!price || price <= 0 || !roomId || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomId, content: String(price), type: 'price_offer' });
    setShowPriceModal(false);
    setPriceInput('');
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
          <Link to={backPath} className="text-gray-400 hover:text-gray-900 transition-colors text-sm">&larr;</Link>
          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-sm">👤</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-gray-900">{otherName}</div>
            <div className="text-[10px] text-gray-400">{connected ? '온라인' : '연결 중...'}</div>
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-mint' : 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Product Info - 상품에서 진입했을 때만 표시 */}
      {hasProductInfo && (
        <div className="card p-3 mb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl overflow-hidden">
            {state!.productImage!.startsWith('http') || state!.productImage!.startsWith('/') ? (
              <img src={state!.productImage!.startsWith('/') ? `${SERVER_URL}${state!.productImage}` : state!.productImage} alt="" className="w-full h-full object-cover" />
            ) : (
              state!.productImage
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-gray-900 truncate">{state!.productName}</div>
            <div className="text-sm font-bold text-mint">{state!.productPrice!.toLocaleString()}원</div>
          </div>
          {state!.backTo && (
            <Link to={state!.backTo} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-[11px] border border-gray-300 hover:bg-gray-200 transition-colors flex-shrink-0">
              상품보기
            </Link>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 px-1">
        <div className="text-center text-[10px] text-gray-400 py-2">
          거래는 당사자 간 직접 진행됩니다. 안전거래를 이용해주세요.
        </div>
        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          const isPriceOffer = msg.type === 'price_offer';

          if (isPriceOffer) {
            const priceVal = parseInt(msg.content);
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  {!isMe && <div className="text-[10px] text-gray-400 mb-1">{msg.sender.name}</div>}
                  <div className={`rounded-2xl border-2 p-4 ${isMe ? 'border-accent bg-accent/5' : 'border-mint bg-mint/5'}`}>
                    <div className="text-[10px] font-medium text-gray-400 mb-1">가격 제안</div>
                    <div className={`text-lg font-black ${isMe ? 'text-accent' : 'text-mint'}`}>
                      {isNaN(priceVal) ? msg.content : `${priceVal.toLocaleString()}원`}
                    </div>
                  </div>
                  <div className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          }

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
                {(!msg.imageUrl || (msg.content !== '사진을 보냈습니다.' && msg.content !== '동영상을 보냈습니다.')) && (
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
        <button
          onClick={() => setShowPriceModal(true)}
          disabled={!connected}
          className="p-2.5 bg-mint/10 text-mint rounded-lg border border-mint/30 hover:bg-mint/20 transition-colors active:scale-95 disabled:opacity-30 flex-shrink-0 text-xs font-bold"
          title="가격 제안"
        >
          ₩
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

      {/* Price Offer Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPriceModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm border border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">가격 제안</h3>
            <p className="text-xs text-gray-400 mb-4">제안할 가격을 입력하세요</p>
            <div className="relative mb-5">
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-lg font-bold placeholder-gray-300 focus:outline-none pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowPriceModal(false); setPriceInput(''); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-200 transition-colors">취소</button>
              <button onClick={sendPriceOffer} disabled={!priceInput || parseInt(priceInput) <= 0} className="flex-1 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">제안하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
