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
    <div className="max-w-3xl mx-auto py-10 space-y-10 animate-fade-in">
      {/* Hero */}
      <header className="text-center space-y-3">
        <img src="/pan-wordmark.svg" alt="PAN" className="h-12 mx-auto" />
        <p className="text-base font-bold text-gray-900">운동, 모든 것의 장(場)</p>
        <p className="text-xs tracking-[0.18em] text-gray-500">A PLATFORM FOR EVERY SPORT</p>
        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed mt-2">
          종목마다 자기만의 깊이가 있어요. PAN 은 종목별 전용 플랫폼을 따로 만들고, 우산 아래 묶어 한 번에 만납니다.
        </p>
      </header>

      {/* Vertical cards */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-gray-500 tracking-widest px-1">PLATFORMS</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {VERTICALS.map((v) => (
            <Link key={v.slug} to={v.basePath} className="relative rounded-2xl border-2 p-5 transition-all border-gray-300 hover:border-gray-900 cursor-pointer">
              <div
                className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${v.toneFrom} 0%, ${v.toneTo} 100%)` }}
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-2 min-h-[28px]">
                  <span className="text-[10px] font-black tracking-[0.2em] text-gray-400">{v.slug.toUpperCase()}</span>
                  {v.status === 'beta' && (
                    <span className="text-[10px] font-bold tracking-wider bg-sky-500 text-white px-2 py-0.5 rounded-full">BETA</span>
                  )}
                </div>
                <h3 className="text-xl font-black tracking-wider mt-3" style={{ color: v.accentColor || '#0f172a' }}>{v.name}</h3>
                <p className="text-xs text-gray-700 font-medium mt-0.5">{v.tagline}</p>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{v.description}</p>
                {v.uniqueStrengths && v.uniqueStrengths.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {v.uniqueStrengths.slice(0, 3).map(s => (
                      <li key={s.label} className="text-[10px] text-gray-700 flex items-start gap-1">
                        <span className="font-black flex-shrink-0" style={{ color: v.accentColor || '#0f172a' }}>·</span>
                        <span><strong className="font-bold">{s.label}</strong> — {s.desc}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs font-bold mt-3 inline-flex items-center gap-1" style={{ color: v.accentColor || '#0f172a' }}>
                  들어가기 <span aria-hidden>→</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* About PAN */}
      <section className="card p-6 space-y-3 bg-snow">
        <h2 className="text-base font-bold text-gray-900">왜 PAN 인가요?</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          만능 플랫폼은 모든 종목에서 어중간합니다. 그래서 PAN 은 종목별로 깊게 파는
          <strong> 세부 플랫폼</strong>을 만듭니다. 시세·커뮤니티·신뢰 데이터를 종목 안에서만 쌓아
          정확한 정보를 보장하고, 우산 아래에서 계정·뱃지·신뢰 신호는 공유합니다.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          첫 번째 플랫폼은 <strong>SNOWPAN</strong> (스키·보드). 시즌권·중고 장비·렌탈·레슨·숙소까지
          한 곳에서. 다음 시즌엔 BIKEPAN, RUNPAN 이 합류할 예정이에요.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link to="/snowpan" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">SNOWPAN 들어가기</Link>
          <Link to="/about" className="inline-block px-5 py-2.5 bg-snow border border-gray-300 text-gray-700 rounded-lg font-bold text-xs">서비스 소개</Link>
        </div>
      </section>
    </div>
  );
}
