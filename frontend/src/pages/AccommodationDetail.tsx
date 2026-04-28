import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { useMeta } from '../hooks/useMeta';
import ShareButton from '../components/ShareButton';
import { SadIcon } from '../components/Icons';

const typeMap: Record<string, string> = { hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박', season: '시즌방' };

interface AccommodationData {
  id: string;
  userId?: string;
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
  const navigate = useNavigate();
  const [item, setItem] = useState<AccommodationData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useMeta({
    title: item ? `${item.name} ${item.price.toLocaleString()}원` : undefined,
    description: item ? `${item.resort?.name ? item.resort.name + ' · ' : ''}${typeMap[item.type.split(',')[0]] || item.type} · ${item.guests}인 - 스노우판 숙소 예약` : undefined,
    image: item?.image ? (item.image.startsWith('http') ? item.image : imageUrl(item.image)) : undefined,
    type: 'product',
  });

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
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center text-gray-500"><SadIcon size={56} strokeWidth={1.4} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">숙소 정보를 찾을 수 없습니다</h2>
        <Link to="/accommodation" className="text-gray-500 hover:text-gray-900 text-sm">
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
      <div className="flex items-center justify-between">
        <Link to="/accommodation" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors">
          ← 숙소 목록
        </Link>
        <ShareButton title={item.name} text={`${item.name} ${item.price.toLocaleString()}원`} />
      </div>

      {/* Hero */}
      <div className="card rounded-2xl h-48 flex items-center justify-center text-8xl relative overflow-hidden bg-gray-100">
        {item.image.startsWith('/') || item.image.startsWith('http') ? (
          <img src={imageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="relative">{item.image}</span>
        )}
        <span className="absolute top-4 right-4 bg-white/85 backdrop-blur-md text-gray-900 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-white/40 shadow-sm">
          {typeText}
        </span>
      </div>

      {/* Info */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
            {item.resort?.name}
          </span>
          <span className="text-[10px] text-gray-500">{item.guests}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{item.name}</h1>
        {item.resort?.location && (
          <p className="text-xs text-gray-500 mb-3">{item.resort.location}</p>
        )}
      </div>

      {/* Price */}
      <div className="card rounded-2xl p-5">
        {discount > 0 && (
          <div className="text-sm text-gray-500 line-through mb-1">{item.originalPrice.toLocaleString()}원</div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-mint">{item.price.toLocaleString()}원</span>
          {discount > 0 && (
            <span className="text-sm text-coral font-bold bg-coral/10 px-2 py-1 rounded-lg border border-coral/20">{discount}% 할인</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">1박 기준</div>
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
              <span className="text-xs text-gray-500">이름</span>
              <span className="text-sm text-gray-900">{item.user.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-xs text-gray-500">연락처</span>
              <span className="text-sm text-gray-900">{item.user.phone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      {user && (item.userId === user.id || user.role === 'admin') && (
        <button onClick={async () => { if (!confirm(item.userId !== user.id ? '관리자 권한으로 삭제하시겠습니까?' : '정말 삭제하시겠습니까?')) return; try { await api(`/accommodations/${item.id}`, { method: 'DELETE' }); alert('삭제되었습니다.'); navigate('/accommodation'); } catch (err) { alert(err instanceof Error ? err.message : '삭제 실패'); } }} className="w-full py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50">{item.userId !== user.id && user.role === 'admin' ? '관리자 삭제' : '삭제'}</button>
      )}
      {user && item.userId && item.userId !== user.id && (
        <button
          onClick={() => navigate(`/chat/new`, {
            state: { seller: item.user?.name || '등록자', sellerId: item.userId, productName: item.name, productImage: item.image, productPrice: item.price, backTo: `/accommodation/${item.id}`, productPath: `/accommodation/${item.id}` }
          })}
          className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98]"
        >채팅하기</button>
      )}
      {!user && (
        <Link to="/login" className="block w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm text-center hover:bg-accent-light transition-all">채팅하기</Link>
      )}
    </div>
  );
};

export default AccommodationDetail;
