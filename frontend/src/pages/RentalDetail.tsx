import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { SadIcon } from '../components/Icons';

interface RentalData {
  id: string;
  userId?: string;
  name: string;
  price: number;
  duration: string;
  equipment: string;
  image: string;
  resort?: { id: string; name: string; location: string };
  user?: { id?: string; name: string; phone: string };
}

const RentalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<RentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();


  useEffect(() => {
    if (!id) return;
    api<RentalData>(`/rentals/${id}`)
      .then(setItem)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-gray-500 text-sm animate-fade-in">로딩 중...</div>;
  }

  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center text-gray-500"><SadIcon size={56} strokeWidth={1.4} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">렌탈 정보를 찾을 수 없습니다</h2>
        <Link to="/rental" className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const isImage = item.image.startsWith('/') || item.image.startsWith('http');
  const imgSrc = imageUrl(item.image);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link to="/rental" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors">← 렌탈 목록</Link>

      <div className="card rounded-2xl h-48 flex items-center justify-center text-8xl relative overflow-hidden bg-gray-100">
        {isImage ? <img src={imgSrc} alt={item.name} className="w-full h-full object-cover" /> : <span className="relative">{item.image}</span>}
      </div>

      <div className="card rounded-2xl p-5">
        <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">{item.resort?.name}</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">{item.name}</h1>
        <div className="text-xs text-gray-500">{item.duration}</div>
      </div>

      <div className="card rounded-2xl p-5">
        <span className="text-3xl font-black text-mint">{item.price.toLocaleString()}원</span>
        <div className="text-xs text-gray-500 mt-1">{item.duration} 기준</div>
      </div>

      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">포함 장비</h3>
        <div className="flex flex-wrap gap-2">
          {item.equipment.split(',').map((eq, idx) => (
            <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs border border-gray-300">{eq.trim()}</span>
          ))}
        </div>
      </div>

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
            {item.resort?.location && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-xs text-gray-500">위치</span>
                <span className="text-sm text-gray-900">{item.resort.location}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {user && (item.userId === user.id || user.role === 'admin') && (
        <button onClick={async () => { if (!confirm(item.userId !== user.id ? '관리자 권한으로 삭제하시겠습니까?' : '정말 삭제하시겠습니까?')) return; try { await api(`/rentals/${item.id}`, { method: 'DELETE' }); alert('삭제되었습니다.'); navigate('/rental'); } catch (err) { alert(err instanceof Error ? err.message : '삭제 실패'); } }} className="w-full py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50">{item.userId !== user.id && user.role === 'admin' ? '관리자 삭제' : '삭제'}</button>
      )}
      {user && item.userId && item.userId !== user.id && (
        <button
          onClick={() => navigate(`/chat/new`, {
            state: { seller: item.user?.name || '판매자', sellerId: item.userId, productName: item.name, productImage: item.image, productPrice: item.price, backTo: `/rental/${item.id}`, productPath: `/rental/${item.id}` }
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

export default RentalDetail;
