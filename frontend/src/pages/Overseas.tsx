import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import DealCard, { type Deal } from '../components/DealCard';
import CategoryAdBanner from '../components/CategoryAdBanner';

interface Resort {
  id: string;
  slug: string;
  name: string;
  scope?: string | null;      // '국내' | '해외'
  country: string;
  continent?: string | null;
  popular?: boolean;
  region?: string | null;
  address?: string | null;
  liftPrice?: string | null;
  nightSki?: boolean;
  image?: string | null;
  summary?: string | null;
  season?: string | null;
  highlights?: string | null;
  slopes?: number | null;
}

const CONTINENT_ORDER = ['아시아', '유럽', '북미', '기타'];
const REGION_ORDER = ['강원', '경기', '충청', '전북', '전남', '경북', '경남', '제주', '기타'];

export default function Overseas() {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'국내' | '해외'>('국내');
  const [sub, setSub] = useState<string>('전체');

  useEffect(() => {
    document.title = '스키장 정보 - 스노우판';
    Promise.all([
      api<Resort[]>('/overseas/resorts').catch(() => []),
      api<Deal[]>('/overseas/deals?featured=1').catch(() => []),
    ]).then(([r, d]) => {
      setResorts(Array.isArray(r) ? r : []);
      setDeals(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  const scoped = resorts.filter((r) => (r.scope || '해외') === scope);
  const hasPopular = scoped.some((r) => r.popular);
  const subValues = scope === '해외'
    ? CONTINENT_ORDER.filter((c) => scoped.some((r) => r.continent === c))
    : REGION_ORDER.filter((rg) => scoped.some((r) => r.region === rg));
  const subTabs = [...(hasPopular ? ['인기'] : []), '전체', ...subValues];
  const activeSub = subTabs.includes(sub) ? sub : '전체';
  const filtered = activeSub === '전체'
    ? scoped
    : activeSub === '인기'
      ? scoped.filter((r) => r.popular)
      : scope === '해외'
        ? scoped.filter((r) => r.continent === activeSub)
        : scoped.filter((r) => r.region === activeSub);

  const switchScope = (s: '국내' | '해외') => { setScope(s); setSub('전체'); };

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      {/* 헤더 */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-gray-900">스키장 정보</h1>
        <p className="text-xs text-gray-500 mt-0.5">국내부터 해외까지 — 위치·가격·코스 한눈에</p>
      </div>

      {/* 국내 / 해외 */}
      <div className="px-4 pb-2 flex gap-2">
        {(['국내', '해외'] as const).map((s) => (
          <button
            key={s}
            onClick={() => switchScope(s)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${scope === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 광고 배너 */}
      <div className="px-4 pb-2">
        <CategoryAdBanner category="overseas" />
      </div>

      {/* 추천 딜 (해외) */}
      {scope === '해외' && deals.length > 0 && (
        <div className="px-4 pb-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2">추천 여행 상품</h2>
          <div className="grid gap-3">{deals.map((d) => <DealCard key={d.id} deal={d} showResort />)}</div>
        </div>
      )}

      {/* 하위 카테고리 */}
      {!loading && subTabs.length > 1 && (
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {subTabs.map((t) => (
            <button key={t} onClick={() => setSub(t)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeSub === t ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{t}</button>
          ))}
        </div>
      )}

      {/* 스키장 그리드 */}
      <div className="px-4">
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-12">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">준비 중이에요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((r) => (
              <Link key={r.id} to={`/overseas/${r.slug}`} className="bg-snow border border-gray-200 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
                <div className="h-24 relative overflow-hidden bg-gradient-to-br from-sky-400 to-indigo-500">
                  {r.image ? (
                    <img src={imageUrl(r.image, 400)} alt={r.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><span className="text-white font-black text-lg">{r.name}</span></div>
                  )}
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold text-gray-900 bg-white/90 px-1.5 py-0.5 rounded">
                    {scope === '국내' ? (r.region || '국내') : `${r.country}${r.region ? ` · ${r.region}` : ''}`}
                  </span>
                  {r.nightSki && <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">야간</span>}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-bold text-gray-900">{r.name}</p>
                  {r.summary && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{r.summary}</p>}
                  {r.liftPrice && <p className="text-[10px] font-bold text-sky-600 mt-1 line-clamp-1">{r.liftPrice}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 여행사 유입 (해외) */}
      {scope === '해외' && (
        <div className="px-4 mt-6 space-y-2">
          <Link to="/overseas/agency/register" className="block bg-gray-900 text-white rounded-2xl p-4 text-center active:scale-[0.98] transition-transform">
            <p className="text-sm font-bold">여행사이신가요? 상품 등록하기</p>
            <p className="text-[11px] text-gray-300 mt-0.5">승인 후 직접 여행 상품을 올리고 추천 여행사로 노출돼요</p>
          </Link>
          <Link to="/advertise" className="block text-center text-[11px] font-bold text-gray-500 py-1">배너 광고 문의 ›</Link>
        </div>
      )}
    </div>
  );
}
