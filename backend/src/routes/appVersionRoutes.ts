// 앱 버전 안내 (2026-09-25, 사용자 요청 "앱 들어갔을 때 업데이트하라고 뜨는 팝업") — 앱이 켜질 때 GET /api/app/version 으로
// 최신 버전·최소 지원 버전을 받아 자기 버전과 비교한다. 최신보다 낮으면 '새 버전이 있어요' 띠, 최소보다 낮으면 업데이트 전까지 못 쓰는 창.
// 값은 관리자 설정(AdminSetting)에서 바꾼다: app_version_ios_latest / app_version_ios_min / app_version_android_latest / app_version_android_min.
import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../utils/cache';

export const APP_VERSION_KEYS = {
  iosLatest: 'app_version_ios_latest', iosMin: 'app_version_ios_min',
  androidLatest: 'app_version_android_latest', androidMin: 'app_version_android_min',
} as const;
// 스토어에 올라간 버전 기준 기본값 — 관리자 설정이 없을 때
export const APP_VERSION_DEFAULTS = { iosLatest: '1.7', iosMin: '1.6', androidLatest: '1.2', androidMin: '1.0' };
export const STORE_URLS = {
  ios: 'https://apps.apple.com/kr/app/%EC%8A%A4%EB%85%B8%EC%9A%B0%ED%8C%90/id6810708515?l=ko',
  android: 'https://play.google.com/store/apps/details?id=kr.snowpan.app', // 구글 승인 전엔 스토어에 없음 — 앱은 링크가 열리지 않으면 안내만 함
};
export const VERSION_RE = /^\d{1,3}(\.\d{1,3}){0,2}$/;
const CACHE_KEY = 'app-version';

export interface AppVersionValues { iosLatest: string; iosMin: string; androidLatest: string; androidMin: string }

export async function readAppVersionValues(): Promise<AppVersionValues> {
  const rows = await prisma.adminSetting.findMany({ where: { key: { in: Object.values(APP_VERSION_KEYS) } } });
  const get = (k: string, d: string) => { const v = rows.find((r) => r.key === k)?.value; return v && VERSION_RE.test(v) ? v : d; };
  return {
    iosLatest: get(APP_VERSION_KEYS.iosLatest, APP_VERSION_DEFAULTS.iosLatest),
    iosMin: get(APP_VERSION_KEYS.iosMin, APP_VERSION_DEFAULTS.iosMin),
    androidLatest: get(APP_VERSION_KEYS.androidLatest, APP_VERSION_DEFAULTS.androidLatest),
    androidMin: get(APP_VERSION_KEYS.androidMin, APP_VERSION_DEFAULTS.androidMin),
  };
}
export function invalidateAppVersionCache(): void { cacheDel(CACHE_KEY); }

const router = Router();
router.get('/version', async (_req: Request, res: Response): Promise<void> => {
  try {
    let payload = cacheGet<unknown>(CACHE_KEY);
    if (!payload) {
      const v = await readAppVersionValues();
      payload = {
        ios: { latest: v.iosLatest, minSupported: v.iosMin, url: STORE_URLS.ios },
        android: { latest: v.androidLatest, minSupported: v.androidMin, url: STORE_URLS.android },
      };
      cacheSet(CACHE_KEY, payload, 60);
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (e) { console.error('App version error:', e); res.status(500).json({ error: '버전 정보를 불러오지 못했어요.' }); }
});
export default router;
