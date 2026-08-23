import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { useMeta } from '../hooks/useMeta';
import ShareButton from '../components/ShareButton';
import { SadIcon } from '../components/Icons';
import PhotoGallery from '../components/PhotoGallery';
import ShopPostsFeed from '../components/ShopPostsFeed';

interface LessonData {
  id: string;
  userId?: string;
  name: string;
  type?: string | null;
  description?: string | null;
  image?: string | null;
  images?: string | null;
  resort?: { id: string; name: string; location?: string } | null;
  user?: { id?: string; name: string; nickname?: string | null };
}

const LessonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useMeta({
    title: item ? `${item.name}${item.type ? ' · ' + item.type : ''} 레슨` : undefined,
    description: item ? `${item.resort?.name ? item.resort.name + ' · ' : ''}스노우판 스키/보드 레슨` : undefined,
    image: item?.image ? (item.image.startsWith('http') ? item.image : imageUrl(item.image)) : undefined,
    type: 'product',
  });

  useEffect(() => {
    if (!id) return;
    api<LessonData>(`/lessons/${id}`).then(setItem).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-500 text-sm animate-fade-in">로딩 중...</div>;
  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center text-gray-500"><SadIcon size={56} strokeWidth={1.4} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">레슨을 찾을 수 없습니다</h2>
        <Link to="/lesson" className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const gallery = item.images || item.image || '';

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in pb-4">
      <div className="flex items-center justify-between">
        <Link to="/lesson" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors">← 레슨 목록</Link>
        <ShareButton title={item.name} text={item.name} />
      </div>

      {gallery && <PhotoGallery images={gallery} />}

      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          {item.type && <span className="text-[10px] font-bold text-white bg-primary px-1.5 py-0.5 rounded">{item.type}</span>}
          {item.resort?.name && <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">{item.resort.name}</span>}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
      </div>

      {item.description && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">상세 안내</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.description}</p>
        </div>
      )}

      {item.user && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-2">강사/스쿨</h3>
          <span className="text-sm text-gray-900">{item.user.nickname || item.user.name}</span>
        </div>
      )}

      {user && (item.userId === user.id || user.role === 'admin') && (
        <div className="flex gap-2">
          {item.userId === user.id && (
            <button onClick={() => navigate(`/lesson/${item.id}/edit`)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm border border-gray-200 active:bg-gray-200">수정</button>
          )}
          <button onClick={async () => { if (!confirm(item.userId !== user.id ? '관리자 권한으로 삭제하시겠습니까?' : '정말 삭제하시겠습니까?')) return; try { await api(`/lessons/${item.id}`, { method: 'DELETE' }); toastSuccess('삭제되었습니다.'); navigate('/lesson'); } catch (err) { toastError(err instanceof Error ? err.message : '삭제 실패'); } }} className="flex-1 py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50">{item.userId !== user.id && user.role === 'admin' ? '관리자 삭제' : '삭제'}</button>
        </div>
      )}
      {user && item.userId && item.userId !== user.id && (
        <button
          onClick={() => navigate(`/chat/new`, {
            state: { seller: item.user?.nickname || item.user?.name || '강사', sellerId: item.userId, productName: item.name, productImage: item.image, backTo: `/lesson/${item.id}`, productPath: `/lesson/${item.id}` }
          })}
          className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98]"
        >문의 채팅하기</button>
      )}
      {!user && (
        <Link to="/login" className="block w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm text-center hover:bg-accent-light transition-all">문의 채팅하기</Link>
      )}

      {item.userId && <ShopPostsFeed shopType="lesson" shopId={item.id} ownerId={item.userId} />}
    </div>
  );
};

export default LessonDetail;
