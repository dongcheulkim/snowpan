import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, imageUrl, openExternal } from '../api';
import DealCard, { type Deal } from '../components/DealCard';
import AgencyBlocks from '../components/AgencyBlocks';
import { loadAgencyFonts, type PageBlock } from '../agencyFonts';

interface AgencyDetail {
  id: string; name: string; description?: string | null; image?: string | null;
  phone?: string | null; website: string; kakao?: string | null; countries?: string | null;
  pageBlocks?: PageBlock[] | null; deals: Deal[];
}

export default function AgencyPage() {
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadAgencyFonts();
    if (!id) return;
    api<AgencyDetail>(`/agencies/${id}`)
      .then((d) => { setA(d); document.title = `${d.name} - 스노우판`; })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-sky-50 flex items-center justify-center text-sm text-gray-500">불러오는 중...</div>;
  if (notFound || !a) return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-gray-500">여행사를 찾을 수 없어요.</p>
      <Link to="/overseas" className="text-xs font-bold text-white bg-gray-900 px-4 py-2 rounded-lg">해외 스키로</Link>
    </div>
  );

  const kakaoUrl = a.kakao && /^https?:\/\//i.test(a.kakao) ? a.kakao : null;
  const hasBlocks = Array.isArray(a.pageBlocks) && a.pageBlocks.length > 0;

  return (
    <div className="min-h-screen bg-sky-50 pb-28">
      {/* 헤더 */}
      <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3">
        <Link to="/overseas" className="text-gray-500 text-lg">←</Link>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center overflow-hidden flex-shrink-0">
          {a.image ? (
            <img src={imageUrl(a.image, 120)} alt={a.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : <span className="text-white font-black text-sm">{a.name.slice(0, 2)}</span>}
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{a.name}</h1>
          {a.countries && <p className="text-[11px] text-gray-500 truncate">{a.countries.split(',').map((c) => c.trim()).filter(Boolean).join(' · ')}</p>}
        </div>
      </div>

      {/* 직접 꾸민 페이지 (없으면 소개글) */}
      <div className="px-4 py-5">
        {hasBlocks ? (
          <AgencyBlocks blocks={a.pageBlocks!} />
        ) : a.description ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{a.description}</p>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">소개 준비 중이에요.</p>
        )}
      </div>

      {/* 여행 상품 */}
      {a.deals.length > 0 && (
        <div className="px-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">여행 상품</h2>
          <div className="grid gap-3">{a.deals.map((d) => <DealCard key={d.id} deal={d} />)}</div>
        </div>
      )}

      {/* 하단 고정 예약 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2 max-w-md mx-auto">
        {a.phone && <a href={`tel:${a.phone}`} className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold flex items-center">전화</a>}
        {kakaoUrl && <button onClick={() => openExternal(kakaoUrl)} className="px-4 py-3 bg-yellow-300 text-gray-900 rounded-xl text-sm font-bold">카카오</button>}
        <button onClick={() => openExternal(a.website)} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform">홈페이지 · 예약</button>
      </div>
    </div>
  );
}
