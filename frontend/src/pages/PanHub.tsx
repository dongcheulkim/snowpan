import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';
import { VERTICALS } from '../config/verticals';

export default function PanHub() {
  useMeta({ title: 'PAN' });

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-10 animate-fade-in px-4">
      <header className="text-center">
        <img src="/pan-wordmark.svg" alt="PAN" className="h-12 mx-auto" />
      </header>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {VERTICALS.map((v) => {
            const accent = v.accentColor || '#0f172a';
            const prefix = v.name.replace('PAN', '');
            return (
              <Link
                key={v.slug}
                to={v.basePath}
                aria-label={v.name}
                className="group relative aspect-square rounded-2xl bg-white border border-gray-200 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-gray-900"
              >
                {/* 우상단 슬러그 + 액센트 도트 */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className="text-[9px] font-black tracking-[0.25em] text-gray-400 group-hover:text-gray-900 transition-colors">
                    {v.slug.toUpperCase()}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} aria-hidden />
                </div>

                {/* 좌하단 큰 이름 — PREFIX(검정) + PAN(accent) */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="text-2xl sm:text-[26px] font-black leading-none tracking-tight">
                    <span className="text-gray-900">{prefix}</span>
                    <span style={{ color: accent }}>PAN</span>
                  </div>
                </div>

                {/* 하단 액센트 라인 — hover 시 풀너비로 확장 */}
                <div
                  className="absolute bottom-0 left-0 h-[3px] w-8 group-hover:w-full transition-all duration-500 ease-out"
                  style={{ background: accent }}
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
