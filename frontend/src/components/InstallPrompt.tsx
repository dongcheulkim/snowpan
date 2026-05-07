import { useEffect, useState } from 'react';
import { CloseIcon } from './Icons';

// PWA 설치 프롬프트 — Android 는 beforeinstallprompt 이벤트, iOS Safari 는 직접 가이드.
// 한 번 닫으면 30일간 다시 안 뜸.
const STORAGE_KEY = 'install-prompt-dismissed-at';
const COOLDOWN_DAYS = 30;

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOSSafari(): boolean {
  const ua = window.navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && safari;
}

function isDismissedRecently(): boolean {
  try {
    const at = localStorage.getItem(STORAGE_KEY);
    if (!at) return false;
    const ms = Date.now() - parseInt(at, 10);
    return ms < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

export default function InstallPrompt() {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    // Android Chrome — beforeinstallprompt 이벤트 캐치
    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    // iOS Safari — 페이지 로딩 5초 후 가이드 표시
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIOSSafari()) {
      iosTimer = setTimeout(() => setShowIos(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    setBip(null);
    setShowIos(false);
  };

  const installAndroid = async () => {
    if (!bip) return;
    try {
      await bip.prompt();
      await bip.userChoice;
    } catch { /* ignore */ }
    dismiss();
  };

  if (bip) {
    return (
      <Card title="앱처럼 설치할까요?" onClose={dismiss}>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          홈 화면에 추가하면 더 빠르게 접속할 수 있어요. 데이터 사용량도 줄어들고 푸시 알림도 받을 수 있어요.
        </p>
        <div className="flex gap-2">
          <button onClick={dismiss} className="flex-1 min-h-11 px-3 py-2 text-xs font-bold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            나중에
          </button>
          <button onClick={installAndroid} className="flex-1 min-h-11 px-3 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800">
            홈 화면에 추가
          </button>
        </div>
      </Card>
    );
  }

  if (showIos) {
    return (
      <Card title="홈 화면에 추가하기" onClose={dismiss}>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          Safari 하단의 <strong>공유 버튼</strong> <span aria-hidden>⎙</span> 을 누르고{' '}
          <strong>"홈 화면에 추가"</strong> 를 선택하면 앱처럼 사용할 수 있어요.
        </p>
        <button onClick={dismiss} className="w-full min-h-11 px-3 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg">
          확인
        </button>
      </Card>
    );
  }

  return null;
}

function Card({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[55]"
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl px-5 py-4 relative">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-2 right-2 w-9 h-9 inline-flex items-center justify-center text-gray-400 hover:text-gray-700"
        >
          <CloseIcon size={16} />
        </button>
        <h2 id="install-title" className="text-sm font-bold text-gray-900 mb-1.5 pr-8">{title}</h2>
        {children}
      </div>
    </div>
  );
}
