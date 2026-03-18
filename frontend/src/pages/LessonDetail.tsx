import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';

interface LessonData {
  id: string;
  userId?: string;
  name: string;
  price: number;
  duration: string;
  level: string;
  maxStudents: number;
  image: string;
  resort?: { id: string; name: string; location: string };
  user?: { id?: string; name: string; phone: string };
}

const levelLabels: Record<string, string> = { beginner: 'LV1', intermediate: 'LV2', advanced: 'LV3' };

const LessonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();


  useEffect(() => {
    if (!id) return;
    api<LessonData>(`/lessons/${id}`)
      .then(setItem)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400 text-sm animate-fade-in">로딩 중...</div>;
  }

  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">레슨 정보를 찾을 수 없습니다</h2>
        <Link to="/lesson" className="text-gray-400 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const isImage = item.image.startsWith('/') || item.image.startsWith('http');
  const imgSrc = imageUrl(item.image);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link to="/lesson" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm transition-colors">← 레슨 목록</Link>

      <div className="card rounded-2xl h-48 flex items-center justify-center text-8xl relative overflow-hidden bg-gray-100">
        {isImage ? <img src={imgSrc} alt={item.name} className="w-full h-full object-cover" /> : <span className="relative">{item.image}</span>}
      </div>

      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">{item.resort?.name}</span>
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">{levelLabels[item.level] || item.level}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{item.name}</h1>
      </div>

      <div className="card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl font-black text-mint">{item.price.toLocaleString()}원</span>
          <span className="text-sm text-gray-500">{item.duration}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '정원', value: item.maxStudents === 1 ? '1:1 개인' : `최대 ${item.maxStudents}명` },
            { label: '시간', value: item.duration },
            { label: '난이도', value: levelLabels[item.level] || item.level },
            { label: '위치', value: item.resort?.location || '-' },
          ].map((info) => (
            <div key={info.label} className="py-2 border-b border-gray-200">
              <span className="text-[10px] text-gray-400 block">{info.label}</span>
              <span className="text-sm text-gray-900">{info.value}</span>
            </div>
          ))}
        </div>
      </div>

      {item.user && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">강사 정보</h3>
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

      {user && item.userId === user.id && (
        <button onClick={async () => { if (!confirm('정말 삭제하시겠습니까?')) return; try { await api(`/lessons/${item.id}`, { method: 'DELETE' }); alert('삭제되었습니다.'); navigate('/lesson'); } catch (err) { alert(err instanceof Error ? err.message : '삭제 실패'); } }} className="w-full py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50">삭제</button>
      )}
      {user && item.userId && item.userId !== user.id && (
        <button
          onClick={() => navigate(`/chat/new`, {
            state: { seller: item.user?.name || '강사', sellerId: item.userId, productName: item.name, productImage: item.image, productPrice: item.price, backTo: `/lesson/${item.id}` }
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

export default LessonDetail;
