import { useEffect, useState } from 'react';
import { loginPath } from '../utils/loginPath';
import { useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { toastSuccess, toastError } from './Toast';

// 매장 리뷰 — 매장 상세 하단 공용. 매장별 1인 1리뷰, 로그인하면 작성 가능(2026-09-22 휴대폰 인증 조건 제거).
interface ShopReview {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  userId: string;
  user: { id: string; name: string; nickname?: string | null; profileImage?: string | null } | null;
  ownerReply?: string | null;     // 사장님·강사 답글 (2026-09-22)
  ownerRepliedAt?: string | null;
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
  // 레슨은 '방문'이 아니라 '레슨' 리뷰 — 사용자 요청 2026-09-22. 매장(스키샵·정비샵·렌탈샵·숙소)은 방문자 리뷰 유지.
  const isLesson = shopType === 'lesson';
  const noun = isLesson ? '레슨' : '매장';
  const user = getUser();
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 사장님 답글 편집 상태 — 편집 중인 리뷰 id
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);

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
  const canReply = isOwner || (!!user && user.role === 'admin');
  const replyLabel = isLesson ? '강사 답글' : '사장님 답글';

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

  const saveReply = async (id: string) => {
    if (replyText.trim().length < 2) { toastError('답글을 2자 이상 입력해 주세요.'); return; }
    setReplySaving(true);
    try {
      await api(`/shop-reviews/${id}/reply`, { method: 'PUT', body: { content: replyText.trim() } });
      toastSuccess('답글을 남겼어요.');
      setReplyFor(null); setReplyText('');
      load();
    } catch (e) { toastError(e instanceof Error ? e.message : '답글 저장에 실패했어요.'); }
    finally { setReplySaving(false); }
  };
  const removeReply = async (id: string) => {
    if (!confirm('답글을 지울까요?')) return;
    try { await api(`/shop-reviews/${id}/reply`, { method: 'PUT', body: { content: '' } }); toastSuccess('답글을 지웠어요.'); load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '삭제 실패'); }
  };

  const remove = async (id: string) => {
    if (!confirm('리뷰를 삭제할까요?')) return;
    try { await api(`/shop-reviews/${id}`, { method: 'DELETE' }); toastSuccess('삭제했어요.'); load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '삭제 실패'); }
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">{isLesson ? '레슨 리뷰' : '방문자 리뷰'} {count > 0 && <span className="text-gray-400 font-normal">({count})</span>}</h2>
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
              placeholder={isLesson ? '레슨 경험을 남겨주세요 (강사 설명, 친절도, 실력 향상 등)' : '방문 경험을 남겨주세요 (친절도, 시설, 가격 등)'}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setWriting(false)} className="flex-1 py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-lg">취소</button>
              <button onClick={submit} disabled={submitting} className="flex-1 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg disabled:opacity-40">{submitting ? '등록 중...' : '리뷰 등록'}</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { if (!user) { navigate(loginPath()); return; } setWriting(true); }}
            className="w-full py-2.5 mb-4 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold border border-sky-100 hover:bg-sky-100 transition-colors"
          >
            + 이 {noun} 리뷰 쓰기
          </button>
        )
      )}
      {isOwner && <p className="text-[11px] text-gray-400 mb-3">내 {noun}에는 리뷰를 쓸 수 없어요.</p>}

      {/* 목록 */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">불러오는 중...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">아직 리뷰가 없어요. 첫 {isLesson ? '레슨' : '방문'} 리뷰를 남겨보세요.</p>
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
              {r.ownerReply && replyFor !== r.id && (
                <div className="mt-2 ml-2 pl-3 border-l-2 border-sky-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-700">{replyLabel}</span>
                    {r.ownerRepliedAt && <span className="text-[10px] text-gray-400">{new Date(r.ownerRepliedAt).toLocaleDateString('ko-KR')}</span>}
                  </div>
                  <p className="text-xs text-gray-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{r.ownerReply}</p>
                  {canReply && (
                    <div className="flex gap-3 mt-1">
                      <button onClick={() => { setReplyFor(r.id); setReplyText(r.ownerReply || ''); }} className="text-[11px] text-gray-400 hover:text-gray-700">수정</button>
                      <button onClick={() => removeReply(r.id)} className="text-[11px] text-gray-400 hover:text-red-400">지우기</button>
                    </div>
                  )}
                </div>
              )}
              {canReply && !r.ownerReply && replyFor !== r.id && (
                <button onClick={() => { setReplyFor(r.id); setReplyText(''); }} className="text-[11px] text-sky-600 font-bold mt-1 block">답글 달기</button>
              )}
              {canReply && replyFor === r.id && (
                <div className="mt-2 space-y-1.5">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder={isLesson ? '수강생에게 답글을 남겨 주세요' : '손님에게 답글을 남겨 주세요'}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveReply(r.id)} disabled={replySaving} className="flex-1 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg disabled:opacity-40">{replySaving ? '저장 중...' : '답글 저장'}</button>
                    <button onClick={() => { setReplyFor(null); setReplyText(''); }} className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg">취소</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
