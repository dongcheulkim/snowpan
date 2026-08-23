import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, openExternal } from '../api';
import { SadIcon, PhoneIcon, LocationIcon, ClockIcon } from '../components/Icons';
import PhotoGallery from '../components/PhotoGallery';
import ShopPostsFeed from '../components/ShopPostsFeed';

interface RentalData {
  id: string;
  userId?: string;
  name: string;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  hours?: string | null;
  brands?: string | null;
  description?: string | null;
  image?: string | null;
  images?: string | null;
  website?: string | null;
  instagram?: string | null;
  naverMap?: string | null;
  resort?: { id: string; name: string; location?: string } | null;
  user?: { id?: string; name: string; nickname?: string | null };
}

const RentalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<RentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!id) return;
    api<RentalData>(`/rentals/${id}`).then(setItem).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-500 text-sm animate-fade-in">로딩 중...</div>;
  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center text-gray-500"><SadIcon size={56} strokeWidth={1.4} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">렌탈샵을 찾을 수 없습니다</h2>
        <Link to="/rental" className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const gallery = item.images || item.image || '';

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in pb-4">
      <Link to="/rental" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors">← 렌탈샵 목록</Link>

      {gallery && <PhotoGallery images={gallery} />}

      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
          {item.area && <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">{item.area}</span>}
        </div>
        {item.resort?.name && <p className="text-xs text-gray-500">{item.resort.name} 인근</p>}
        <div className="mt-3 space-y-1.5">
          {item.address && <p className="text-sm text-gray-700 inline-flex items-center gap-1.5"><LocationIcon size={14} /> {item.address}</p>}
          {item.hours && <p className="text-sm text-gray-700 inline-flex items-center gap-1.5"><ClockIcon size={14} /> {item.hours}</p>}
        </div>
      </div>

      {item.brands && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-2">취급 장비 · 브랜드</h3>
          <div className="flex flex-wrap gap-1.5">
            {item.brands.split(',').filter(Boolean).map((b, i) => (
              <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs border border-gray-200">{b.trim()}</span>
            ))}
          </div>
        </div>
      )}

      {item.description && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-2">매장 소개</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{item.description}</p>
        </div>
      )}

      {/* 연락 / 링크 */}
      <div className="flex flex-wrap gap-2">
        {item.phone && <a href={`tel:${item.phone}`} className="flex-1 min-w-[100px] py-3 bg-gray-900 text-white rounded-xl font-bold text-sm text-center inline-flex items-center justify-center gap-1.5"><PhoneIcon size={14} /> 전화</a>}
        {item.naverMap && <button onClick={() => openExternal(item.naverMap!)} className="px-4 py-3 bg-green-500 text-white rounded-xl font-bold text-sm">네이버지도</button>}
        {item.website && <button onClick={() => openExternal(item.website!)} className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm">홈페이지</button>}
        {item.instagram && <button onClick={() => openExternal(`https://instagram.com/${item.instagram}`)} className="px-4 py-3 bg-pink-500 text-white rounded-xl font-bold text-sm">인스타</button>}
      </div>

      {/* 문의 채팅 — 전화/링크가 없는 매장도 연락 가능하게 (레슨과 동일 UX) */}
      {user && item.userId && item.userId !== user.id && (
        <button
          onClick={() => navigate(`/chat/new`, {
            state: { seller: item.user?.nickname || item.user?.name || '매장', sellerId: item.userId, productName: item.name, productImage: item.image, backTo: `/rental/${item.id}`, productPath: `/rental/${item.id}` }
          })}
          className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98]"
        >문의 채팅하기</button>
      )}
      {!user && (
        <Link to="/login" className="block w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm text-center hover:bg-accent-light transition-all">문의 채팅하기</Link>
      )}

      {user && (item.userId === user.id || user.role === 'admin') && (
        <div className="flex gap-2">
          {item.userId === user.id && (
            <button onClick={() => navigate(`/rental/${item.id}/edit`)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm border border-gray-200 active:bg-gray-200">수정</button>
          )}
          <button onClick={async () => { if (!confirm(item.userId !== user.id ? '관리자 권한으로 삭제하시겠습니까?' : '정말 삭제하시겠습니까?')) return; try { await api(`/rentals/${item.id}`, { method: 'DELETE' }); toastSuccess('삭제되었습니다.'); navigate('/rental'); } catch (err) { toastError(err instanceof Error ? err.message : '삭제 실패'); } }} className="flex-1 py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50">{item.userId !== user.id && user.role === 'admin' ? '관리자 삭제' : '삭제'}</button>
        </div>
      )}

      {item.userId && <ShopPostsFeed shopType="rental" shopId={item.id} ownerId={item.userId} />}
    </div>
  );
};

export default RentalDetail;
