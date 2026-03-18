import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, imageUrl } from '../api';

const typeMap: Record<string, string> = { hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박', season: '시즌방' };

interface AccommodationData {
  id: string;
  name: string;
  type: string;
  price: number;
  originalPrice: number;
  guests: string;
  features: string;
  image: string;
  resort?: { id: string; name: string; location: string };
  user?: { id: string; name: string; phone: string };
  createdAt: string;
}

const AccommodationDetail = () => {
  const { id } = useParams();
  const [item, setItem] = useState<AccommodationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api<AccommodationData>(`/accommodations/${id}`)
      .then(setItem)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">숙소 정보를 찾을 수 없습니다</h2>
        <Link to="/accommodation" className="text-gray-400 hover:text-gray-900 text-sm">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const discount = item.originalPrice > item.price ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;
  const typeText = item.type.split(',').map(t => typeMap[t] || t).join(', ');
  const featureList = item.features.split(',').filter(Boolean).map(f => f.trim());

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link to="/accommodation" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm transition-colors">
        ← 숙소 목록
      </Link>

      {/* Hero */}
      <div className="card rounded-2xl h-48 flex items-center justify-center text-8xl relative overflow-hidden bg-gray-100">
        {item.image.startsWith('/') || item.image.startsWith('http') ? (
          <img src={imageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="relative">{item.image}</span>
        )}
        <span className="absolute top-4 right-4 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-300">
          {typeText}
        </span>
      </div>

      {/* Info */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
            {item.resort?.name}
          </span>
          <span className="text-[10px] text-gray-400">{item.guests}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{item.name}</h1>
        {item.resort?.location && (
          <p className="text-xs text-gray-400 mb-3">{item.resort.location}</p>
        )}
      </div>

      {/* Price */}
      <div className="card rounded-2xl p-5">
        {discount > 0 && (
          <div className="text-sm text-gray-400 line-through mb-1">{item.originalPrice.toLocaleString()}원</div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-mint">{item.price.toLocaleString()}원</span>
          {discount > 0 && (
            <span className="text-sm text-coral font-bold bg-coral/10 px-2 py-1 rounded-lg border border-coral/20">{discount}% 할인</span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-1">1박 기준</div>
      </div>

      {/* Features */}
      {featureList.length > 0 && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">편의시설</h3>
          <div className="flex flex-wrap gap-2">
            {featureList.map((f, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs border border-gray-300">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {item.user && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">등록자 정보</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-xs text-gray-400">이름</span>
              <span className="text-sm text-gray-900">{item.user.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-xs text-gray-400">연락처</span>
              <span className="text-sm text-gray-900">{item.user.phone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      <button className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98]">
        숙소 예약하기
      </button>
    </div>
  );
};

export default AccommodationDetail;
