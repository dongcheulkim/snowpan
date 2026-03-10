import { useState } from 'react';
import { Link } from 'react-router-dom';

const Support = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: '중고 장비 거래는 어떻게 하나요?', a: '중고 메뉴에서 판매 등록 후, 구매 희망자와 채팅으로 거래 조건을 조율하세요. 직거래 또는 택배거래 모두 가능합니다.' },
    { q: '렌탈/레슨 등록은 어떻게 하나요?', a: '렌탈 또는 레슨 메뉴에서 "등록" 버튼을 눌러 정보를 입력하세요. 관리자 승인 후 목록에 노출됩니다.' },
    { q: '자격증 뱃지는 어떻게 받나요?', a: '마이페이지에서 "인증하기" 버튼을 눌러 자격증 사진을 업로드하면 검토 후 뱃지가 부여됩니다.' },
    { q: '거래 중 문제가 생기면 어떻게 하나요?', a: '고객센터로 문의해주세요. 거래 분쟁 중재 서비스를 제공하고 있습니다.' },
    { q: '비밀번호를 잊었어요.', a: '로그인 페이지에서 "비밀번호 찾기"를 통해 가입한 이메일로 재설정 링크를 받을 수 있습니다.' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">고객센터</h1>
      </div>

      {/* Contact */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">문의하기</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">이메일</span>
            <span className="text-sm font-medium text-gray-900">support@snowpan.kr</span>
          </div>
          <div className="flex items-center justify-between py-2">
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
