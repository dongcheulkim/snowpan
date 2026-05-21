import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';
import { VERTICALS } from '../config/verticals';

// PAN 우산 브랜드 허브 — 세부 플랫폼 (snowpan, bikepan, runpan) 선택 페이지.
// 현재 SNOWPAN 만 활성, 나머지는 'coming soon' 카드로 미래 확장 신호.

export default function PanHub() {
  useMeta({
    title: 'PAN — 운동, 모든 것의 장(場)',
    description: '스키부터 자전거, 러닝까지. PAN 은 종목별 전용 플랫폼을 모아 한 곳에서 만나게 합니다.',
  });

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6 animate-fade-in px-4">
      <header className="text-center">
        <img src="/pan-wordmark.svg" alt="PAN" className="h-12 mx-auto" />
      </header>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VERTICALS.map((v) => (
            <Link
              key={v.slug}
              to={v.basePath}
              aria-label={v.name}
              className="relative aspect-square rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-gray-900 transition-all active:scale-[0.97]"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${v.toneFrom} 0%, ${v.toneTo} 100%)` }}
                aria-hidden
              />
              <div className="relative h-full flex items-center justify-center p-3">
                <span className="text-base sm:text-lg font-black tracking-wider text-center" style={{ color: v.accentColor || '#0f172a' }}>
                  {v.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
