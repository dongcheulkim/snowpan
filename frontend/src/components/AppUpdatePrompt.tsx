import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { api } from '../api';

// 앱 업데이트 안내 (2026-09-25, 사용자 요청) — 앱(iOS/Android)에서만. 켜질 때와 다시 활성화될 때 서버의 최신·최소 버전과 비교.
//   설치 버전 < 최소 지원 버전 → 닫을 수 없는 창 (업데이트 전까지 사용 불가)
//   설치 버전 < 최신 버전     → 아래 띠 '새 버전이 있어요' (나중에 → 3일 동안 안 보임)
// 브라우저에서 확인할 땐 개발 모드에서 ?simulateApp=ios:1.5 로 흉내낼 수 있다.
interface VersionInfo { ios: { latest: string; minSupported: string; url: string }; android: { latest: string; minSupported: string; url: string } }
type Level = 'none' | 'soft' | 'force';
const DISMISS_KEY = 'snowpan:update-dismissed';
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

// '1.7' vs '1.7.1' 처럼 자리 수가 달라도 비교 (숫자 조각 순서대로)
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0); const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}

async function installed(): Promise<{ platform: 'ios' | 'android'; version: string } | null> {
  if (Capacitor.isNativePlatform()) {
    const p = Capacitor.getPlatform();
    if (p !== 'ios' && p !== 'android') return null;
    try { const info = await App.getInfo(); return { platform: p, version: info.version }; } catch { return null; }
  }
  if (import.meta.env.DEV) {
    const sim = new URLSearchParams(window.location.search).get('simulateApp'); // 예: ios:1.5
    const m = sim && /^(ios|android):(\d+(\.\d+)*)$/.exec(sim);
    if (m) return { platform: m[1] as 'ios' | 'android', version: m[2] };
  }
  return null;
}

export default function AppUpdatePrompt() {
  const [state, setState] = useState<{ level: Level; latest: string; url: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const me = await installed();
      if (!me) return;
      try {
        const v = await api<VersionInfo>('/app/version');
        const target = v[me.platform];
        if (!target || !alive) return;
        let level: Level = 'none';
        if (compareVersions(me.version, target.minSupported) < 0) level = 'force';
        else if (compareVersions(me.version, target.latest) < 0) level = 'soft';
        if (level === 'soft') {
          try { const d = JSON.parse(localStorage.getItem(DISMISS_KEY) || 'null'); if (d && d.version === target.latest && Date.now() - d.at < DISMISS_MS) level = 'none'; } catch { /* 무시 */ }
        }
        setState({ level, latest: target.latest, url: target.url });
      } catch { /* 서버 응답 없으면 안내하지 않음 */ }
    };
    check();
    let handle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => { if (isActive) check(); }).then((h) => { handle = h; }).catch(() => {});
    }
    return () => { alive = false; handle?.remove(); };
  }, []);

  if (!state || state.level === 'none') return null;
  const openStore = () => { window.open(state.url, '_blank'); };
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, JSON.stringify({ version: state.latest, at: Date.now() })); } catch { /* 무시 */ } setState({ ...state, level: 'none' }); };

  if (state.level === 'force') {
    return (
      <div role="dialog" aria-modal="true" aria-label="업데이트 필요" className="fixed inset-0 z-[200] bg-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <p className="text-lg font-bold text-gray-900">업데이트가 필요해요</p>
          <p className="text-sm text-gray-600 leading-relaxed">지금 쓰시는 버전은 더 이상 지원되지 않아요. 최신 버전 {state.latest}로 업데이트하면 바로 이어서 쓸 수 있어요.</p>
          <button type="button" onClick={openStore} className="w-full min-h-12 rounded-xl bg-gray-900 text-white text-sm font-bold">업데이트하러 가기</button>
        </div>
      </div>
    );
  }
  return (
    <div role="status" className="fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-[150] bg-gray-900 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">새 버전이 있어요</p>
        <p className="text-[11px] text-white/70">스노우판 {state.latest}로 업데이트하면 새 기능을 쓸 수 있어요.</p>
      </div>
      <button type="button" onClick={dismiss} className="min-h-10 px-2 text-xs text-white/70">나중에</button>
      <button type="button" onClick={openStore} className="min-h-10 px-3 rounded-lg bg-white text-gray-900 text-xs font-bold">업데이트</button>
    </div>
  );
}
