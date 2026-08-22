import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import DealCard, { type Deal } from '../components/DealCard';
import AgencyCard, { type Agency } from '../components/AgencyCard';

interface ResortDetail {
  id: string;
  slug: string;
  name: string;
  country: string;
  region?: string | null;
  image?: string | null;
  summary?: string | null;
  description: string;
  season?: string | null;
  snowType?: string | null;
  highlights?: string | null;
  slopes?: number | null;
  bestFor?: string | null;
  deals: Deal[];
  agencies: Agency[];
}

export default function OverseasDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [resort, setResort] = useState<ResortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api<ResortDetail>(`/overseas/resorts/${slug}`)
      .then((r) => { setResort(r); document.title = `${r.name} - 해외 스키 여행`; })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-sky-50 flex items-center justify-center text-sm text-gray-500">불러오는 중...</div>;
  if (notFound || !resort) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">해외 스키장을 찾을 수 없어요.</p>
        <Link to="/overseas" className="text-xs font-bold text-white bg-gray-900 px-4 py-2 rounded-lg">목록으로</Link>
      </div>
    );
  }

  const metas = [
    resort.season && { label: '시즌', value: resort.season },
    resort.snowType && { label: '설질', value: resort.snowType },
    resort.slopes != null && { label: '슬로프', value: `${resort.slopes}면` },
    resort.bestFor && { label: '추천', value: resort.bestFor },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="min-h-screen bg-sky-50 pb-12">
      {/* 히어로 */}
      <div className="relative h-52 bg-gradient-to-br from-sky-400 to-indigo-600">
        {resort.image && (
          <img
            src={imageUrl(resort.image, 800)}
            alt={resort.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <Link to="/overseas" className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-900 text-lg">←</Link>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded">
            {resort.country}{resort.region ? ` · ${resort.region}` : ''}
          </span>
          <h1 className="text-2xl font-black mt-1.5">{resort.name}</h1>
          {resort.summary && <p className="text-xs text-gray-200 mt-0.5">{resort.summary}</p>}
        </div>
      </div>

      {/* 메타 */}
      {metas.length > 0 && (
        <div className="px-4 -mt-4 relative">
          <div className="bg-snow border border-gray-200 rounded-2xl p-3 grid grid-cols-2 gap-y-2.5 gap-x-4">
            {metas.map((m) => (
              <div key={m.label} className="min-w-0">
                <div className="text-[10px] text-gray-400">{m.label}</div>
                <div className="text-xs font-bold text-gray-900 truncate">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 하이라이트 */}
      {resort.highlights && (
        <div className="px-4 mt-4 flex flex-wrap gap-1.5">
          {resort.highlights.split(',').filter(Boolean).map((h) => (
            <span key={h} className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-1 rounded-lg">#{h}</span>
          ))}
        </div>
      )}

      {/* 본문 가이드 */}
      <div className="px-4 mt-4">
        <div className="bg-snow border border-gray-200 rounded-2xl p-4">
          {resort.description.split('\n').filter(Boolean).map((p, i) => (
            <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{p}</p>
          ))}
        </div>
      </div>

      {/* 딜 / 여행 상품 */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-2">여행 상품 · 딜</h2>
        {resort.deals.length > 0 ? (
          <div className="grid gap-3">
            {resort.deals.map((d) => <DealCard key={d.id} deal={d} />)}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-2">아직 등록된 여행 상품이 없어요.</p>
        )}
      </div>

      {/* 추천 여행사 */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-2">추천 여행사</h2>
        {resort.agencies.length > 0 ? (
          <div className="grid gap-3">
            {resort.agencies.map((a) => <AgencyCard key={a.id} agency={a} />)}
          </div>
        ) : (
          <Link to="/overseas/agency/register" className="block bg-white border border-dashed border-gray-300 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-gray-700">이 지역 여행사를 찾고 있어요</p>
            <p className="text-[11px] text-gray-500 mt-1">여행사라면 등록하고 이 리조트를 찾는 스키어에게 노출하세요 ›</p>
          </Link>
        )}
      </div>

      {/* 여행사 등록 유도 */}
      <div className="px-4 mt-6">
        <Link to="/overseas/agency/register" className="block bg-gray-900 text-white rounded-2xl p-4 text-center active:scale-[0.98] transition-transform">
          <p className="text-sm font-bold">여행사이신가요? 상품 등록하기</p>
          <p className="text-[11px] text-gray-300 mt-0.5">승인 후 직접 여행 상품을 올리고 추천 여행사로 노출돼요</p>
        </Link>
      </div>
    </div>
  );
}
