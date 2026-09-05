import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { toastSuccess, toastError } from './Toast';

// 매장 리뷰 — 매장 상세 하단 공용. 매장별 1인 1리뷰, 휴대폰 인증 계정만 작성.
interface ShopReview {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  userId: string;
  user: { id: string; name: string; nickname?: string | null; profileImage?: string | null } | null;
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? '#f59e0b' : '#e5e7eb'} aria-hidden>
          <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
        </svg>
      ))}
    </span>
  );
}

export default function ShopReviews({ shopType, shopId, ownerId }: { shopType: string; shopId: string; ownerId?: string | null }) {
  const navigate = useNavigate();
  const user = getUser();
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api<{ reviews: ShopReview[]; averageRating: number; totalCount: number }>(`/shop-reviews?shopType=${shopType}&shopId=${shopId}`)
      .then((d) => { setReviews(d.reviews || []); setAvg(d.averageRating || 0); setCount(d.totalCount || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [shopType, shopId]);

  const myReview = user ? reviews.find((r) => r.userId === user.id) : null;
  const isOwner = !!user && !!ownerId && user.id === ownerId;

  const submit = async () => {
    if (content.trim().length < 5) { toastError('리뷰를 5자 이상 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      await api('/shop-reviews', { method: 'POST', body: { shopType, shopId, rating, content: content.trim() } });
      toastSuccess('리뷰가 등록되었어요. 고맙습니다!');
      setWriting(false); setContent(''); setRating(5);
      load();
    } catch (e) { toastError(e instanceof Error ? e.message : '리뷰 등록에 실패했어요.'); }
    finally { setSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('리뷰를 삭제할까요?')) return;
    try { await api(`/shop-reviews/${id}`, { method: 'DELETE' }); toastSuccess('삭제했어요.'); load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '삭제 실패'); }
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">방문자 리뷰 {count > 0 && <span className="text-gray-400 font-normal">({count})</span>}</h2>
        {count > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Stars value={Math.round(avg)} />
            <span className="text-sm font-bold text-gray-900">{avg.toFixed(1)}</span>
          </span>
        )}
      </div>

      {/* 작성 진입 — 로그인·비소유자·미작성일 때 */}
      {!isOwner && !myReview && (
        writing ? (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}점`} className="active:scale-90 transition-transform">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill={n <= rating ? '#f59e0b' : '#e5e7eb'}><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" /></svg>
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="방문 경험을 남겨주세요 (친절도, 시설, 가격 등)"
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setWriting(false)} className="flex-1 py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-lg">취소</button>
              <button onClick={submit} disabled={submitting} className="flex-1 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg disabled:opacity-40">{submitting ? '등록 중...' : '리뷰 등록'}</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { if (!user) { navigate('/login'); return; } setWriting(true); }}
            className="w-full py-2.5 mb-4 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold border border-sky-100 hover:bg-sky-100 transition-colors"
          >
            + 이 매장 리뷰 쓰기
          </button>
        )
      )}
      {isOwner && <p className="text-[11px] text-gray-400 mb-3">내 매장에는 리뷰를 쓸 수 없어요.</p>}

      {/* 목록 */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">불러오는 중...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">아직 리뷰가 없어요. 첫 방문 리뷰를 남겨보세요.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-gray-50 last:border-b-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Stars value={r.rating} size={12} />
                  <span className="text-xs font-medium text-gray-700">{r.user?.name || '스노우판 회원'}</span>
                </span>
                <span className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
              <p className="text-sm text-gray-800 mt-1 leading-relaxed whitespace-pre-wrap">{r.content}</p>
              {user && (r.userId === user.id || user.role === 'admin') && (
                <button onClick={() => remove(r.id)} className="text-[11px] text-gray-400 hover:text-red-400 mt-1">삭제</button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
