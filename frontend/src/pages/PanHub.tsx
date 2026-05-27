import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';
import { VERTICALS } from '../config/verticals';

export default function PanHub() {
  useMeta({ title: 'PAN' });

  const snow = VERTICALS.find(v => v.slug === 'snow')!;
  const coming = VERTICALS.filter(v => v.slug !== 'snow');

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6 animate-fade-in px-4">
      <header className="text-center">
        <img src="/pan-wordmark.svg" alt="PAN" className="h-12 mx-auto" />
      </header>

      {/* SNOWPAN — 운영 중, 크게 강조 */}
      <Link
        to={snow.basePath}
        aria-label={`${snow.name} 들어가기`}
        className="group relative block rounded-2xl bg-white border border-gray-200 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-gray-900 p-6 min-h-[180px]"
      >
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="text-[10px] font-black tracking-[0.18em] px-2 py-1 rounded-full bg-mint/10 text-mint border border-mint/30">
            이번 시즌 운영 중
          </span>
        </div>
        <div className="absolute top-4 left-4 flex items-center gap-1.5">
          <span className="text-[10px] font-black tracking-[0.25em] text-gray-400 group-hover:text-gray-900 transition-colors">
            {snow.slug.toUpperCase()}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: snow.accentColor }} aria-hidden />
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <div className="text-3xl sm:text-5xl font-black leading-none tracking-tight">
            <span className="text-gray-900">SNOW</span>
            <span style={{ color: snow.accentColor }}>PAN</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">{snow.description}</p>
        </div>
        <div
          className="absolute bottom-0 left-0 h-[3px] w-12 group-hover:w-full transition-all duration-500 ease-out"
          style={{ background: snow.accentColor }}
          aria-hidden
        />
      </Link>

      {/* 5종목 Coming Soon — 작은 카드, 클릭하면 각 종목 Coming Soon 페이지 */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {coming.map((v) => {
          const accent = v.accentColor || '#0f172a';
          const prefix = v.name.replace('PAN', '');
          return (
            <Link
              key={v.slug}
              to={v.basePath}
              aria-label={`${v.name} 곧 출시`}
              className="group relative aspect-square rounded-2xl bg-white border border-gray-200 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gray-900 opacity-90"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-black tracking-[0.18em] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  곧 출시
                </span>
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-1">
                <span className="text-[9px] font-black tracking-[0.25em] text-gray-400 group-hover:text-gray-900 transition-colors">
                  {v.slug.toUpperCase()}
                </span>
                <span className="w-1 h-1 rounded-full" style={{ background: accent }} aria-hidden />
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-xl sm:text-2xl font-black leading-none tracking-tight">
                  <span className="text-gray-700">{prefix}</span>
                  <span style={{ color: accent }}>PAN</span>
                </div>
                {v.releaseDate && (
                  <p className="text-[10px] text-gray-500 mt-1">{v.releaseDate}</p>
                )}
              </div>
              <div
                className="absolute bottom-0 left-0 h-[2px] w-6 group-hover:w-full transition-all duration-500 ease-out opacity-60"
                style={{ background: accent }}
                aria-hidden
              />
            </Link>
          );
        })}
      </section>
    </div>
  );
}
