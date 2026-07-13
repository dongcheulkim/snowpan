// 약관·개인정보처리방침을 바텀시트 모달로 표시.
// 회원가입 폼에서 폼 데이터를 잃지 않고 같은 화면에서 슬라이드업으로 전문 확인.

import { useEffect } from 'react';
import { termsSections } from '../pages/Terms';
import { privacySections } from '../pages/Privacy';

interface Props {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export default function LegalSheet({ type, onClose }: Props) {
  // 열려 있는 동안 배경 스크롤 잠금 + ESC 닫기.
  useEffect(() => {
    if (!type) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [type, onClose]);

  if (!type) return null;

  const title = type === 'terms' ? '이용약관' : '개인정보처리방침';
  const sections = type === 'terms' ? termsSections : privacySections;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      {/* 딤 배경 */}
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      {/* 시트 */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] animate-[slideUp_.25s_ease-out]">
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 text-xl leading-none">×</button>
        </div>
        {/* 본문 스크롤 */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {sections.map((s, idx) => (
            <div key={idx}>
              <h3 className="text-[13px] font-bold text-gray-900 mb-1.5">{s.title}</h3>
              <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          ))}
          <div className="h-2" />
        </div>
        {/* 하단 확인 버튼 */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform">
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
