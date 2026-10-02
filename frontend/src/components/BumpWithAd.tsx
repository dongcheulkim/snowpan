import { useCallback, useState } from 'react';
import { api, isNativeApp } from '../api';
import { toastError, toastSuccess } from '../utils/toast';
import { watchRewardedAdNative, type AdProof } from '../utils/rewardedAd';
import HouseAdModal from './HouseAdModal';

// 끌어올리기 공통 훅: 앱이면 애드몹 보상형 영상 → 못 띄우면 웹 방식(광고 카드 5초) → 둘 다 끝나면 PUT /products/:id/bump (2026-10-02)
export function useBumpWithAd(onBumped?: (id: string) => void) {
  const [pendingId, setPendingId] = useState<string | null>(null); // HouseAdModal 이 열린 매물
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async (id: string, proof: AdProof) => {
    setBusy(true);
    try {
      await api(`/products/${id}/bump`, { method: 'PUT', body: JSON.stringify({ adProof: proof }) });
      toastSuccess('맨 위로 끌어올렸어요!');
      onBumped?.(id);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '끌어올리기에 실패했습니다.');
    } finally { setBusy(false); }
  }, [onBumped]);

  const start = useCallback(async (id: string) => {
    if (busy) return;
    if (isNativeApp()) {
      setBusy(true);
      let proof: AdProof | null = null;
      try { proof = await watchRewardedAdNative(); } catch { proof = null; }
      setBusy(false);
      if (proof) { await submit(id, proof); return; }
      // 영상을 못 띄움(광고 없음·로드 실패) → 광고 카드 방식으로
    }
    setPendingId(id);
  }, [busy, submit]);

  const modal = pendingId ? (
    <HouseAdModal
      onClose={() => setPendingId(null)}
      onDone={(adId) => { const id = pendingId; setPendingId(null); void submit(id, { source: 'house', adId }); }}
    />
  ) : null;

  return { start, busy, modal };
}
