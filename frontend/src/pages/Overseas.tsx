import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import DealCard, { type Deal } from '../components/DealCard';

interface Resort {
  id: string;
  slug: string;
  name: string;
  country: string;
  region?: string | null;
  image?: string | null;
  summary?: string | null;
  season?: string | null;
  snowType?: string | null;
  highlights?: string | null;
  slopes?: number | null;
}

export default function Overseas() {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '해외 스키 여행 - 스노우판';
    Promise.all([
      api<Resort[]>('/overseas/resorts').catch(() => []),
      api<Deal[]>('/overseas/deals?featured=1').catch(() => []),
    ]).then(([r, d]) => {
      setResorts(Array.isArray(r) ? r : []);
      setDeals(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      {/* 헤더 */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-gray-900">해외 스키 여행</h1>
        <p className="text-xs text-gray-500 mt-0.5">일본 파우더부터 알프스까지 — 스키어를 위한 해외 스키장 가이드</p>
      </div>

      {/* 추천 딜 */}
      {deals.length > 0 && (
        <div className="px-4 pb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">추천 여행 상품</h2>
          <div className="grid gap-3">
            {deals.map((d) => <DealCard key={d.id} deal={d} showResort />)}
          </div>
        </div>
      )}

      {/* 스키장 가이드 그리드 */}
      <div className="px-4">
        <h2 className="text-sm font-bold text-gray-900 mb-2">스키장 가이드</h2>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-12">불러오는 중...</p>
        ) : resorts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">준비 중이에요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {resorts.map((r) => (
              <Link key={r.id} to={`/overseas/${r.slug}`} className="bg-snow border border-gray-200 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
                <div className="h-24 relative overflow-hidden">
                  {r.image ? (
                    <img src={imageUrl(r.image, 400)} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center">
                      <span className="text-white font-black text-lg">{r.name}</span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold text-gray-900 bg-white/90 px-1.5 py-0.5 rounded">
                    {r.country}{r.region ? ` · ${r.region}` : ''}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-bold text-gray-900">{r.name}</p>
                  {r.summary && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{r.summary}</p>}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(r.highlights || '').split(',').filter(Boolean).slice(0, 2).map((h) => (
                      <span key={h} className="text-[9px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">{h}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 광고주(파트너) 유입 — 중개 모델 */}
      <div className="px-4 mt-6">
        <Link to="/advertise" className="block bg-gray-900 text-white rounded-2xl p-4 text-center active:scale-[0.98] transition-transform">
          <p className="text-sm font-bold">여행사·리조트 광고 문의</p>
          <p className="text-[11px] text-gray-300 mt-0.5">해외 스키 여행 상품을 스노우판 이용자에게 노출하세요</p>
        </Link>
      </div>
    </div>
  );
}
