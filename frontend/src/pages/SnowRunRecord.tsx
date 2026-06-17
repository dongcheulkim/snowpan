import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

// 두 위경도 사이 수평 거리 (m) — haversine.
function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

interface Tracked {
  startedAt: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number;
  currentSpeedKmh: number;
  lastLat: number | null;
  lastLng: number | null;
  lastAlt: number | null;
  hasAltitude: boolean;
  samplePoints: { lat: number; lng: number }[]; // 지오펜스 검증용 (최대 30개)
}

const initialTracked = (): Tracked => ({
  startedAt: Date.now(),
  distanceM: 0,
  verticalDropM: 0,
  maxSpeedKmh: 0,
  currentSpeedKmh: 0,
  lastLat: null,
  lastLng: null,
  lastAlt: null,
  hasAltitude: false,
  samplePoints: [],
});

const SnowRunRecord = () => {
  const navigate = useNavigate();
  const [tracked, setTracked] = useState<Tracked>(initialTracked);
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const trackedRef = useRef<Tracked>(tracked);
  trackedRef.current = tracked;

  // 경과 시간 타이머 (1초).
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - trackedRef.current.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [recording]);

  // 화면 켜짐 유지 (Wake Lock — Chrome/Edge 지원, Safari 일부 미지원).
  const acquireWakeLock = async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock) {
        wakeLockRef.current = await nav.wakeLock.request('screen');
      }
    } catch {}
  };

  const startRecording = async () => {
    if (!navigator.geolocation) {
      setPermissionError('이 브라우저는 GPS를 지원하지 않습니다.');
      return;
    }
    setPermissionError(null);
    setTracked(initialTracked());
    setElapsedSec(0);
    setRecording(true);
    await acquireWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude, speed, accuracy } = pos.coords;
        // 정확도 30m 초과면 노이즈 — 스킵.
        if (accuracy != null && accuracy > 30) return;

        setTracked((prev) => {
          let nextDistance = prev.distanceM;
          let nextVerticalDrop = prev.verticalDropM;

          if (prev.lastLat != null && prev.lastLng != null) {
            const segM = haversineDistanceM(prev.lastLat, prev.lastLng, latitude, longitude);
            // 한 샘플당 5m 미만 이동은 GPS 떨림으로 간주 — 스킵.
            if (segM >= 5) nextDistance = prev.distanceM + segM;
          }

          let hasAlt = prev.hasAltitude;
          let lastAlt = prev.lastAlt;
          if (altitude != null && !isNaN(altitude)) {
            hasAlt = true;
            if (lastAlt != null) {
              const dAlt = altitude - lastAlt;
              if (dAlt < -0.5) nextVerticalDrop = prev.verticalDropM + Math.abs(dAlt); // 하강만 누적
            }
            lastAlt = altitude;
          }

          const speedKmh = speed != null && speed >= 0 ? speed * 3.6 : 0;
          const nextMaxSpeed = Math.max(prev.maxSpeedKmh, speedKmh);

          // 지오펜스 검증용 — 최대 30개까지만 유지 (균등 샘플링).
          let nextSamples = prev.samplePoints;
          if (nextSamples.length < 30) {
            nextSamples = [...nextSamples, { lat: latitude, lng: longitude }];
          } else {
            // 30개 채워지면 절반 솎아내고 새 점 추가 — 시간 축 따라 균등.
            nextSamples = nextSamples.filter((_, i) => i % 2 === 0).concat({ lat: latitude, lng: longitude });
          }

          return {
            ...prev,
            distanceM: nextDistance,
            verticalDropM: nextVerticalDrop,
            maxSpeedKmh: nextMaxSpeed,
            currentSpeedKmh: speedKmh,
            lastLat: latitude,
            lastLng: longitude,
            lastAlt,
            hasAltitude: hasAlt,
            samplePoints: nextSamples,
          };
        });
      },
      (err) => {
        let msg = '위치 권한이 거부되었거나 GPS 신호를 받을 수 없습니다.';
        if (err.code === err.PERMISSION_DENIED) msg = '위치 권한을 허용해주세요.';
        if (err.code === err.POSITION_UNAVAILABLE) msg = 'GPS 신호를 받을 수 없습니다.';
        if (err.code === err.TIMEOUT) msg = 'GPS 응답이 너무 느립니다.';
        setPermissionError(msg);
        setRecording(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const stopRecording = async () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }
    setRecording(false);

    const endedAt = Date.now();
    const startedAt = trackedRef.current.startedAt;
    const durationSec = Math.floor((endedAt - startedAt) / 1000);

    if (durationSec < 30 || trackedRef.current.distanceM < 100) {
      alert('너무 짧은 런입니다. 30초 이상 + 100m 이상이어야 기록할 수 있습니다.');
      return;
    }

    const avgSpeedKmh = (trackedRef.current.distanceM / durationSec) * 3.6;

    setSubmitting(true);
    try {
      const result = await api<{
        pointsAwarded: number;
        balance: number | null;
        validated: boolean;
        message: string;
        rejectionReasons?: string[];
      }>('/snow-runs', {
        method: 'POST',
        body: {
          startedAt: new Date(startedAt).toISOString(),
          endedAt: new Date(endedAt).toISOString(),
          distanceM: Math.round(trackedRef.current.distanceM),
          verticalDropM: Math.round(trackedRef.current.verticalDropM),
          maxSpeedKmh: trackedRef.current.maxSpeedKmh,
          avgSpeedKmh,
          source: 'web_gps',
          samplePoints: trackedRef.current.samplePoints,
        },
      });
      alert(
        `${result.message}${
          result.validated && result.pointsAwarded > 0
            ? `\n현재 잔액: ${(result.balance || 0).toLocaleString()}P`
            : result.rejectionReasons
            ? `\n사유: ${result.rejectionReasons.join(', ')}`
            : ''
        }`
      );
      navigate('/snow-run');
    } catch (e) {
      const msg = (e as Error).message || '런 제출에 실패했습니다.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 페이지 떠나면 워치 정리.
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, []);

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-10 flex flex-col">
      <div className="px-4 pt-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/snow-run')}
            className="text-xs text-gray-400 px-2 py-1"
            disabled={recording}
          >
            ← 뒤로
          </button>
          {recording && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-coral">
              <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
              REC
            </span>
          )}
        </div>

        {/* 메인 — 경과 시간 큼지막 */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Elapsed</p>
          <p className="text-7xl font-black tabular-nums mt-1">{fmtSec(elapsedSec)}</p>

          <div className="grid grid-cols-3 gap-4 mt-10 w-full max-w-xs">
            <div className="text-center">
              <p className="text-[10px] text-gray-400">거리</p>
              <p className="text-xl font-bold mt-1">{(tracked.distanceM / 1000).toFixed(2)}<span className="text-xs text-gray-400 ml-0.5">km</span></p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">낙차</p>
              <p className="text-xl font-bold mt-1">{Math.round(tracked.verticalDropM)}<span className="text-xs text-gray-400 ml-0.5">m</span></p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">현재 속도</p>
              <p className="text-xl font-bold mt-1">{tracked.currentSpeedKmh.toFixed(0)}<span className="text-xs text-gray-400 ml-0.5">km/h</span></p>
            </div>
          </div>

          <p className="text-[10px] text-gray-500 mt-6">
            {recording
              ? tracked.hasAltitude
                ? `최고 ${tracked.maxSpeedKmh.toFixed(0)} km/h`
                : '⚠ 고도 정보가 없어 낙차가 0으로 측정됩니다 (낮은 사양 기기)'
              : '준비 — 아래 버튼을 눌러 시작'}
          </p>
        </div>

        {/* 에러 */}
        {permissionError && (
          <div className="bg-coral/20 border border-coral text-coral text-xs p-3 rounded-lg mb-4">
            {permissionError}
          </div>
        )}

        {/* 시작/정지 */}
        {!recording ? (
          <button
            onClick={startRecording}
            disabled={submitting}
            className="w-full bg-white text-gray-900 text-lg font-black py-4 rounded-2xl active:scale-95 transition-transform"
          >
            ▶ 시작
          </button>
        ) : (
          <button
            onClick={stopRecording}
            disabled={submitting}
            className="w-full bg-coral text-white text-lg font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {submitting ? '제출 중...' : '■ 정지 & 저장'}
          </button>
        )}
        <p className="text-[10px] text-gray-500 text-center mt-2">
          런 1회 100P · 1일 10회 적립
        </p>
      </div>
    </div>
  );
};

export default SnowRunRecord;
