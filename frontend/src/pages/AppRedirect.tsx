import { useEffect } from 'react';
import { APP_STORE_URL, PLAY_STORE_URL } from '../utils/appLinks';

// snowpan.kr/app — 포스터·명함 QR 용 짧은 주소 (2026-10-05). 아이폰은 App Store, 안드로이드는 Google Play 로 바로 보내고,
// PC 등 그 밖의 기기는 두 스토어 버튼을 보여준다.
export default function AppRedirect() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const target = /Android/i.test(ua) ? PLAY_STORE_URL : /iPhone|iPad|iPod/i.test(ua) ? APP_STORE_URL : '';
  useEffect(() => { if (target) window.location.replace(target); }, [target]);
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] text-gray-500">SNOWPAN</p>
        <h1 className="text-xl font-bold text-gray-900 mt-2">스노우판 앱 받기</h1>
        <p className="text-sm text-gray-600 mt-2">{target ? '스토어로 이동하고 있어요.' : '휴대폰에 맞는 스토어를 골라 주세요.'}</p>
        <div className="grid gap-2 mt-5">
          <a href={APP_STORE_URL} className="block w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold">App Store 에서 받기</a>
          <a href={PLAY_STORE_URL} className="block w-full py-3 rounded-xl border border-gray-900 text-gray-900 text-sm font-bold">Google Play 에서 받기</a>
        </div>
      </div>
    </div>
  );
}
