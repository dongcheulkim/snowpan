import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { toastSuccess, toastError } from './Toast';

interface PendingReview {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  sellerId: string;
  seller: { id: string; name: string; nickname: string | null; profileImage: string | null } | null;
  soldAt: string;
}

const DISMISS_KEY = 'review_prompt_dismissed';
const DISMISS_DAYS = 3;

function getDismissedSet(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}'); } catch { return {}; }
}

function isDismissedFresh(productId: string): boolean {
  const map = getDismissedSet();
  const ts = map[productId];
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function markDismissed(productId: string) {
  const map = getDismissedSet();
  map[productId] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
}

export default function ReviewPromptModal() {
  const [target, setTarget] = useState<PendingReview | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!getUser()) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      api<{ pending: PendingReview[] }>('/reviews/pending-for-me')
        .then((data) => {
          if (cancelled) return;
          const next = (data?.pending || []).find((p) => !isDismissedFresh(p.productId));
          if (next) setTarget(next);
        })
        .catch(() => {});
    }, 6000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // ESC 닫기 + 열릴 때 첫 인터랙티브 요소로 포커스 이동 + 닫을 때 이전 포커스 복원
  useEffect(() => {
    if (!target) return;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    const focusable = dialogRef.current?.querySelector<HTMLElement>('button, textarea, [href]');
    focusable?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        e.preventDefault();
        handleDismiss();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.productId, submitting]);

  if (!target || !target.seller) return null;

  const sellerName = target.seller.nickname || target.seller.name;

  const handleDismiss = () => {
    markDismissed(target.productId);
    setTarget(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { toastError('리뷰 내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      await api('/reviews', {
        method: 'POST',
        body: {
          sellerId: target.sellerId,
          productId: target.productId,
          rating,
          content: content.trim(),
        },
      });
      markDismissed(target.productId);
      toastSuccess('리뷰가 등록되었습니다. 감사합니다!');
      setTarget(null);
      setContent('');
      setRating(5);
    } catch (err) {
      toastError(err instanceof Error ? err.message : '리뷰 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="review-prompt-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && handleDismiss()} aria-hidden="true" />
      <div ref={dialogRef} className="relative bg-snow rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <p className="text-[11px] font-bold text-accent tracking-wider">DEAL FEEDBACK</p>
          <h3 id="review-prompt-title" className="text-lg font-bold text-gray-900 mt-0.5">거래 어떠셨나요?</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            <Link to={`/profile/${target.sellerId}`} className="text-accent font-bold">{sellerName}</Link>님과의 거래에 대해 짧게 후기를 남겨주세요. 다른 사용자에게 큰 도움이 됩니다.
          </p>
        </div>

        <div className="px-5 py-4 flex items-center gap-3 bg-gray-50">
          <img
            src={target.productImage?.startsWith('http') ? target.productImage : imageUrl(target.productImage, 120)}
            alt=""
            className="w-14 h-14 rounded-lg object-cover bg-gray-200 flex-shrink-0"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{target.productName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{target.productPrice.toLocaleString()}원</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="p-1 transition-transform active:scale-90"
                aria-label={`${n}점`}
              >
                <svg
                  className={`w-8 h-8 ${n <= rating ? 'text-gold' : 'text-gray-500'}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="물건 상태, 응대, 약속 시간 — 솔직하게 적어주세요."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-accent resize-none"
          />
          <div className="text-right text-[10px] text-gray-500 mt-0.5">{content.length}/500</div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              나중에
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? '등록 중...' : '리뷰 등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
