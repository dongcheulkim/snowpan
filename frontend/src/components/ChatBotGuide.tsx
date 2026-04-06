import { useState } from 'react';

interface Props {
  onSelect: (category: string, sub: string) => void;
}

const categories: Record<string, { label: string; icon: string; subs: string[] }> = {
  trade: { label: '거래 관련', icon: '🏷️', subs: ['상품 문의', '거래 분쟁', '환불/취소', '사기 신고'] },
  account: { label: '계정/인증', icon: '👤', subs: ['로그인 문제', '비밀번호 변경', '자격증 뱃지', '회원 탈퇴'] },
  business: { label: '사업자 등록', icon: '🏪', subs: ['스키샵 등록', '정비샵 등록', '렌탈/레슨 등록', '숙소 등록'] },
  ad: { label: '광고', icon: '📢', subs: ['광고 신청 방법', '광고 비용', '광고 수정/취소', '프리미엄 문의'] },
  report: { label: '신고/불편', icon: '🚨', subs: ['게시글 신고', '유저 신고', '버그/오류', '서비스 건의'] },
  other: { label: '기타', icon: '💬', subs: ['제휴/협력', '기타 문의'] },
};

export default function ChatBotGuide({ onSelect }: Props) {
  const [step, setStep] = useState<'main' | 'sub'>('main');
  const [selectedCat, setSelectedCat] = useState('');
  const [done, setDone] = useState(false);

  if (done) return null;

  return (
    <div className="mx-2 mb-3">
      {step === 'main' && (
        <div className="bg-white rounded-2xl border border-sky-200 p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <span className="text-sm font-bold text-gray-900">어떤 도움이 필요하신가요?</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(categories).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => { setSelectedCat(key); setStep('sub'); }}
                className="flex items-center gap-2 px-3 py-2.5 bg-sky-50 hover:bg-sky-100 rounded-xl text-left transition-colors border border-sky-100"
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs font-medium text-gray-700">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'sub' && selectedCat && (
        <div className="bg-white rounded-2xl border border-sky-200 p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🤖</span>
            <span className="text-sm font-bold text-gray-900">{categories[selectedCat].icon} {categories[selectedCat].label}</span>
          </div>
          <p className="text-[10px] text-gray-400 mb-3">세부 항목을 선택해주세요</p>
          <div className="space-y-1.5">
            {categories[selectedCat].subs.map(sub => (
              <button
                key={sub}
                onClick={() => {
                  onSelect(categories[selectedCat].label, sub);
                  setDone(true);
                }}
                className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-sky-50 rounded-lg text-sm text-gray-700 transition-colors border border-gray-100"
              >
                {sub}
              </button>
            ))}
            <button
              onClick={() => setStep('main')}
              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-600"
            >
              ← 뒤로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
