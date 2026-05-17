import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { VERTICALS, getActiveVertical } from '../config/verticals';
import { toastError } from './Toast';

// PAN 우산 브랜드 스트립 — Navbar 위에 노출.
// 좌측 PAN 로고 + 우측 인라인 탭 (모든 버티컬을 한눈에).
// 현재 버티컬은 강조, coming_soon 은 클릭 시 토스트.
//
// PanHub (/pan) 페이지에서는 자동 숨김.

export default function PanTopBar() {
  const location = useLocation();
  const active = getActiveVertical();

  if (location.pathname === '/pan') return null;

  const onComingSoon = (name: string) => toastError(`${name} 은 준비 중입니다`);

  return (
    <div className="bg-gray-900 text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center gap-3">
        {/* 좌측 PAN 로고 — /pan Hub 로 이동 */}
        <Link
          to="/pan"
          className="font-black tracking-[0.25em] text-[12px] flex-shrink-0 hover:text-gray-300 transition-colors"
          aria-label="PAN 플랫폼 허브"
        >
          PAN
        </Link>

        {/* 구분선 */}
        <span aria-hidden className="text-gray-700 flex-shrink-0">|</span>

        {/* 인라인 탭 — 모바일 가로 스크롤 */}
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="PAN 플랫폼 선택">
          {VERTICALS.map(v => {
            const isCurrent = v.slug === active.slug;
            const disabled = v.status !== 'active' && !isCurrent;
            const baseCls = `flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider whitespace-nowrap transition-colors`;
            if (isCurrent) {
              return (
                <span key={v.slug} className={`${baseCls} bg-white text-gray-900`} aria-current="page">
                  {v.name}
                </span>
              );
            }
            if (disabled) {
              return (
                <button
                  key={v.slug}
                  onClick={() => onComingSoon(v.name)}
                  className={`${baseCls} text-gray-500 hover:text-gray-300 hover:bg-gray-800`}
                  aria-disabled="true"
                >
                  {v.name}<span className="ml-1 text-[8px] font-normal opacity-70">준비중</span>
                </button>
              );
            }
            return (
              <Link
                key={v.slug}
                to={v.basePath}
                className={`${baseCls} text-gray-300 hover:text-white hover:bg-gray-800`}
              >
                {v.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
