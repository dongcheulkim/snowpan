import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
}

const Chat = () => {
  const { productId } = useParams();
  const location = useLocation();
  const { seller, productName, productImage, productPrice } = (location.state as {
    seller: string; productName: string; productImage: string; productPrice: number;
  }) || { seller: '판매자', productName: '상품', productImage: '📦', productPrice: 0 };

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: `안녕하세요! ${productName} 관련해서 문의드립니다.`, sender: 'me', time: getNow() },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function getNow() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = { id: Date.now(), text: input.trim(), sender: 'me', time: getNow() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');

    setTimeout(() => {
      const replies = [
        '네, 안녕하세요!',
        '상품 상태 좋습니다. 직거래 가능해요.',
        '네고는 조금 가능합니다.',
        '직거래 장소는 협의 가능해요.',
        '사진 더 필요하시면 보내드릴게요.',
        '감사합니다! 연락주세요.',
      ];
      const autoReply: Message = {
        id: Date.now() + 1,
        text: replies[Math.floor(Math.random() * replies.length)],
        sender: 'other',
        time: getNow(),
      };
      setMessages(prev => [...prev, autoReply]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="card p-4 mb-3">
        <div className="flex items-center gap-3">
          <Link to={`/used/${productId}`} className="text-zinc-500 hover:text-white transition-colors text-sm">←</Link>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm">👤</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{seller}</div>
            <div className="text-[10px] text-zinc-500">보통 1시간 이내 응답</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-mint" />
        </div>
      </div>

      {/* Product Info */}
      <div className="card p-3 mb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-xl">{productImage}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate">{productName}</div>
          <div className="text-sm font-bold text-mint">{productPrice.toLocaleString()}원</div>
        </div>
        <Link to={`/used/${productId}`} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-[11px] border border-zinc-700 hover:bg-zinc-700 transition-colors flex-shrink-0">
          상품보기
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 px-1">
        <div className="text-center text-[10px] text-zinc-600 py-2">
          거래는 당사자 간 직접 진행됩니다. 안전거래를 이용해주세요.
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%]">
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.sender === 'me'
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-zinc-800 text-zinc-200 rounded-bl-md border border-zinc-700'
              }`}>
                {msg.text}
              </div>
              <div className={`text-[10px] text-zinc-600 mt-1 ${msg.sender === 'me' ? 'text-right' : 'text-left'}`}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}
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
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default Chat;
