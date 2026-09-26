import { useState } from 'react';
import { Link } from 'react-router-dom';
import { termsSections, termsLawBasis } from '../content/termsSections';


const Terms = () => {
  const [openSection, setOpenSection] = useState<number | null>(null);
  const toggle = (idx: number) => setOpenSection(openSection === idx ? null : idx);
  const sections = termsSections;
  const lawBasis = termsLawBasis;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">이용약관</h1>
      </div>

      {/* 핵심 고지 */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-bold text-gray-900 mb-1">통신판매중개업자 고지</p>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          스노우판은 「전자상거래 등에서의 소비자보호에 관한 법률」 제20조에 따른 통신판매중개업자로서,
          이용자 간 거래의 중개 시스템을 운영·관리하며 <span className="font-bold">통신판매의 당사자가 아닙니다.</span> 따라서 개별 판매자·서비스제공자가 등록한
          재화·용역에 대한 거래 정보 및 거래에 대한 책임은 각 판매자·서비스제공자에게 있습니다.
        </p>
      </div>

      {/* 약관 조항 */}
      <div className="card overflow-hidden">
        {sections.map((section, idx) => (
          <div key={idx} className={idx < sections.length - 1 ? 'border-b border-gray-100' : ''}>
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-bold text-gray-900 pr-4">{section.title}</span>
              <span className={`text-gray-500 text-xs transition-transform duration-200 ${openSection === idx ? 'rotate-90' : ''}`}>→</span>
            </button>
            {openSection === idx && (
              <div className="px-5 pb-4">
                <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50 rounded-lg p-4 border border-gray-100">
                  {section.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 관련 법령 */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">관련 법령 근거</h2>
        <div className="space-y-3">
          {lawBasis.map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-xs font-bold text-gray-700 mb-1">{item.law}</div>
              <div className="text-[10px] text-gray-500 leading-relaxed">{item.articles}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 시행일 */}
      <div className="card p-5 text-center">
        <p className="text-xs text-gray-500">본 약관은 2026년 1월 1일부터 시행됩니다.</p>
        <p className="text-[10px] text-gray-500 mt-1">최종 수정일: 2026년 9월 15일</p>
      </div>
    </div>
  );
};

export default Terms;
