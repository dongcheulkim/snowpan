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
    const newMsg: Message = {
      id: Date.now(),
      text: input.trim(),
      sender: 'me',
      time: getNow(),
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');

    // 자동 응답 시뮬레이션
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
      <div className="glass rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-3">
          <Link to={`/used/${productId}`} className="text-gray-400 hover:text-white transition-colors text-sm">
            ←
          </Link>
          <div className="w-8 h-8 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-sm">
            👤
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{seller}</div>
            <div className="text-[10px] text-gray-500">보통 1시간 이내 응답</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
        </div>
      </div>

      {/* Product Info Bar */}
      <div className="glass rounded-xl p-3 mb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center text-xl">
          {productImage}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate">{productName}</div>
          <div className="text-sm font-bold text-neon-green">{productPrice.toLocaleString()}원</div>
        </div>
        <Link
          to={`/used/${productId}`}
          className="px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-[11px] border border-white/10 hover:bg-white/10 transition-all flex-shrink-0"
        >
          상품보기
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 px-1">
        <div className="text-center text-[10px] text-gray-600 py-2">
          거래는 당사자 간 직접 진행됩니다. 안전거래를 이용해주세요.
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] ${msg.sender === 'me' ? 'order-2' : ''}`}>
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'me'
                    ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-br-md'
                    : 'glass text-gray-200 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
              <div className={`text-[10px] text-gray-600 mt-1 ${msg.sender === 'me' ? 'text-right' : 'text-left'}`}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass rounded-2xl p-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-dark-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue/50 transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-neon-blue/25 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default Chat;
