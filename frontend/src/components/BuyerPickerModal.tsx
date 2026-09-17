import { useEffect, useState } from 'react';
import { api, imageUrl } from '../api';
import { CloseIcon, UserIcon } from './Icons';

// 판매 완료 시 "누구에게 판매했나요?" — 판매자와 채팅한 상대 중 구매자를 고른다.
// 고르면 그 구매자에게만 후기 요청 알림이 가고, 후기 자격도 그 사람으로 제한된다.
// "선택 안 함"은 앱 밖 거래(buyerId 없음) 로 처리.

export interface BuyerCandidate {
  id: string;
  name: string;
  profileImage: string | null;
  lastMessageAt: string;
}

interface Props {
  productId: string;
  productName: string;
  onPick: (buyerId: string | null, candidate?: BuyerCandidate) => void;
  onClose: () => void;
}

function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function BuyerPickerModal({ productId, productName, onPick, onClose }: Props) {
  const [candidates, setCandidates] = useState<BuyerCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCandidates(null);
    setError(null);
    api<{ candidates: BuyerCandidate[] }>(`/products/${productId}/buyer-candidates`)
      .then((data) => { if (!cancelled) setCandidates(data?.candidates || []); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : '채팅 상대를 불러오지 못했어요.'); });
    return () => { cancelled = true; };
  }, [productId, reloadKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const selected = candidates?.find((c) => c.id === selectedId) || null;

  // 부모가 PUT 을 끝내고 모달을 내릴 때까지 두 번 누르지 못하게 잠근다.
  const pick = (buyerId: string | null, candidate?: BuyerCandidate) => {
    if (busy) return;
    setBusy(true);
    onPick(buyerId, candidate);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="buyer-picker-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div className="relative bg-snow rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="buyer-picker-title" className="text-lg font-bold text-gray-900">누구에게 판매했나요?</h3>
            <p className="text-xs text-gray-500 mt-1 truncate">{productName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="닫기" className="p-1 -mr-1 text-gray-400 hover:text-gray-600 disabled:opacity-50">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="mx-5 mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
          선택하면 구매자에게 후기 요청 알림이 가요.
        </div>

        <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
          {error ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-600">{error}</p>
              <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-3 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors">
                다시 불러오기
              </button>
            </div>
          ) : candidates === null ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
                    <div className="h-2.5 w-16 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-6 leading-relaxed">
              아직 채팅한 상대가 없어요.<br />앱 밖 거래로 처리할 수 있어요.
            </p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((c) => {
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(active ? null : c.id)}
                      disabled={busy}
                      aria-pressed={active}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${active ? 'border-accent bg-accent/5' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      {c.profileImage ? (
                        <img src={imageUrl(c.profileImage, 80)} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0"><UserIcon size={20} /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">최근 대화 {formatMonthDay(c.lastMessageAt)}</p>
                      </div>
                      <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? 'border-accent bg-accent' : 'border-gray-300'}`} aria-hidden="true">
                        {active && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L19 7" /></svg>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 pb-5 space-y-2">
          <button
            type="button"
            onClick={() => selected && pick(selected.id, selected)}
            disabled={busy || !selected}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors active:scale-[0.98] disabled:opacity-40"
          >
            {busy && selected ? '처리 중' : selected ? `${selected.name}님에게 판매했어요` : '구매자를 선택해 주세요'}
          </button>
          <button
            type="button"
            onClick={() => pick(null)}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            선택 안 함 · 앱 밖에서 거래했어요
          </button>
        </div>
      </div>
    </div>
  );
}
