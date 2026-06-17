// AdMob 보상형 광고 — 쿠폰 구매 전 시청. 끝까지 봐야 reward 콜백.
// 테스트 ID 가 디폴트 (실제 운영은 EXPO_PUBLIC_ADMOB_REWARDED_* 로 오버라이드).

import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { api } from './api';

const REWARDED_AD_UNIT_ID =
  (Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS
    : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID) || TestIds.REWARDED;

let cachedAd: RewardedAd | null = null;
let cachedAdReady = false;
let cachedAdLoading = false;

function preloadIfIdle() {
  if (cachedAd && (cachedAdReady || cachedAdLoading)) return;
  cachedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  cachedAdLoading = true;
  cachedAdReady = false;

  const loadedSub = cachedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    cachedAdReady = true;
    cachedAdLoading = false;
  });
  const errorSub = cachedAd.addAdEventListener(AdEventType.ERROR, (e) => {
    console.warn('[admob] load error', e);
    cachedAdReady = false;
    cachedAdLoading = false;
    cachedAd = null;
    loadedSub();
    errorSub();
  });

  cachedAd.load();
}

// 모듈 import 시 백그라운드 프리로드 (앱 시작 직후 1초 안에 준비됨).
preloadIfIdle();

export type ShowResult =
  | { ok: true; viewId: string }
  | { ok: false; reason: string };

// 보상형 광고를 띄우고 reward 콜백까지 받아 백엔드 기록 후 viewId 반환.
// 실패 시 reason 으로 표시.
export async function showRewardedAd(purpose: 'coupon_purchase'): Promise<ShowResult> {
  // 광고가 준비 안 됐으면 잠시 기다림 (최대 5초).
  if (!cachedAd || !cachedAdReady) {
    preloadIfIdle();
    const start = Date.now();
    while ((!cachedAd || !cachedAdReady) && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!cachedAd || !cachedAdReady) return { ok: false, reason: '광고를 불러올 수 없습니다. 잠시 후 다시 시도하세요.' };
  }

  const ad = cachedAd;
  return new Promise<ShowResult>((resolve) => {
    let resolved = false;
    const done = (r: ShowResult) => { if (!resolved) { resolved = true; resolve(r); } };

    const earnedSub = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      try {
        const view = await api<{ id: string }>('/ads/view', {
          method: 'POST',
          body: { source: 'admob', platform: Platform.OS, purpose },
        });
        done({ ok: true, viewId: view.id });
      } catch (e) {
        done({ ok: false, reason: '시청 기록 저장 실패: ' + (e as Error).message });
      } finally {
        earnedSub();
        closedSub();
        errorSub();
        // 다음 광고 프리로드.
        cachedAd = null;
        cachedAdReady = false;
        preloadIfIdle();
      }
    });

    const closedSub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      // EARNED 없이 닫으면 미시청.
      done({ ok: false, reason: '광고를 끝까지 봐야 구매할 수 있습니다.' });
      earnedSub();
      closedSub();
      errorSub();
      cachedAd = null;
      cachedAdReady = false;
      preloadIfIdle();
    });

    const errorSub = ad.addAdEventListener(AdEventType.ERROR, (e) => {
      done({ ok: false, reason: '광고 재생 오류: ' + e.message });
      earnedSub();
      closedSub();
      errorSub();
      cachedAd = null;
      cachedAdReady = false;
      preloadIfIdle();
    });

    ad.show();
  });
}
