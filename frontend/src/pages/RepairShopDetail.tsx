import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api';

interface Shop {
  id: string;
  name: string;
  area: string;
  address: string;
  description: string;
  services: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  naverMap: string | null;
  hours: string | null;
  image: string | null;
  isPremium?: boolean;
  user: { id: string; name: string; nickname?: string | null };
}

export default function RepairShopDetail() {
  const { id } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api<Shop>(`/repair-shops/${id}`)
      .then(setShop)
      .catch(e => setError(e instanceof Error ? e.message : '조회 실패'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-sm text-gray-400">로딩 중...</div>;
  if (!shop) return (
    <div className="text-center py-20">
      <p className="text-sm text-gray-400 mb-3">{error || '정비샵을 찾을 수 없습니다.'}</p>
      <Link to="/repair" className="text-sm text-sky-600 underline">← 정비샵 목록</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <Link to="/repair" className="inline-flex items-center text-gray-400 text-sm hover:text-gray-900">&larr; 정비샵 목록</Link>

      {shop.image && (
        <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-video">
          <img src={imageUrl(shop.image)} alt={shop.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-orange-600 rounded">{shop.area}</span>
          {shop.isPremium && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-yellow-700">AD</span>}
        </div>
        <h1 className="text-xl font-bold text-gray-900">🔧 {shop.name}</h1>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{shop.description}</p>
        {shop.services && (
          <div className="flex flex-wrap gap-1 pt-2">
            {shop.services.split(',').filter(Boolean).map((s, i) => (
              <span key={i} className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200">{s.trim()}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 space-y-2.5 text-sm">
        <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0">주소</span><span className="text-gray-900">{shop.address}</span></div>
        {shop.hours && <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0">영업시간</span><span className="text-gray-900 whitespace-pre-line">{shop.hours}</span></div>}
        {shop.phone && <div className="flex gap-2"><span className="text-gray-400 w-16 flex-shrink-0">전화</span><a href={`tel:${shop.phone}`} className="text-sky-600">{shop.phone}</a></div>}
      </div>

      {(shop.instagram || shop.website || shop.naverMap) && (
        <div className="card p-5">
          <h2 className="text-xs font-bold text-gray-500 mb-3">링크</h2>
          <div className="flex flex-wrap gap-2">
            {shop.instagram && <a href={`https://instagram.com/${shop.instagram}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-pink-50 text-pink-500 rounded-lg text-xs font-bold">@{shop.instagram}</a>}
            {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-bold">홈페이지 →</a>}
            {shop.naverMap && <a href={shop.naverMap} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold">네이버 지도 →</a>}
          </div>
        </div>
      )}
    </div>
  );
}
