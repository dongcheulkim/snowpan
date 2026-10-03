// "광고 보고 끌어올리기" — 앱은 애드몹 보상형 영상, 웹은 입점 광고주 카드 5초 시청(HouseAdModal) (2026-10-02).
// 애드몹 ID 는 사장님 애드몹 계정에서 발급 (바탕화면 애드몹_설정_안내.md). 비어 있으면 구글 테스트 ID 로 동작(스토어 제출 전 반드시 교체).
import { Capacitor } from '@capacitor/core';
import { isNativeApp } from '../api';

export type AdProof = { source: 'admob' | 'house'; adId?: string };

// 애드몹 광고 단위 ID (공개 식별자 — 비밀 아님). 사장님 계정 2026-10-03 발급. 비어 있으면 구글 테스트 ID 로 동작.
const TEST_REWARD = { android: 'ca-app-pub-3940256099942544/5224354917', ios: 'ca-app-pub-3940256099942544/1712485313' };
const REAL_REWARD: { android: string | null; ios: string | null } = {
  android: 'ca-app-pub-5238113676351064/6417586102', // 끌어올리기 보상 (Android)
  ios: 'ca-app-pub-5238113676351064/9295030881', // 끌어올리기 보상 (iOS)
};
function platformKey(): 'android' | 'ios' { return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'; }
export function admobIsTestFor(pf: 'android' | 'ios' = platformKey()): boolean { return !REAL_REWARD[pf]; }
function rewardUnitId(): string { const pf = platformKey(); return REAL_REWARD[pf] || TEST_REWARD[pf]; }

let inited: Promise<void> | null = null;
type AdMobPlugin = typeof import('@capacitor-community/admob').AdMob;
// 주의: Capacitor 플러그인 프록시(AdMob)를 async 함수에서 그대로 return 하면 안 됨 — Promise 가 .then 을 찾아
// "AdMob.then() is not implemented on android" 오류가 남 (2026-10-03 에뮬레이터에서 발견). 초기화만 하고 객체는 돌려주지 않는다.
async function ensureInit(AdMob: AdMobPlugin): Promise<void> {
  if (!inited) {
    inited = (async () => {
      await AdMob.initialize({ initializeForTesting: admobIsTestFor() });
      // iOS 14+: 맞춤 광고용 추적 허용 팝업 — 거부해도 광고(비맞춤)는 나옴. 처음 한 번만 뜸.
      if (Capacitor.getPlatform() === 'ios') {
        try { const st = await AdMob.trackingAuthorizationStatus(); if (st.status === 'notDetermined') await AdMob.requestTrackingAuthorization(); } catch { /* ignore */ }
      }
    })();
  }
  await inited;
}

// 앱: 보상형 영상을 끝까지 보면 adProof 를 돌려준다. 못 보여주면(미로드·닫음) null.
export async function watchRewardedAdNative(): Promise<AdProof | null> {
  if (!isNativeApp()) return null;
  const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');
  await ensureInit(AdMob);
  const adId = rewardUnitId();
  return new Promise<AdProof | null>((resolve) => {
    let rewarded = false; const subs: { remove: () => Promise<void> }[] = [];
    const done = (v: AdProof | null) => { subs.forEach((s) => s.remove().catch(() => {})); resolve(v); };
    (async () => {
      subs.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; }));
      subs.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => done(rewarded ? { source: 'admob', adId } : null)));
      subs.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => done(null)));
      subs.push(await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => done(null)));
      try { await AdMob.prepareRewardVideoAd({ adId, isTesting: admobIsTestFor() }); await AdMob.showRewardVideoAd(); }
      catch { done(null); }
    })();
  });
}
