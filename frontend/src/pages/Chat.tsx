import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, getUser, getToken, SERVER_URL, uploadImages } from '../api';
import { t, onLangChange } from '../i18n';
import ChatBotGuide from '../components/ChatBotGuide';
import { CloseIcon, PackageIcon, UserIcon } from '../components/Icons';

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

// 메시지 그룹 사이 날짜 구분선
const DateSeparator = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center py-2">
    <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-full">{label}</span>
  </div>
);

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

  // 날짜 구분선용 — 같은 날이면 null, 바뀌면 "오늘/어제/2026.04.25"
  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const msgDay = new Date(d); msgDay.setHours(0, 0, 0, 0);
    const diff = (today.getTime() - msgDay.getTime()) / 86400000;
    if (diff === 0) return '오늘';
    if (diff === 1) return '어제';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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
    <div className="fixed inset-0 flex flex-col bg-gray-50 animate-fade-in z-20">
      {/* Sticky Header */}
      <header className="flex-shrink-0 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to={backPath} aria-label="뒤로" className="w-9 h-9 -ml-1 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div className="relative w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden flex-shrink-0">
            <UserIcon size={18} />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${connected ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">{otherName}</div>
            <div className="text-[10px] text-gray-400">{connected ? '온라인' : '연결 중…'}</div>
          </div>
        </div>

        {/* 상품 정보 — 헤더 바로 아래 고정 (상품 문의에서 진입한 경우만) */}
        {hasProductInfo && (
          <Link
            to={state!.backTo || '#'}
            className="block border-t border-gray-100 bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                {state!.productImage!.startsWith('http') || state!.productImage!.startsWith('/') ? (
                  <img src={state!.productImage!.startsWith('/') ? `${SERVER_URL}${state!.productImage}` : state!.productImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <PackageIcon size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-gray-400 mb-px">문의 상품</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 truncate">{state!.productName}</span>
                  <span className="text-xs font-bold text-gray-900 flex-shrink-0">{state!.productPrice!.toLocaleString()}원</span>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          </Link>
        )}
      </header>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {/* 안전 거래 고지 — 컴팩트 단일 라인 */}
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[10px] text-gray-500">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z"/></svg>
              안전거래 — 직거래·에스크로 권장
            </span>
          </div>

          {isAdminChat && messages.length <= 2 && (
            <ChatBotGuide onSelect={(cat, sub) => {
              if (socketRef.current && roomId && connected) {
                socketRef.current.emit('send_message', { roomId, content: `[문의] ${cat} > ${sub}` });
              }
            }} />
          )}

          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user.id;
            const isPriceOffer = msg.type === 'price_offer';
            const isProductInquiry = msg.type === 'product_inquiry';
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showDateSep = !prevMsg || formatDateSeparator(prevMsg.createdAt) !== formatDateSeparator(msg.createdAt);
            const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId || showDateSep;
            const showRead = isMe && otherLastReadAt && new Date(otherLastReadAt).getTime() >= new Date(msg.createdAt).getTime();

            if (isProductInquiry) {
              let parsed: { productName?: string; productPath?: string } = {};
              try { parsed = JSON.parse(msg.content); } catch { parsed = { productName: msg.content }; }
              const inner = (
                <div className={`rounded-2xl px-4 py-3 ${isMe ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                  <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                    <PackageIcon size={13} />
                    <span className="text-[10px] font-semibold tracking-wide">상품 문의</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug">
                    "{parsed.productName}"
                  </p>
                  {parsed.productPath && (
                    <p className={`text-[10px] mt-1.5 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>탭하여 상품 보기 →</p>
                  )}
                </div>
              );
              return (
                <div key={msg.id}>
                  {showDateSep && <DateSeparator label={formatDateSeparator(msg.createdAt)} />}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[78%]">
                      {!isMe && isFirstInGroup && <div className="text-[10px] text-gray-400 mb-1 ml-1">{msg.sender.name}</div>}
                      {parsed.productPath ? (
                        <Link to={parsed.productPath} className="block active:opacity-70 transition-opacity">{inner}</Link>
                      ) : inner}
                      <div className={`text-[10px] text-gray-400 mt-1 flex items-center gap-1 ${isMe ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                        {showRead && <span className="text-gray-900 font-medium">읽음</span>}
                        <span>{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (isPriceOffer) {
              const priceVal = parseInt(msg.content);
              return (
                <div key={msg.id}>
                  {showDateSep && <DateSeparator label={formatDateSeparator(msg.createdAt)} />}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[78%]">
                      {!isMe && isFirstInGroup && <div className="text-[10px] text-gray-400 mb-1 ml-1">{msg.sender.name}</div>}
                      <div className={`rounded-2xl px-5 py-4 ${isMe ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'}`}>
                        <div className={`text-[10px] font-medium mb-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>가격 제안</div>
                        <div className="text-xl font-black tracking-tight">
                          {isNaN(priceVal) ? msg.content : `${priceVal.toLocaleString()}원`}
                        </div>
                      </div>
                      <div className={`text-[10px] text-gray-400 mt-1 flex items-center gap-1 ${isMe ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                        {showRead && <span className="text-gray-900 font-medium">읽음</span>}
                        <span>{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const isSystemAutoMessage = msg.content === t('chat.sentPhoto') || msg.content === t('chat.sentVideo') || msg.content === '사진을 보냈습니다.' || msg.content === '동영상을 보냈습니다.';

            return (
              <div key={msg.id}>
                {showDateSep && <DateSeparator label={formatDateSeparator(msg.createdAt)} />}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[78%]">
                    {!isMe && isFirstInGroup && <div className="text-[10px] text-gray-400 mb-1 ml-1">{msg.sender.name}</div>}
                    {msg.imageUrl && (
                      msg.imageUrl.includes('/video/') ? (
                        <video src={msg.imageUrl} controls className="rounded-2xl max-w-full w-full mb-1" style={{ maxHeight: 280 }} />
                      ) : (
                        <img
                          src={msg.imageUrl}
                          alt=""
                          loading="lazy"
                          className="rounded-2xl max-w-full w-full cursor-pointer mb-1"
                          style={{ maxHeight: 280 }}
                          onClick={() => setFullImage(msg.imageUrl)}
                        />
                      )
                    )}
                    {(!msg.imageUrl || !isSystemAutoMessage) && (
                      <div className={`px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? 'bg-gray-900 text-white rounded-2xl rounded-br-md'
                          : 'bg-white text-gray-900 rounded-2xl rounded-bl-md border border-gray-200'
                      }`}>
                        {msg.content}
                      </div>
                    )}
                    <div className={`text-[10px] text-gray-400 mt-1 flex items-center gap-1 ${isMe ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                      {showRead && <span className="text-gray-900 font-medium">읽음</span>}
                      <span>{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sticky Input Bar — 하나의 pill 안에 모든 컨트롤 통합 */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white safe-area-bottom">
        <div className="max-w-2xl mx-auto px-3 py-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          {/* 통합 pill: 좌측 버튼들 + 입력 + 우측 전송 모두 한 pill 안 */}
          <div className="flex items-end gap-1 bg-gray-100 rounded-3xl pl-1.5 pr-1.5 py-1.5 transition-colors focus-within:bg-gray-200/70">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!connected || uploading}
              aria-label="사진 첨부"
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-white transition-colors active:scale-95 disabled:opacity-30 flex-shrink-0"
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin block" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              )}
            </button>
            <button
              onClick={() => setShowPriceModal(true)}
              disabled={!connected}
              aria-label="가격 제안"
              title="가격 제안"
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-white transition-colors active:scale-95 disabled:opacity-30 flex-shrink-0"
            >
              {/* 가격 태그 아이콘 */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <circle cx="7" cy="7" r="1.2" fill="currentColor" />
              </svg>
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
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none overflow-y-auto leading-relaxed min-h-[32px]"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !connected}
              aria-label="전송"
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95 flex-shrink-0 ${
                input.trim() && connected
                  ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                  : 'bg-gray-300 text-white cursor-not-allowed'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l14 0M13 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Full Image Viewer */}
      {fullImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullImage(null)}>
          <button className="absolute top-4 right-4 text-white" aria-label="닫기" onClick={() => setFullImage(null)}><CloseIcon size={24} /></button>
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
