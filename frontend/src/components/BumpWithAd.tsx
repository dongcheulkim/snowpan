import { useCallback, useEffect, useState } from 'react';
import { api, getUser, isNativeApp } from '../api';
import { toastError, toastSuccess } from '../utils/toast';
import { watchRewardedAdNative, type AdProof } from '../utils/rewardedAd';
import HouseAdModal from './HouseAdModal';

// 끌어올리기 공통 훅 (2026-10-02, 적립식 2026-10-05).
//  - earn(): 짧은 광고(앱: 애드몹 보상형 영상 / 웹: 광고 카드 5초)를 보고 끌어올리기 1개 챙기기
//  - start(id): 보유한 끌어올리기가 있으면 1개 써서 바로, 없으면 광고를 보고 바로 끌어올림
interface Credits { credits: number; earnedToday: number; dailyLimit: number; webDailyLimit?: number; maxHold: number }
const WEB_LIMIT_MSG = '웹에서는 하루 1개만 받을 수 있어요. 스노우판 앱에서 광고를 보면 더 받을 수 있어요.';
type Pending = { type: 'bump'; id: string } | { type: 'earn' };

export function useBumpWithAd(onBumped?: (id: string) => void) {
  const [pending, setPending] = useState<Pending | null>(null); // HouseAdModal 이 열린 이유
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<Credits | null>(null);
  const loggedIn = !!getUser()?.id;

  const refresh = useCallback(() => {
    if (!loggedIn) return;
    api<Credits>('/products/bump-credits').then(setInfo).catch(() => { /* 옛 서버·오프라인이면 숫자 없이 동작 */ });
  }, [loggedIn]);
  useEffect(() => { refresh(); }, [refresh]);

  // 광고를 보여주고 증빙을 받는다. 앱에서 영상이 안 뜨면(null) 웹 방식 모달로 넘김 → 그때는 'modal' 을 돌려줌
  const watchAd = useCallback(async (): Promise<AdProof | 'modal'> => {
    if (isNativeApp()) {
      let proof: AdProof | null = null;
      try { proof = await watchRewardedAdNative(); } catch { proof = null; }
      if (proof) return proof;
    }
    return 'modal';
  }, []);

  const doBump = useCallback(async (id: string, proof?: AdProof) => {
    setBusy(true);
    try {
      const r = await api<{ bumpCreditsLeft?: number }>(`/products/${id}/bump`, { method: 'PUT', body: proof ? { adProof: proof } : { useCredit: true } });
      toastSuccess('맨 위로 끌어올렸어요!');
      if (typeof r?.bumpCreditsLeft === 'number') setInfo((p) => (p ? { ...p, credits: r.bumpCreditsLeft as number, earnedToday: proof ? p.earnedToday + 1 : p.earnedToday } : p));
      else refresh();
      onBumped?.(id);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '끌어올리기에 실패했습니다.');
      refresh();
    } finally { setBusy(false); }
  }, [onBumped, refresh]);

  const doEarn = useCallback(async (proof: AdProof) => {
    setBusy(true);
    try {
      const r = await api<Credits>('/products/bump-credits/earn', { method: 'POST', body: { adProof: proof } });
      setInfo(r);
      toastSuccess(`끌어올리기 1개를 챙겼어요. 지금 ${r.credits}개 있어요.`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '끌어올리기를 받지 못했어요.');
      refresh();
    } finally { setBusy(false); }
  }, [refresh]);

  // 웹(광고 카드)은 하루 1개까지 — 그 뒤는 앱에서 (서버도 같은 규칙으로 막음)
  const webLimitReached = !isNativeApp() && !!info && info.earnedToday >= (info.webDailyLimit ?? 1) && info.earnedToday < info.dailyLimit;

  // 매물 끌어올리기
  const start = useCallback(async (id: string) => {
    if (busy) return;
    if (info && info.credits > 0) { await doBump(id); return; }
    if (webLimitReached) { toastError(WEB_LIMIT_MSG); return; }
    setBusy(true); const got = await watchAd(); setBusy(false);
    if (got === 'modal') setPending({ type: 'bump', id }); else await doBump(id, got);
  }, [busy, info, doBump, watchAd, webLimitReached]);

  // 광고 보고 끌어올리기 1개 챙기기
  const earn = useCallback(async () => {
    if (busy) return;
    if (info && info.earnedToday >= info.dailyLimit) { toastError(`끌어올리기는 하루 ${info.dailyLimit}개까지 받을 수 있어요. 내일 다시 받아 주세요.`); return; }
    if (webLimitReached) { toastError(WEB_LIMIT_MSG); return; }
    setBusy(true); const got = await watchAd(); setBusy(false);
    if (got === 'modal') setPending({ type: 'earn' }); else await doEarn(got);
  }, [busy, info, doEarn, watchAd, webLimitReached]);

  const modal = pending ? (
    <HouseAdModal
      doneLabel={pending.type === 'earn' ? '끌어올리기 챙기기' : '끌어올리기'}
      onClose={() => setPending(null)}
      onDone={(adId) => { const p = pending; setPending(null); const proof: AdProof = { source: 'house', adId }; if (p.type === 'earn') void doEarn(proof); else void doBump(p.id, proof); }}
    />
  ) : null;

  return { start, earn, busy, modal, webLimitReached, credits: info?.credits ?? null, earnedToday: info?.earnedToday ?? 0, dailyLimit: info?.dailyLimit ?? 3 };
}
