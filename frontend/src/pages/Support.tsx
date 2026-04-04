import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';

const Support = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // 문의 폼 (비로그인용)
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', category: 'general', content: '' });
  const [submitting, setSubmitting] = useState(false);

  const faqs = [
    { q: '중고 장비 거래는 어떻게 하나요?', a: '중고 메뉴에서 판매 등록 후, 구매 희망자와 채팅으로 거래 조건을 조율하세요. 직거래 또는 택배거래 모두 가능합니다.' },
    { q: '렌탈/레슨 등록은 어떻게 하나요?', a: '렌탈 또는 레슨 메뉴에서 "등록" 버튼을 눌러 정보를 입력하세요. 관리자 승인 후 목록에 노출됩니다.' },
    { q: '자격증 뱃지는 어떻게 받나요?', a: '마이페이지에서 "인증하기" 버튼을 눌러 자격증 사진을 업로드하면 검토 후 뱃지가 부여됩니다.' },
    { q: '거래 중 문제가 생기면 어떻게 하나요?', a: '아래 "관리자에게 문의" 버튼을 통해 1:1 채팅으로 문의해주세요.' },
    { q: '비밀번호를 잊었어요.', a: '로그인 페이지에서 "비밀번호 찾기"를 통해 가입한 이메일로 재설정 코드를 받을 수 있습니다.' },
    { q: '광고는 어떻게 신청하나요?', a: '마이페이지 → 광고 신청에서 배너/프리미엄 광고를 신청할 수 있습니다.' },
  ];

  const categories = [
    { id: 'general', name: '일반 문의' },
    { id: 'trade', name: '거래 관련' },
    { id: 'ad', name: '광고 문의' },
    { id: 'bug', name: '오류 신고' },
    { id: 'partnership', name: '제휴/협력' },
    { id: 'other', name: '기타' },
  ];

  const handleAdminChat = async () => {
    if (!user) { navigate('/login'); return; }
    setChatLoading(true);
    try {
      const admin = await api<{ id: string; name: string }>('/contact/admin-id');
      if (admin.id === user.id) { alert('관리자 계정입니다.'); setChatLoading(false); return; }
      const room = await api<{ id: string }>('/chat/rooms', {
        method: 'POST',
        body: { targetUserId: admin.id, productName: '관리자 문의' },
      });
      navigate(`/chat/${room.id}`, { state: { seller: admin.name, sellerId: admin.id } });
    } catch {
      alert('관리자 연결에 실패했습니다.');
    } finally { setChatLoading(false); }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.content.trim()) { alert('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      const res = await api<{ message: string }>('/contact', { method: 'POST', body: contactForm });
      alert(res.message);
      setShowContactForm(false);
      setContactForm({ name: '', email: '', category: 'general', content: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : '문의 접수에 실패했습니다.');
    } finally { setSubmitting(false); }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400";

  return (
    <div className="space-y-4 animate-fade-in max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
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
          {chatLoading ? '연결 중...' : '💬 관리자에게 1:1 채팅'}
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-2">로그인 후 관리자와 바로 채팅할 수 있습니다.</p>
      </div>

      {/* 이메일 문의 (비로그인도 가능) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">이메일 문의</h2>
          <button onClick={() => setShowContactForm(!showContactForm)} className="text-xs text-sky-600 font-bold">
            {showContactForm ? '접기' : '작성하기'}
          </button>
        </div>

        {showContactForm ? (
          <form onSubmit={handleContactSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="이름" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} required className={inputClass} />
              <input type="email" placeholder="이메일" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} required className={inputClass} />
            </div>
            <select value={contactForm.category} onChange={e => setContactForm({ ...contactForm, category: e.target.value })} className={inputClass}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea placeholder="문의 내용을 입력해주세요" value={contactForm.content} onChange={e => setContactForm({ ...contactForm, content: e.target.value })} rows={4} required className={`${inputClass} resize-none`} />
            <button type="submit" disabled={submitting} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm disabled:opacity-50">
              {submitting ? '전송 중...' : '문의 보내기'}
            </button>
          </form>
        ) : (
          <p className="text-xs text-gray-400">로그인 없이도 이메일로 문의할 수 있습니다.</p>
        )}
      </div>

      {/* 운영 정보 */}
      <div className="card p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">이메일</span>
            <a href="mailto:snowpan.help@gmail.com" className="text-sm font-medium text-sky-600">snowpan.help@gmail.com</a>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500">운영시간</span>
            <span className="text-sm font-medium text-gray-900">평일 10:00 ~ 18:00</span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-3 px-1">자주 묻는 질문</h2>
        <div className="card overflow-hidden">
          {faqs.map((faq, idx) => (
            <div key={idx} className={idx < faqs.length - 1 ? 'border-b border-gray-50' : ''}>
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className="text-sm font-medium text-gray-900 pr-4">{faq.q}</span>
                <span className={`text-gray-400 text-xs transition-transform ${openFaq === idx ? 'rotate-90' : ''}`}>→</span>
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
