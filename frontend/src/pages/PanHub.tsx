import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';
import { VERTICALS } from '../config/verticals';
import { api } from '../api';

const LAST_VERTICAL_KEY = 'pan:lastVertical';

export default function PanHub() {
  useMeta({ title: 'PAN' });

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lastSlug, setLastSlug] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_VERTICAL_KEY);
      if (stored && VERTICALS.some(v => v.slug === stored)) setLastSlug(stored);
    } catch {}

    let cancelled = false;
    Promise.all(
      VERTICALS.map(v =>
        api<{ totalCount: number }>(`/products?vertical=${v.slug}&limit=1`)
          .then(r => [v.slug, r.totalCount] as [string, number])
          .catch(() => [v.slug, 0] as [string, number])
      )
    ).then(pairs => {
      if (!cancelled) setCounts(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
  }, []);

  const handleClick = (slug: string) => {
    try { localStorage.setItem(LAST_VERTICAL_KEY, slug); } catch {}
  };

  const ordered = lastSlug
    ? [VERTICALS.find(v => v.slug === lastSlug)!, ...VERTICALS.filter(v => v.slug !== lastSlug)]
    : VERTICALS;

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-10 animate-fade-in px-4">
      <header className="text-center">
        <img src="/pan-wordmark.svg" alt="PAN" className="h-12 mx-auto" />
      </header>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {ordered.map((v, idx) => {
            const accent = v.accentColor || '#0f172a';
            const prefix = v.name.replace('PAN', '');
            const isResume = v.slug === lastSlug && idx === 0;
            const count = counts[v.slug];
            const signal =
              count === undefined ? null
              : count > 0 ? `매물 ${count.toLocaleString()}건`
              : '신규 OPEN';
            const live = count !== undefined && count > 0;

            return (
              <Link
                key={v.slug}
                to={v.basePath}
                onClick={() => handleClick(v.slug)}
                aria-label={v.name}
                className={[
                  'group relative rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
                  isResume
                    ? 'col-span-2 aspect-[2/1] border-2 shadow-lg'
                    : 'aspect-square border border-gray-200 hover:border-gray-900',
                ].join(' ')}
                style={isResume ? { borderColor: accent } : undefined}
              >
                {isResume && (
                  <span
                    className="absolute top-3 left-3 text-[9px] font-black tracking-[0.2em] px-2 py-0.5 rounded-full text-white z-10"
                    style={{ background: accent }}
                  >
                    이어서
                  </span>
                )}

                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className="text-[9px] font-black tracking-[0.25em] text-gray-400 group-hover:text-gray-900 transition-colors">
                    {v.slug.toUpperCase()}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} aria-hidden />
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className={isResume
                    ? 'text-3xl sm:text-4xl font-black leading-none tracking-tight'
                    : 'text-2xl sm:text-[26px] font-black leading-none tracking-tight'}>
                    <span className="text-gray-900">{prefix}</span>
                    <span style={{ color: accent }}>PAN</span>
                  </div>
                  {signal && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 tracking-wide">
                      <span
                        className={live ? 'w-1.5 h-1.5 rounded-full animate-pulse' : 'w-1.5 h-1.5 rounded-full'}
                        style={{ background: live ? '#22c55e' : '#94a3b8' }}
                        aria-hidden
                      />
                      {signal}
                    </div>
                  )}
                </div>

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
