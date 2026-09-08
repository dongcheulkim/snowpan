import { toastError } from '../components/Toast';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { ChatIcon } from '../components/Icons';

const Support = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // 짧은 FAQ — 전체는 /help. 도움말 센터·고객센터 자동 답변과 같은 사실만(토스 말투)
  const faqs = [
    { q: '중고 장비는 어떻게 사고 파나요?', a: '중고 메뉴에서 매물을 올리거나, 마음에 드는 매물의 "채팅하기"로 판매자와 직접 이야기해요. 가격과 만나는 곳, 결제는 두 분이 정하고 돈은 스노우판을 거치지 않아요.' },
    { q: '우리 매장을 등록하고 싶어요.', a: '마이 → 사장님 대시보드에서 무료로 등록해요. 이미 스노우판에 올라온 매장이면 "매장 찾기"에서 찾아 "직접 관리하기"를 눌러 주세요. 확인 후 1~2일 안에 공개돼요.' },
    { q: '자격증 뱃지는 어떻게 받나요?', a: '마이 → 프로필에서 "인증하기"를 눌러 자격증 사진을 올리면 확인 후 1~2일 안에 뱃지가 붙어요.' },
    { q: '거래 중 문제가 생기면 어떻게 하나요?', a: '위 "관리자에게 1:1 채팅"으로 매물 링크와 상황을 남겨 주세요. 채팅 기록을 근거로 조정을 도와드려요.' },
    { q: '로그인이 안 돼요.', a: '스노우판은 카카오 로그인으로 시작해요. 카카오 앱에 로그인돼 있는지 확인하고, 계속 안 되면 막히는 화면을 캡처해서 1:1 채팅으로 보내 주세요.' },
    { q: '광고는 어떻게 신청하나요?', a: '광고는 상담 후 진행해요. 1:1 채팅에서 "광고" 메뉴를 누르면 자리와 비용이 안내되고, 담당자가 광고 문구를 작성하는 링크를 보내 드려요. 결제는 계좌이체, 세금계산서를 발행해요.' },
  ];

  const handleAdminChat = async () => {
    if (!user) { navigate('/login'); return; }
    setChatLoading(true);
    try {
      const admin = await api<{ id: string; name: string }>('/contact/admin-id');
      if (admin.id === user.id) { toastError('관리자 계정입니다.'); setChatLoading(false); return; }
      const room = await api<{ id: string }>('/chat/rooms', {
        method: 'POST',
        body: { targetUserId: admin.id },
      });
      navigate(`/chat/${room.id}`, { state: { seller: admin.name, sellerId: admin.id, isAdmin: true } });
    } catch {
      toastError('관리자 연결에 실패했습니다.');
    } finally { setChatLoading(false); }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">고객센터</h1>
      </div>

      {/* 관리자 1:1 채팅 */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">1:1 문의</h2>
        <button
          onClick={handleAdminChat}
          disabled={chatLoading}
          className="w-full py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {chatLoading ? '연결 중...' : <span className="inline-flex items-center gap-1.5"><ChatIcon size={14} /> 관리자에게 1:1 채팅</span>}
        </button>
        <p className="text-[10px] text-gray-500 text-center mt-2">채팅방 위에 고정된 안내 메뉴에서 항목을 고르면 바로 답이 와요. 더 궁금한 건 그 자리에서 적어 주세요.</p>
      </div>

      {/* 운영 정보 */}
      <div className="card p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">이메일</span>
            <a href="mailto:info@snowpan.kr" className="text-sm font-medium text-sky-600">info@snowpan.kr</a>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">운영시간</span>
            <span className="text-sm font-medium text-gray-900">평일 10:00 ~ 18:00</span>
          </div>
        </div>
      </div>

      {/* FAQ — quick view + 도움말 센터 링크 */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-gray-900">자주 묻는 질문</h2>
          <Link to="/help" className="text-xs text-sky-600 font-bold hover:underline">전체 보기 →</Link>
        </div>
        <div className="card overflow-hidden">
          {faqs.map((faq, idx) => (
            <div key={idx} className={idx < faqs.length - 1 ? 'border-b border-gray-50' : ''}>
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className="text-sm font-medium text-gray-900 pr-4">{faq.q}</span>
                <span className={`text-gray-500 text-xs transition-transform ${openFaq === idx ? 'rotate-90' : ''}`}>→</span>
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4">
                  <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg p-3">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Support;
