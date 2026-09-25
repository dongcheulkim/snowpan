import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api';
import { toastError, toastSuccess } from './Toast';
import { loginPath } from '../utils/loginPath';
import { StarIcon } from './Icons';

// 스키장 후기·별점 — 리조트 랜딩 하단. 리조트별 1인 1후기, 다시 쓰면 덮어쓴다(수정).
// 서버(/resort-reviews)는 닉네임·프로필 사진만 내려준다 — 실명·연락처 없음.
interface ReviewItem {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  user: { id: string; name: string; profileImage?: string | null } | null;
}
interface MyReview { id: string; rating: number; content: string; createdAt: string; updatedAt: string }
interface ReviewData { avg: number; count: number; items: ReviewItem[]; myReview: MyReview | null }

const CONTENT_MIN = 5;
const CONTENT_MAX = 500;

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} className={n <= value ? 'text-amber-400' : 'text-gray-200'} />
      ))}
    </span>
  );
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('ko-KR');
};

export default function ResortReviews({ resortId }: { resortId: string }) {
  const user = getUser() as { id: string; role?: string } | null;
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<ReviewData>(`/resort-reviews/${resortId}`)
      .then((d) => {
        setData({ avg: d.avg || 0, count: d.count || 0, items: d.items || [], myReview: d.myReview || null });
        if (d.myReview) { setRating(d.myReview.rating); setContent(d.myReview.content); }
      })
      .catch(() => setData({ avg: 0, count: 0, items: [], myReview: null }))
      .finally(() => setLoading(false));
  }, [resortId]);
  useEffect(load, [load]);

  const myReview = data?.myReview ?? null;
  const showForm = !!user && (editing || !myReview);

  const submit = async () => {
    const text = content.trim();
    if (text.length < CONTENT_MIN) { toastError(`후기를 ${CONTENT_MIN}자 이상 써주세요.`); return; }
    if (text.length > CONTENT_MAX) { toastError(`후기는 ${CONTENT_MAX}자까지 쓸 수 있어요.`); return; }
    setBusy(true);
    try {
      await api(`/resort-reviews/${resortId}`, { method: 'POST', body: { rating, content: text } });
      toastSuccess(myReview ? '후기를 수정했어요.' : '후기를 남겼어요. 고마워요!');
      setEditing(false);
      load();
    } catch (e) { toastError(e instanceof Error ? e.message : '후기 저장에 실패했어요.'); }
    finally { setBusy(false); }
  };

  const removeMine = async () => {
    if (!confirm('내 후기를 삭제할까요?')) return;
    setBusy(true);
    try {
      await api(`/resort-reviews/${resortId}`, { method: 'DELETE' });
      toastSuccess('후기를 삭제했어요.');
      setEditing(false); setRating(5); setContent('');
      load();
    } catch (e) { toastError(e instanceof Error ? e.message : '삭제에 실패했어요.'); }
    finally { setBusy(false); }
  };

  // 관리자 — 다른 회원 후기 삭제 (운영·신고 처리)
  const removeByAdmin = async (userId: string) => {
    if (!confirm('이 후기를 삭제할까요?')) return;
    setBusy(true);
    try {
      await api(`/resort-reviews/${resortId}/${userId}`, { method: 'DELETE' });
      toastSuccess('후기를 삭제했어요.');
      load();
    } catch (e) { toastError(e instanceof Error ? e.message : '삭제에 실패했어요.'); }
    finally { setBusy(false); }
  };

  const avg = data?.avg ?? 0;
  const count = data?.count ?? 0;

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">스키장 후기 {count > 0 && <span className="text-gray-500 font-normal">({count})</span>}</h2>
        {count > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Stars value={Math.round(avg)} />
            <span className="text-sm font-bold text-gray-900">{avg.toFixed(1)}</span>
          </span>
        )}
      </div>

      {/* 작성·수정 폼 — 로그인 회원. 이미 남긴 후기가 있으면 수정·삭제 */}
      {!user ? (
        <Link to={loginPath()} className="block w-full py-2.5 mb-4 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold text-center border border-sky-100 hover:bg-sky-100 transition-colors">
          로그인하고 후기 남기기
        </Link>
      ) : showForm ? (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-2.5">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}점`} className="active:scale-90 transition-transform">
                <StarIcon size={26} className={n <= rating ? 'text-amber-400' : 'text-gray-200'} />
              </button>
            ))}
            <span className="text-xs text-gray-500 ml-1">{rating}점</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={CONTENT_MAX}
            rows={3}
            placeholder="슬로프 상태, 시설, 붐비는 정도 등 다녀온 경험을 남겨주세요"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 tabular-nums">{content.length}/{CONTENT_MAX}</span>
            <div className="flex gap-2">
              {myReview && (
                <button type="button" onClick={() => { setEditing(false); setRating(myReview.rating); setContent(myReview.content); }} className="px-3 py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-lg">취소</button>
              )}
              <button type="button" onClick={submit} disabled={busy} className="px-4 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg disabled:opacity-40">
                {busy ? '저장 중...' : myReview ? '수정' : '후기 남기기'}
              </button>
            </div>
          </div>
        </div>
      ) : myReview ? (
        <div className="mb-4 p-3 bg-sky-50 rounded-xl border border-sky-100">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <Stars value={myReview.rating} size={12} />
              <span className="text-xs font-bold text-sky-700">내 후기</span>
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(true)} className="text-[11px] font-bold text-gray-600">수정</button>
              <button type="button" onClick={removeMine} disabled={busy} className="text-[11px] font-bold text-gray-500 hover:text-red-400 disabled:opacity-40">삭제</button>
            </div>
          </div>
          <p className="text-sm text-gray-800 mt-1 leading-relaxed whitespace-pre-wrap">{myReview.content}</p>
        </div>
      ) : null}

      {/* 목록 */}
      {loading && !data ? (
        <p className="text-sm text-gray-500 text-center py-4">불러오는 중...</p>
      ) : count === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">아직 후기가 없어요. 첫 후기를 남겨보세요.</p>
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((r) => (
            <div key={r.id} className="border-b border-gray-50 last:border-b-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Stars value={r.rating} size={12} />
                  <span className="text-xs font-medium text-gray-700">{r.user?.name || '스노우판 회원'}</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">{fmtDate(r.createdAt)}</span>
                  {user?.role === 'admin' && r.user && r.user.id !== user.id && (
                    <button type="button" onClick={() => removeByAdmin(r.user!.id)} disabled={busy} className="text-[11px] text-gray-500 hover:text-red-400 disabled:opacity-40">삭제</button>
                  )}
                </span>
              </div>
              <p className="text-sm text-gray-800 mt-1 leading-relaxed whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
