// 브라우저 네이티브 알림 (탭 열려있을 때만 동작).
// Firebase 의존성 제거 — 외부 키 없이 즉시 작동.
// 백그라운드 푸시는 추후 VAPID + Web Push 로 별도 구현.

const PROMPT_DISMISSED_KEY = 'push_prompt_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function shouldShowPushPrompt(): boolean {
  if (!isPushSupported()) return false;
  if (Notification.permission !== 'default') return false;
  const dismissedAt = Number(localStorage.getItem(PROMPT_DISMISSED_KEY) || 0);
  return Date.now() - dismissedAt > DISMISS_COOLDOWN_MS;
}

export function dismissPushPrompt(): void {
  localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
}

interface NotifyOptions {
  title: string;
  body?: string;
  link?: string;
  tag?: string;
}

// 탭이 보이지 않을 때만 알림 — 사용자가 보고 있는데 알림 띄우면 산만함.
export function showBrowserNotification({ title, body, link, tag }: NotifyOptions): void {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  try {
    const notif = new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag,
    });
    notif.onclick = () => {
      window.focus();
      if (link) window.location.href = link;
      notif.close();
    };
  } catch {
    // Some browsers (older iOS) throw despite Notification existing.
  }
}
