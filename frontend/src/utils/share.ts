import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

// 공유 한 곳으로 (2026-10-14, 사장님 "앱에서 중고상품 공유버튼이 안 된다").
// 원인 둘: (1) 앱 웹뷰엔 navigator.share 가 없거나(안드로이드) 막혀 있고 조용히 실패했음 → 네이티브 Share 플러그인 사용.
// (2) 앱 안의 window.location 은 localhost 라 공유해도 남이 못 여는 주소였음 → 항상 https://snowpan.kr 주소로 바꿔 보낸다.
const SITE_ORIGIN = 'https://snowpan.kr';

const PUBLIC_HOSTS = new Set(['snowpan.kr', 'www.snowpan.kr']);

// 경로('/used/abc') 또는 절대주소를 받아 남이 열 수 있는 공개 주소로. 비우면 현재 화면.
function publicUrl(pathOrUrl?: string): string {
  const raw = pathOrUrl || `${window.location.pathname}${window.location.search}`;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (PUBLIC_HOSTS.has(u.hostname)) return raw;
      return `${SITE_ORIGIN}${u.pathname}${u.search}${u.hash}`;
    } catch { return raw; }
  }
  return `${SITE_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareOptions { title?: string; text?: string; url?: string }

// 앱: 네이티브 공유창(카톡·인스타·문자 등). 웹: 모바일 브라우저 공유창 → 없으면 클립보드 복사.
export async function shareLink({ title, text, url }: ShareOptions): Promise<ShareResult> {
  const shareUrl = publicUrl(url);
  const shareTitle = title || document.title;
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ title: shareTitle, text: text || undefined, url: shareUrl, dialogTitle: '공유' });
      return 'shared';
    } catch (err) {
      if (/cancel/i.test(String((err as { message?: string } | null)?.message || err))) return 'cancelled';
      // 공유창을 못 띄운 경우만 복사로
    }
  } else if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: shareTitle, text: text || undefined, url: shareUrl });
      return 'shared';
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(shareUrl);
    return 'copied';
  } catch {
    window.prompt('링크를 복사하세요:', shareUrl);
    return 'failed';
  }
}
