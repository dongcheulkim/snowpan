import { useLocation, Link } from 'react-router-dom';
import { VERTICALS, getActiveVertical, getVerticalBySlug } from '../config/verticals';

// PAN 우산 브랜드 스트립 — Navbar 위에 노출.
// 좌측 PAN 로고 + 우측 인라인 탭 (모든 버티컬을 한눈에).
// coming_soon 도 랜딩 페이지로 진입 가능. 현재 페이지의 버티컬은 강조.

export default function PanTopBar() {
  const location = useLocation();
  // 현재 URL 의 첫 segment 가 다른 버티컬 slug 인지 확인
  const firstSeg = location.pathname.split('/')[1] || '';
  const currentVertical = getVerticalBySlug(firstSeg) || getActiveVertical();

  // SNOWPAN 사용자에게는 PAN 바 숨김 — 깔끔한 진입 경험.
  // /pan 페이지 또는 다른 vertical (/bike, /run, /surf, /golf, /camp) 경로에서만 노출.
  const nonSnowVerticals = ['bike', 'run', 'surf', 'golf', 'camp'];
  if (location.pathname === '/pan' || !nonSnowVerticals.includes(firstSeg)) return null;

  return (
    <div className="bg-gray-900 text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center gap-3">
        <Link
          to="/pan"
          className="font-black tracking-[0.25em] text-[12px] flex-shrink-0 hover:text-gray-300 transition-colors"
          aria-label="PAN 플랫폼 허브"
        >
          PAN
        </Link>
        <span aria-hidden className="text-gray-700 flex-shrink-0">|</span>
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="PAN 플랫폼 선택">
          {VERTICALS.map(v => {
            const isCurrent = v.slug === currentVertical.slug;
            const baseCls = `flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider whitespace-nowrap transition-colors`;
            if (isCurrent) {
              return (
                <span key={v.slug} className={`${baseCls} bg-white text-gray-900`} aria-current="page">
                  {v.name}
                </span>
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
