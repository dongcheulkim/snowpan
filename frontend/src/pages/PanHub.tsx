import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';
import { VERTICALS } from '../config/verticals';

// 임시: 4가지 샘플 스타일을 한 페이지에 보여 사용자가 고르도록.
// 결정 후 하나만 남기고 정리.

export default function PanHub() {
  useMeta({ title: 'PAN — 샘플 선택' });

  const sportEmoji: Record<string, string> = {
    snow: '🏂', bike: '🚴', run: '🏃', surf: '🏄', golf: '⛳', camp: '🏕️',
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-12 animate-fade-in px-4">
      <header className="text-center">
        <img src="/pan-wordmark.svg" alt="PAN" className="h-12 mx-auto" />
      </header>

      {/* SAMPLE A — Apple/Linear: 미니멀 흑백 + 액센트 외곽선 */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">A · 미니멀 (Apple/Linear)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VERTICALS.map((v) => (
            <Link key={v.slug} to={v.basePath}
              className="relative aspect-square rounded-2xl border border-gray-200 bg-white hover:border-gray-900 transition-all p-4 flex flex-col justify-between"
            >
              <span className="text-[10px] font-black tracking-[0.2em] text-gray-400">{v.slug.toUpperCase()}</span>
              <div>
                <div className="w-2 h-2 rounded-full mb-2" style={{ background: v.accentColor }} />
                <div className="text-base font-black text-gray-900">{v.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SAMPLE B — 나이키/스포츠: 진한 단색 풀필 + 흰 텍스트 + 큰 이름 */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">B · 진한 단색 (Nike 스타일)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VERTICALS.map((v) => (
            <Link key={v.slug} to={v.basePath}
              style={{ background: v.accentColor }}
              className="relative aspect-square rounded-2xl overflow-hidden text-white p-4 flex flex-col justify-end hover:scale-[1.02] active:scale-[0.97] transition-transform shadow-lg"
            >
              <span className="text-[10px] font-black tracking-[0.25em] opacity-70 absolute top-4 left-4">{v.slug.toUpperCase()}</span>
              <div className="text-2xl font-black tracking-tight leading-none">{v.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* SAMPLE C — iOS 앱 아이콘 스타일: 라운드, 큰 이니셜, 밝은 단색 + glow */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">C · iOS 앱 아이콘</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {VERTICALS.map((v) => (
            <Link key={v.slug} to={v.basePath} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div
                style={{ background: `linear-gradient(135deg, ${v.toneFrom} 0%, ${v.accentColor} 100%)` }}
                className="w-full aspect-square rounded-3xl shadow-md flex items-center justify-center text-white text-2xl sm:text-3xl font-black"
              >
                {v.name.replace('PAN', '').slice(0, 1) || 'P'}
              </div>
              <span className="text-[11px] font-bold text-gray-700">{v.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* SAMPLE D — Bento 비대칭: 첫번째 큰 카드, 나머지 작은 카드 */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">D · Bento 비대칭</h2>
        <div className="grid grid-cols-3 gap-3 auto-rows-[110px]">
          {VERTICALS.map((v, i) => {
            const big = i === 0;
            return (
              <Link key={v.slug} to={v.basePath}
                style={{ background: `linear-gradient(135deg, ${v.toneFrom} 0%, ${v.toneTo} 100%)` }}
                className={`relative rounded-2xl overflow-hidden p-4 flex flex-col justify-end active:scale-[0.97] transition-transform ${big ? 'col-span-2 row-span-2' : ''}`}
              >
                <span className="text-[9px] font-black tracking-[0.2em] absolute top-3 left-3" style={{ color: v.accentColor }}>{v.slug.toUpperCase()}</span>
                <div className={`font-black ${big ? 'text-3xl' : 'text-base'}`} style={{ color: v.accentColor }}>
                  {v.name}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SAMPLE E — 이모지 큰 아이콘 + 이름 (참고용) */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-3">E · 이모지 큰 아이콘</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VERTICALS.map((v) => (
            <Link key={v.slug} to={v.basePath}
              className="relative aspect-square rounded-2xl bg-white border border-gray-200 hover:border-gray-900 transition-all flex flex-col items-center justify-center gap-2 p-4"
            >
              <div className="text-5xl">{sportEmoji[v.slug]}</div>
              <div className="text-sm font-black" style={{ color: v.accentColor }}>{v.name}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
