import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, getUser, getToken, SERVER_URL, uploadImages } from '../api';
import { t, onLangChange } from '../i18n';
import ChatBotGuide from '../components/ChatBotGuide';

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
  user1Id: string;
  user2Id: string;
  user1LastReadAt: string | null;
  user2LastReadAt: string | null;
  user1: { id: string; name: string };
  user2: { id: string; name: string };
}

const Chat = () => {
  const { chatId } = useParams();
  const location = useLocation();
  const state = location.state as {
    seller?: string; sellerId?: string; productName?: string; productImage?: string; productPrice?: number; backTo?: string; productPath?: string; isAdmin?: boolean; initialMessage?: string;
  } | null;

  const user = getUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(state?.initialMessage || '');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [otherName, setOtherName] = useState(state?.seller || '판매자');
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLangTick] = useState(0);
  const [isAdminChat, setIsAdminChat] = useState(false);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  const hasProductInfo = !!(state?.productName && state?.productPrice && state?.productImage);
  const backPath = state?.backTo || '/chat/rooms';

  const markAsRead = (id: string) => {
    api(`/chat/rooms/${id}/read`, { method: 'PUT' }).catch(() => { /* ignore */ });
  };

  const connectToRoom = (id: string) => {
    const token = getToken();
    if (!token) return;
    setRoomId(id);
    api<Message[]>(`/chat/rooms/${id}/messages`).then(setMessages);
    api<ChatRoomInfo>(`/chat/rooms/${id}`).then(room => {
      if (!user) return;
      const isUser1 = room.user1Id === user.id;
      setOtherLastReadAt(isUser1 ? room.user2LastReadAt : room.user1LastReadAt);
    }).catch(() => {});
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
    socket.on('room_read', (data: { roomId: string; userId: string; readAt: string }) => {
      if (data.roomId !== id || !user) return;
      if (data.userId !== user.id) setOtherLastReadAt(data.readAt);
    });
    socket.on('disconnect', () => setConnected(false));
  };

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    if (state?.isAdmin) setIsAdminChat(true);

    if (state?.sellerId) {
      // 상품에서 채팅하기로 진입 -> 방 생성/조회
      api<{ id: string }>('/chat/rooms', {
        method: 'POST',
        body: { targetUserId: state.sellerId, productName: state.productName || undefined, productPath: state.productPath || undefined },
      }).then(room => connectToRoom(room.id)).catch(() => {
        alert('채팅방 연결에 실패했습니다.');
      });
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = () => {
    if (!input.trim() || !roomId || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomId, content: input.trim() });
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const sendPriceOffer = () => {
    const price = parseInt(priceInput);
    if (isNaN(price) || price <= 0 || !roomId || !socketRef.current) return;
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
          content: isVideo ? t('chat.sentVideo') : t('chat.sentPhoto'),
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
        <p className="text-gray-400 mb-4">{t('chat.loginRequired')}</p>
        <Link to="/login" className="text-primary-dark hover:underline text-sm">{t('chat.loginLink')}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-2xl mx-auto animate-fade-in overflow-x-hidden">
      {/* Header */}
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-3">
          <Link to={backPath} className="text-gray-400 hover:text-gray-900 transition-colors text-sm">&larr;</Link>
          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-sm">👤</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-gray-900">{otherName}</div>
            <div className="text-[10px] text-gray-400">{connected ? t('chat.online') : t('chat.connecting')}</div>
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
              {t('chat.viewProduct')}
            </Link>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 px-1">
        <div className="text-center py-2 space-y-1">
          <p className="text-[10px] text-gray-400">{t('chat.safetyNotice')}</p>
          <p className="text-[9px] text-gray-300">스노우판은 거래 당사자가 아닌 중개자이며, 거래에 대한 책임을 지지 않습니다. 채팅 내용은 서비스 제공을 위해 저장됩니다.</p>
        </div>
        {isAdminChat && messages.length <= 2 && (
          <ChatBotGuide onSelect={(cat, sub) => {
            if (socketRef.current && roomId && connected) {
              socketRef.current.emit('send_message', { roomId, content: `[문의] ${cat} > ${sub}` });
            }
          }} />
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          const isPriceOffer = msg.type === 'price_offer';
          const isProductInquiry = msg.type === 'product_inquiry';

          if (isProductInquiry) {
            let parsed: { productName?: string; productPath?: string } = {};
            try { parsed = JSON.parse(msg.content); } catch { parsed = { productName: msg.content }; }
            const inner = (
              <div className={`rounded-2xl border-2 p-3.5 ${isMe ? 'border-accent/40 bg-accent/5' : 'border-gray-300 bg-white'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">📦</span>
                  <span className="text-[10px] font-semibold text-gray-400">상품 문의</span>
                </div>
                <p className="text-sm font-bold text-gray-900 leading-snug">
                  "{parsed.productName}" 상품에 대한 문의입니다.
                </p>
                {parsed.productPath && (
                  <p className="text-[10px] text-accent mt-1.5">탭하여 상품 보기 →</p>
                )}
              </div>
            );
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  {!isMe && <div className="text-[10px] text-gray-400 mb-1">{msg.sender.name}</div>}
                  {parsed.productPath ? (
                    <Link to={parsed.productPath} className="block active:opacity-70 transition-opacity">{inner}</Link>
                  ) : inner}
                  <div className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          }

          if (isPriceOffer) {
            const priceVal = parseInt(msg.content);
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  {!isMe && <div className="text-[10px] text-gray-400 mb-1">{msg.sender.name}</div>}
                  <div className={`rounded-2xl border-2 p-4 ${isMe ? 'border-accent bg-accent/5' : 'border-mint bg-mint/5'}`}>
                    <div className="text-[10px] font-medium text-gray-400 mb-1">{t('chat.priceOffer')}</div>
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
                    <video src={msg.imageUrl} controls className="rounded-2xl max-w-full w-full mb-1" style={{ maxHeight: 240 }} />
                  ) : (
                    <img
                      src={msg.imageUrl}
                      alt=""
                      className="rounded-2xl max-w-full w-full cursor-pointer mb-1"
                      style={{ maxHeight: 240 }}
                      onClick={() => setFullImage(msg.imageUrl)}
                    />
                  )
                )}
                {(!msg.imageUrl || (msg.content !== t('chat.sentPhoto') && msg.content !== t('chat.sentVideo') && msg.content !== '사진을 보냈습니다.' && msg.content !== '동영상을 보냈습니다.')) && (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-700 rounded-bl-md border border-gray-300'
                  }`}>
                    {msg.content}
                  </div>
                )}
                <div className={`text-[10px] text-gray-400 mt-1 flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {isMe && otherLastReadAt && new Date(otherLastReadAt).getTime() >= new Date(msg.createdAt).getTime() && (
                    <span className="text-sky-500 font-medium">읽음</span>
                  )}
                  <span>{formatTime(msg.createdAt)}</span>
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
          title={t('chat.priceOffer')}
        >
          ₩
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.inputPlaceholder')}
          className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none overflow-y-auto leading-relaxed"
          style={{ maxHeight: 120 }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !connected}
          className="px-4 py-2.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t('chat.send')}
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
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('chat.priceOffer')}</h3>
            <p className="text-xs text-gray-400 mb-4">{t('chat.enterPrice')}</p>
            <div className="relative mb-5">
              <input
                type="text"
                inputMode="numeric"
                value={priceInput ? Number(priceInput).toLocaleString() : ''}
                onChange={(e) => setPriceInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-lg font-bold placeholder-gray-300 focus:outline-none pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowPriceModal(false); setPriceInput(''); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-200 transition-colors">{t('btn.cancel')}</button>
              <button onClick={sendPriceOffer} disabled={!priceInput || isNaN(parseInt(priceInput)) || parseInt(priceInput) <= 0} className="flex-1 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">{t('chat.offer')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
