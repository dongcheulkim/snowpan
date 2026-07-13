// 스노우런 세션 — 웹 버전. 고도 기반 자동 감지로 슬로프마다 +1 런.
// 웹은 화면 켜져있어야 동작 (Wake Lock 으로 화면 잠금 방지).
// 진짜 백그라운드는 앱이 필요.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

// === 임계치 (앱 트래커와 동일) ===
const T = {
  altDeltaThresholdMps: -1,
  descentSettleSec: 5,
  descentEndAltStableMps: 0.2,
  descentEndAltStableSec: 10,
  descentEndStopSpeedKmh: 2,
  descentEndStopSec: 30,
  altSmoothingWindow: 5,
  minDurationSec: 15,
  minVerticalDropM: 20,
  minDistanceM: 100,
};

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

interface DescentBuffer {
  startedAt: number;
  endedAt: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number;
  startAlt: number;
  samplePoints: { lat: number; lng: number }[];
  fullTrack: { lat: number; lng: number; alt: number | null; t: number }[];
}

interface SessionUI {
  runCount: number;
  totalDistanceM: number;
  totalVerticalDropM: number;
  pointsAwardedThisSession: number;
  phase: 'IDLE' | 'DESCENDING';
  currentDescent: DescentBuffer | null;
  currentSpeedKmh: number;
  hasAltitude: boolean;
  lastMessage: string | null;
}

const emptyUI = (): SessionUI => ({
  runCount: 0,
  totalDistanceM: 0,
  totalVerticalDropM: 0,
  pointsAwardedThisSession: 0,
  phase: 'IDLE',
  currentDescent: null,
  currentSpeedKmh: 0,
  hasAltitude: false,
  lastMessage: null,
});

const SnowRunRecord = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number>(0);
  const [ui, setUi] = useState<SessionUI>(emptyUI());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // 백그라운드 상태(렌더링 외 트래킹 상태) — Ref 로 관리.
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const altBufferRef = useRef<{ alt: number; t: number }[]>([]);
  const lowSpeedStartRef = useRef<number | null>(null);
  const altStableStartRef = useRef<number | null>(null);
  const lastLatRef = useRef<number | null>(null);
  const lastLngRef = useRef<number | null>(null);
  const sessionRef = useRef<SessionUI>(emptyUI());

  // UI 갱신 — 1초마다 sessionRef 를 state 로 복사.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setUi({ ...sessionRef.current });
      setElapsedSec(Math.floor((Date.now() - sessionStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [active, sessionStartedAt]);

  const acquireWakeLock = async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock) wakeLockRef.current = await nav.wakeLock.request('screen');
    } catch {}
  };

  // === 트래킹 로직 ===
  const smoothedAltAndRate = (): { alt: number | null; ratePerSec: number | null } => {
    const buf = altBufferRef.current;
    if (buf.length === 0) return { alt: null, ratePerSec: null };
    const recent = buf.slice(-T.altSmoothingWindow);
    const avg = recent.reduce((s, x) => s + x.alt, 0) / recent.length;
    if (buf.length < 2) return { alt: avg, ratePerSec: null };
    const oldest = buf[Math.max(0, buf.length - T.altSmoothingWindow)];
    const newest = buf[buf.length - 1];
    const dt = (newest.t - oldest.t) / 1000;
    if (dt <= 0) return { alt: avg, ratePerSec: null };
    return { alt: avg, ratePerSec: (newest.alt - oldest.alt) / dt };
  };

  const submitDescent = async (d: DescentBuffer) => {
    const durationSec = Math.max(1, Math.round((d.endedAt - d.startedAt) / 1000));
    const avgSpeedKmh = (d.distanceM / durationSec) * 3.6;
    try {
      const result = await api<{ pointsAwarded: number; message: string }>('/snow-runs', {
        method: 'POST',
        body: {
          startedAt: new Date(d.startedAt).toISOString(),
          endedAt: new Date(d.endedAt).toISOString(),
          distanceM: Math.round(d.distanceM),
          verticalDropM: Math.round(d.verticalDropM),
          maxSpeedKmh: d.maxSpeedKmh,
          avgSpeedKmh,
          source: 'web_gps',
          samplePoints: d.samplePoints,
          trackJson: d.fullTrack,
        },
      });
      sessionRef.current.pointsAwardedThisSession += result.pointsAwarded;
      sessionRef.current.lastMessage = `런 #${sessionRef.current.runCount} ${result.message}`;
    } catch (e) {
      sessionRef.current.lastMessage = `런 #${sessionRef.current.runCount} 제출 실패: ${(e as Error).message}`;
    }
  };

  const startDescent = (now: number, alt: number) => {
    sessionRef.current.phase = 'DESCENDING';
    sessionRef.current.currentDescent = {
      startedAt: now, endedAt: now,
      distanceM: 0, verticalDropM: 0, maxSpeedKmh: 0,
      startAlt: alt, samplePoints: [], fullTrack: [],
    };
  };

  const endDescent = async (now: number, alt: number) => {
    const d = sessionRef.current.currentDescent;
    if (!d) return;
    d.endedAt = now;
    d.verticalDropM = Math.max(d.verticalDropM, d.startAlt - alt);

    sessionRef.current.phase = 'IDLE';
    sessionRef.current.currentDescent = null;

    const durationSec = Math.round((d.endedAt - d.startedAt) / 1000);
    if (
      durationSec < T.minDurationSec ||
      d.verticalDropM < T.minVerticalDropM ||
      d.distanceM < T.minDistanceM
    ) return;

    sessionRef.current.runCount += 1;
    sessionRef.current.totalDistanceM += d.distanceM;
    sessionRef.current.totalVerticalDropM += d.verticalDropM;
    await submitDescent(d);
  };

  const processSample = async (
    latitude: number, longitude: number, altitude: number | null,
    speedMs: number | null, accuracy: number | null
  ) => {
    if (accuracy != null && accuracy > 30) return;
    const now = Date.now();

    const speedKmh = speedMs != null && speedMs >= 0 ? speedMs * 3.6 : 0;
    sessionRef.current.currentSpeedKmh = speedKmh;

    if (altitude != null && !isNaN(altitude)) {
      sessionRef.current.hasAltitude = true;
      altBufferRef.current.push({ alt: altitude, t: now });
      if (altBufferRef.current.length > 60) altBufferRef.current = altBufferRef.current.slice(-60);
    }

    let segM = 0;
    if (lastLatRef.current != null && lastLngRef.current != null) {
      segM = haversineM(lastLatRef.current, lastLngRef.current, latitude, longitude);
      if (segM < 5) segM = 0;
    }
    lastLatRef.current = latitude;
    lastLngRef.current = longitude;

    const { alt: smoothAlt, ratePerSec } = smoothedAltAndRate();

    if (sessionRef.current.phase === 'DESCENDING' && sessionRef.current.currentDescent) {
      const d = sessionRef.current.currentDescent;
      d.distanceM += segM;
      d.endedAt = now;
      if (smoothAlt != null) d.verticalDropM = Math.max(d.verticalDropM, d.startAlt - smoothAlt);
      if (speedKmh > d.maxSpeedKmh) d.maxSpeedKmh = speedKmh;
      if (d.samplePoints.length < 30) d.samplePoints.push({ lat: latitude, lng: longitude });
      else d.samplePoints = d.samplePoints.filter((_, i) => i % 2 === 0).concat({ lat: latitude, lng: longitude });
      // 전체 트랙 (지도용) — 5m 이상 또는 2초 이상 간격에서만 추가.
      const lastT = d.fullTrack[d.fullTrack.length - 1];
      if (!lastT || segM >= 5 || now - lastT.t >= 2000) {
        d.fullTrack.push({ lat: latitude, lng: longitude, alt: altitude ?? null, t: now });
      }
    }

    if (smoothAlt == null || ratePerSec == null) return;

    if (sessionRef.current.phase === 'IDLE') {
      if (ratePerSec <= T.altDeltaThresholdMps) {
        if (altStableStartRef.current == null) altStableStartRef.current = now;
        else if ((now - altStableStartRef.current) / 1000 >= T.descentSettleSec) {
          startDescent(altStableStartRef.current, smoothAlt);
          altStableStartRef.current = null;
          lowSpeedStartRef.current = null;
        }
      } else {
        altStableStartRef.current = null;
      }
    } else {
      const altStable = Math.abs(ratePerSec) <= T.descentEndAltStableMps;
      if (altStable) {
        if (altStableStartRef.current == null) altStableStartRef.current = now;
        else if ((now - altStableStartRef.current) / 1000 >= T.descentEndAltStableSec) {
          await endDescent(now, smoothAlt);
          altStableStartRef.current = null;
          lowSpeedStartRef.current = null;
          return;
        }
      } else altStableStartRef.current = null;
      if (speedKmh < T.descentEndStopSpeedKmh) {
        if (lowSpeedStartRef.current == null) lowSpeedStartRef.current = now;
        else if ((now - lowSpeedStartRef.current) / 1000 >= T.descentEndStopSec) {
          await endDescent(now, smoothAlt);
          altStableStartRef.current = null;
          lowSpeedStartRef.current = null;
        }
      } else lowSpeedStartRef.current = null;
    }
  };

  const onStart = async () => {
    if (!navigator.geolocation) { setPermissionError('이 브라우저는 GPS를 지원하지 않습니다.'); return; }
    setPermissionError(null);
    sessionRef.current = emptyUI();
    altBufferRef.current = [];
    lowSpeedStartRef.current = null;
    altStableStartRef.current = null;
    lastLatRef.current = null;
    lastLngRef.current = null;
    setUi(emptyUI());
    setSessionStartedAt(Date.now());
    setActive(true);
    await acquireWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude, speed, accuracy } = pos.coords;
        processSample(latitude, longitude, altitude, speed, accuracy);
      },
      (err) => {
        let msg = 'GPS 신호를 받을 수 없습니다.';
        if (err.code === err.PERMISSION_DENIED) msg = '위치 권한을 허용해주세요.';
        if (err.code === err.TIMEOUT) msg = 'GPS 응답이 너무 느립니다.';
        setPermissionError(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const onEnd = async () => {
    // 진행 중 하강이 있으면 강제 마감.
    const cd = sessionRef.current.currentDescent;
    if (cd && altBufferRef.current.length > 0) {
      await endDescent(Date.now(), altBufferRef.current[altBufferRef.current.length - 1].alt);
    }
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }
    setActive(false);
    const final = { ...sessionRef.current };
    alert(
      `세션 종료\n총 ${final.runCount}런 · ${(final.totalDistanceM / 1000).toFixed(2)}km · 낙차 ${Math.round(final.totalVerticalDropM)}m\n` +
        `적립 ${final.pointsAwardedThisSession.toLocaleString()}P`
    );
    navigate('/snow-run');
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, []);

  const fmtHM = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-10 flex flex-col">
      <div className="px-4 pt-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/snow-run')} className="text-xs text-gray-400 px-2 py-1" disabled={active}>
            ← 뒤로
          </button>
          {active && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-coral">
              <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
              세션 진행 · {fmtHM(elapsedSec)}
            </span>
          )}
        </div>

        {/* 카운터 메인 */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">자동 카운트</p>
          <p className="text-7xl font-black tabular-nums mt-1">{ui.runCount}<span className="text-2xl ml-2 text-gray-400">런</span></p>

          <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-xs">
            <div className="text-center">
              <p className="text-[10px] text-gray-400">세션 거리</p>
              <p className="text-base font-bold mt-1">{(ui.totalDistanceM / 1000).toFixed(2)}<span className="text-[10px] text-gray-400 ml-0.5">km</span></p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">세션 낙차</p>
              <p className="text-base font-bold mt-1">{Math.round(ui.totalVerticalDropM)}<span className="text-[10px] text-gray-400 ml-0.5">m</span></p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">적립</p>
              <p className="text-base font-bold mt-1">{ui.pointsAwardedThisSession.toLocaleString()}<span className="text-[10px] text-gray-400 ml-0.5">P</span></p>
            </div>
          </div>

          {/* 현재 상태 */}
          <div className="mt-8 px-4 py-2.5 bg-gray-800 rounded-xl min-h-[64px] flex flex-col items-center justify-center">
            {ui.phase === 'DESCENDING' && ui.currentDescent ? (
              <>
                <p className="text-sm font-bold text-mint">🎿 내려가는 중</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  낙차 {Math.round(ui.currentDescent.verticalDropM)}m · {(ui.currentDescent.distanceM / 1000).toFixed(2)}km · {ui.currentSpeedKmh.toFixed(0)}km/h
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-300">⛷️ 대기 중 (리프트/평지)</p>
                <p className="text-[11px] text-gray-500 mt-1">슬로프 내리면 자동 감지 시작</p>
              </>
            )}
          </div>

          {active && !ui.hasAltitude && (
            <p className="text-[10px] text-yellow-400 mt-4">⚠ 고도 정보 없음 — 자동 감지 안 됨 (낮은 사양 기기). 앱에서 더 정확합니다.</p>
          )}
          {ui.lastMessage && (
            <p className="text-[11px] text-mint mt-3">↳ {ui.lastMessage}</p>
          )}
        </div>

        {permissionError && (
          <div className="bg-coral/20 border border-coral text-coral text-xs p-3 rounded-lg mb-4">{permissionError}</div>
        )}

        {!active ? (
          <button onClick={onStart} className="w-full bg-white text-gray-900 text-lg font-black py-4 rounded-2xl active:scale-95 transition-transform">
            ▶ 오늘 세션 시작
          </button>
        ) : (
          <button onClick={onEnd} className="w-full bg-coral text-white text-lg font-black py-4 rounded-2xl active:scale-95 transition-transform">
            ■ 세션 종료
          </button>
        )}
        <p className="text-[10px] text-gray-500 text-center mt-2">
          {active ? '슬로프 탈 때마다 자동 카운트 · 1런 50P · 1일 10회 캡' : '시작 1번 누르면 슬로프마다 자동 카운트'}
        </p>
      </div>
    </div>
  );
};

export default SnowRunRecord;
