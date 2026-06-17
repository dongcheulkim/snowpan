// 백그라운드 GPS 트래킹 — 캐시워크 모델, 고도 기반 자동 런 감지.
// 사용자는 세션 시작 1번, 종료 1번만 누름. 슬로프 내려갈 때마다 자동 +1 런.
//
// 핵심 아이디어: 고도가 떨어지는 동안 = 런 중. 멈추거나 올라가면 = 리프트/정지.
// 속도/시간/거리는 부수 검증, 메인 신호는 고도 미분.
//
// 모듈 import 만으로 TaskManager.defineTask 등록.

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';

export const TASK_NAME = 'SNOWPAN_SNOW_RUN_TRACKING';

// 임계치 — 튜닝 가능. 고도 위주, 상한 무제한, 하한만.
const THRESHOLDS = {
  altDeltaThresholdMps: -1,      // 하강 시작 판단: 이동평균 고도 변화율 (m/s)
  descentSettleSec: 5,           // 위 조건이 N초 연속이어야 하강 확정
  descentEndAltStableMps: 0.2,   // 하강 종료 판단: 고도 변화 ±N m/s 이내
  descentEndAltStableSec: 10,    // 위 조건이 N초 연속 = 도착
  descentEndStopSpeedKmh: 2,     // 또는: 속도 < N km/h
  descentEndStopSec: 30,         // 속도 < 위 임계치가 N초 연속 = 정지 (급정거)
  altSmoothingWindow: 5,         // 고도 이동평균 윈도우 (점프/노이즈 차단)
  // 하한선 (런 인정 최소치)
  minDurationSec: 15,
  minVerticalDropM: 20,
  minDistanceM: 100,
};

interface AltSample {
  alt: number;
  t: number; // ms
}

export interface DescentBuffer {
  startedAt: number;
  endedAt: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number;
  startAlt: number;
  endAlt: number;
  samplePoints: { lat: number; lng: number }[];
}

export interface SessionState {
  sessionStartedAt: number;
  runCount: number;
  totalDistanceM: number;
  totalVerticalDropM: number;
  pointsAwardedThisSession: number;
  // 현재 상태
  phase: 'IDLE' | 'DESCENDING';
  // 현재 진행 중인 하강 (phase=DESCENDING 일 때만 의미)
  currentDescent: DescentBuffer | null;
  // 디버그/표시
  currentSpeedKmh: number;
  currentAltitude: number | null;
  hasAltitude: boolean;
  active: boolean; // 세션 활성 여부
  lastSubmissionMessage: string | null;
}

function emptyState(): SessionState {
  return {
    sessionStartedAt: 0,
    runCount: 0,
    totalDistanceM: 0,
    totalVerticalDropM: 0,
    pointsAwardedThisSession: 0,
    phase: 'IDLE',
    currentDescent: null,
    currentSpeedKmh: 0,
    currentAltitude: null,
    hasAltitude: false,
    active: false,
    lastSubmissionMessage: null,
  };
}

let state: SessionState = emptyState();
let altBuffer: AltSample[] = []; // 이동평균용
let lowSpeedStartedAt: number | null = null; // 정지 감지용
let altStableStartedAt: number | null = null; // 고도 안정 감지용
let lastLat: number | null = null;
let lastLng: number | null = null;
let lastSampleAt: number | null = null;

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 이동평균 고도와 변화율(m/s).
function smoothedAltAndRate(): { alt: number | null; ratePerSec: number | null } {
  const n = altBuffer.length;
  if (n === 0) return { alt: null, ratePerSec: null };
  const recent = altBuffer.slice(-THRESHOLDS.altSmoothingWindow);
  const sum = recent.reduce((s, x) => s + x.alt, 0);
  const avg = sum / recent.length;
  if (n < 2) return { alt: avg, ratePerSec: null };
  const oldest = altBuffer[Math.max(0, n - THRESHOLDS.altSmoothingWindow)];
  const newest = altBuffer[n - 1];
  const dt = (newest.t - oldest.t) / 1000;
  if (dt <= 0) return { alt: avg, ratePerSec: null };
  return { alt: avg, ratePerSec: (newest.alt - oldest.alt) / dt };
}

// 자동 감지된 런을 백엔드에 제출. 실패해도 세션은 계속.
async function submitDescent(d: DescentBuffer): Promise<{ pointsAwarded: number; message: string } | null> {
  try {
    const durationSec = Math.max(1, Math.round((d.endedAt - d.startedAt) / 1000));
    const avgSpeedKmh = (d.distanceM / durationSec) * 3.6;
    const result = await api<{ pointsAwarded: number; message: string; balance: number | null }>(
      '/snow-runs',
      {
        method: 'POST',
        body: {
          startedAt: new Date(d.startedAt).toISOString(),
          endedAt: new Date(d.endedAt).toISOString(),
          distanceM: Math.round(d.distanceM),
          verticalDropM: Math.round(d.verticalDropM),
          maxSpeedKmh: d.maxSpeedKmh,
          avgSpeedKmh,
          source: 'app_gps',
          samplePoints: d.samplePoints,
        },
      }
    );
    return { pointsAwarded: result.pointsAwarded, message: result.message };
  } catch (e) {
    console.error('Auto run submit failed:', e);
    return null;
  }
}

function startDescent(now: number, alt: number) {
  state.phase = 'DESCENDING';
  state.currentDescent = {
    startedAt: now,
    endedAt: now,
    distanceM: 0,
    verticalDropM: 0,
    maxSpeedKmh: 0,
    startAlt: alt,
    endAlt: alt,
    samplePoints: [],
  };
}

async function endDescent(now: number, alt: number) {
  if (!state.currentDescent) return;
  const d = state.currentDescent;
  d.endedAt = now;
  d.endAlt = alt;
  d.verticalDropM = Math.max(d.verticalDropM, d.startAlt - alt);

  state.phase = 'IDLE';
  state.currentDescent = null;

  const durationSec = Math.round((d.endedAt - d.startedAt) / 1000);
  // 하한 검증 — 미달이면 카운트 안 함 (조용히 폐기).
  if (
    durationSec < THRESHOLDS.minDurationSec ||
    d.verticalDropM < THRESHOLDS.minVerticalDropM ||
    d.distanceM < THRESHOLDS.minDistanceM
  ) {
    return;
  }

  // 세션 누적 업데이트 (낙관적 — 서버 검증 통과 가정).
  state.runCount += 1;
  state.totalDistanceM += d.distanceM;
  state.totalVerticalDropM += d.verticalDropM;

  const result = await submitDescent(d);
  if (result) {
    state.pointsAwardedThisSession += result.pointsAwarded;
    state.lastSubmissionMessage = `런 #${state.runCount} ${result.message}`;
  } else {
    state.lastSubmissionMessage = `런 #${state.runCount} 제출 실패 — 다음 재시도 시 전송 (TODO: 큐)`;
  }
}

function processLocation(loc: Location.LocationObject): void {
  if (!state.active) return;
  const now = Date.now();
  const { latitude, longitude, altitude, speed, accuracy } = loc.coords;

  if (accuracy != null && accuracy > 30) return;

  // 속도 (km/h)
  const speedKmh = speed != null && speed >= 0 ? speed * 3.6 : 0;
  state.currentSpeedKmh = speedKmh;

  // 고도 버퍼
  if (altitude != null && !isNaN(altitude)) {
    state.hasAltitude = true;
    state.currentAltitude = altitude;
    altBuffer.push({ alt: altitude, t: now });
    if (altBuffer.length > 60) altBuffer = altBuffer.slice(-60);
  }

  // 거리 (마지막 점에서). 5m 미만은 떨림.
  let segM = 0;
  if (lastLat != null && lastLng != null) {
    segM = haversineM(lastLat, lastLng, latitude, longitude);
    if (segM < 5) segM = 0;
  }
  lastLat = latitude;
  lastLng = longitude;
  lastSampleAt = now;

  const { alt: smoothAlt, ratePerSec } = smoothedAltAndRate();

  // DESCENDING 중이면 누적
  if (state.phase === 'DESCENDING' && state.currentDescent) {
    const d = state.currentDescent;
    d.distanceM += segM;
    d.endedAt = now;
    if (smoothAlt != null) {
      d.endAlt = smoothAlt;
      d.verticalDropM = Math.max(d.verticalDropM, d.startAlt - smoothAlt);
    }
    if (speedKmh > d.maxSpeedKmh) d.maxSpeedKmh = speedKmh;
    if (d.samplePoints.length < 30) {
      d.samplePoints.push({ lat: latitude, lng: longitude });
    } else {
      d.samplePoints = d.samplePoints.filter((_, i) => i % 2 === 0).concat({ lat: latitude, lng: longitude });
    }
  }

  // === 상태 전이 ===
  if (smoothAlt == null || ratePerSec == null) return;

  if (state.phase === 'IDLE') {
    // 하강 시작 조건: 고도 변화율 < 임계치(-1m/s) 가 N초 연속.
    if (ratePerSec <= THRESHOLDS.altDeltaThresholdMps) {
      if (altStableStartedAt == null) altStableStartedAt = now;
      else if ((now - altStableStartedAt) / 1000 >= THRESHOLDS.descentSettleSec) {
        startDescent(altStableStartedAt, smoothAlt);
        altStableStartedAt = null;
        lowSpeedStartedAt = null;
      }
    } else {
      altStableStartedAt = null;
    }
  } else if (state.phase === 'DESCENDING') {
    // 종료 조건 (a) 고도 변화율 절대값이 안정 임계치 이내가 N초 연속.
    const altIsStable = Math.abs(ratePerSec) <= THRESHOLDS.descentEndAltStableMps;
    if (altIsStable) {
      if (altStableStartedAt == null) altStableStartedAt = now;
      else if ((now - altStableStartedAt) / 1000 >= THRESHOLDS.descentEndAltStableSec) {
        endDescent(now, smoothAlt);
        altStableStartedAt = null;
        lowSpeedStartedAt = null;
        return;
      }
    } else {
      altStableStartedAt = null;
    }
    // 종료 조건 (b) 속도가 거의 0 이 N초 연속 (급정거 대응).
    if (speedKmh < THRESHOLDS.descentEndStopSpeedKmh) {
      if (lowSpeedStartedAt == null) lowSpeedStartedAt = now;
      else if ((now - lowSpeedStartedAt) / 1000 >= THRESHOLDS.descentEndStopSec) {
        endDescent(now, smoothAlt);
        altStableStartedAt = null;
        lowSpeedStartedAt = null;
        return;
      }
    } else {
      lowSpeedStartedAt = null;
    }
  }
}

// === 백그라운드 작업 ===
TaskManager.defineTask(TASK_NAME, ({ data, error }) => {
  if (error) { console.error('[SnowRun task error]', error); return; }
  if (!data) return;
  const { locations } = (data as { locations: Location.LocationObject[] }) || { locations: [] };
  if (!Array.isArray(locations)) return;
  for (const loc of locations) processLocation(loc);
});

// === Public API ===

export type StartResult = { ok: true; hasBackground: boolean } | { ok: false; reason: string };

export async function startSession(): Promise<StartResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { ok: false, reason: '위치 권한이 거부되었습니다. 설정에서 허용해주세요.' };
  let hasBackground = false;
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    hasBackground = bg.status === 'granted';
  } catch {}

  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (running) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch {}

  state = emptyState();
  state.sessionStartedAt = Date.now();
  state.active = true;
  altBuffer = [];
  lastLat = null;
  lastLng = null;
  lastSampleAt = null;
  lowSpeedStartedAt = null;
  altStableStartedAt = null;

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5,
    timeInterval: 2000,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: '스노우런 세션 활성',
      notificationBody: '슬로프 내릴 때마다 자동으로 카운트됩니다',
      notificationColor: '#0F172A',
    },
  });

  return { ok: true, hasBackground };
}

export async function endSession(): Promise<SessionState> {
  // 진행 중인 하강이 있으면 강제 마감 시도.
  if (state.phase === 'DESCENDING' && state.currentDescent) {
    const lastAlt = altBuffer.length > 0 ? altBuffer[altBuffer.length - 1].alt : state.currentDescent.startAlt;
    await endDescent(Date.now(), lastAlt);
  }
  state.active = false;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (running) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch {}
  return JSON.parse(JSON.stringify(state));
}

export function getSessionState(): SessionState {
  return state;
}

export function resetSession(): void {
  state = emptyState();
  altBuffer = [];
  lastLat = null;
  lastLng = null;
  lastSampleAt = null;
  lowSpeedStartedAt = null;
  altStableStartedAt = null;
}

export async function isSessionActive(): Promise<boolean> {
  try {
    return state.active && (await Location.hasStartedLocationUpdatesAsync(TASK_NAME));
  } catch {
    return false;
  }
}
