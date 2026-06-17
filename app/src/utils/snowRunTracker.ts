// 백그라운드 GPS 트래킹 — 캐시워크처럼 화면 꺼도 동작.
// iOS: UIBackgroundModes=location, Android: foreground service notification.
// expo-location + expo-task-manager 결합. 작업 정의는 module top-level 에서.
//
// 주의: 이 모듈이 import 되어야 TaskManager.defineTask 가 등록됨.
// App.tsx 에서 한 번 import 필수.

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const TASK_NAME = 'SNOWPAN_SNOW_RUN_TRACKING';

export interface TrackState {
  startedAt: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number;
  currentSpeedKmh: number;
  lastLat: number | null;
  lastLng: number | null;
  lastAlt: number | null;
  hasAltitude: boolean;
  samplePoints: { lat: number; lng: number }[];
  active: boolean;
}

function createInitialState(): TrackState {
  return {
    startedAt: 0,
    distanceM: 0,
    verticalDropM: 0,
    maxSpeedKmh: 0,
    currentSpeedKmh: 0,
    lastLat: null,
    lastLng: null,
    lastAlt: null,
    hasAltitude: false,
    samplePoints: [],
    active: false,
  };
}

// 모듈 레벨 상태. 백그라운드 작업과 UI 가 공유.
// 주의: OS 가 JS 컨텍스트를 죽이면 상태도 사라짐.
// 안드로이드 포어그라운드 서비스 + iOS 백그라운드 모드 동안에는 JS 살아있음.
let state: TrackState = createInitialState();

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

function processLocation(loc: Location.LocationObject): void {
  if (!state.active) return;
  const { latitude, longitude, altitude, speed, accuracy } = loc.coords;

  // 정확도 30m 초과 → 노이즈. 스킵.
  if (accuracy != null && accuracy > 30) return;

  // 거리 누적 (5m 미만 떨림 무시).
  if (state.lastLat != null && state.lastLng != null) {
    const seg = haversineM(state.lastLat, state.lastLng, latitude, longitude);
    if (seg >= 5) state.distanceM += seg;
  }

  // 낙차 누적 (0.5m 데드존, 하강만).
  if (altitude != null && !isNaN(altitude)) {
    state.hasAltitude = true;
    if (state.lastAlt != null) {
      const dAlt = altitude - state.lastAlt;
      if (dAlt < -0.5) state.verticalDropM += Math.abs(dAlt);
    }
    state.lastAlt = altitude;
  }

  // 속도 (m/s → km/h).
  const speedKmh = speed != null && speed >= 0 ? speed * 3.6 : 0;
  if (speedKmh > state.maxSpeedKmh) state.maxSpeedKmh = speedKmh;
  state.currentSpeedKmh = speedKmh;
  state.lastLat = latitude;
  state.lastLng = longitude;

  // 지오펜스 검증용 샘플 (최대 30개 유지, 균등 솎아내기).
  if (state.samplePoints.length < 30) {
    state.samplePoints.push({ lat: latitude, lng: longitude });
  } else {
    state.samplePoints = state.samplePoints
      .filter((_, i) => i % 2 === 0)
      .concat({ lat: latitude, lng: longitude });
  }
}

// === 백그라운드 작업 정의 (반드시 module top-level) ===
TaskManager.defineTask(TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('[SnowRun task error]', error);
    return;
  }
  if (!data) return;
  const { locations } = (data as { locations: Location.LocationObject[] }) || { locations: [] };
  if (!Array.isArray(locations)) return;
  for (const loc of locations) processLocation(loc);
});

// === Public API ===

export type StartResult =
  | { ok: true; hasBackground: boolean }
  | { ok: false; reason: string };

export async function startTracking(): Promise<StartResult> {
  // 전경 권한 필수.
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { ok: false, reason: '위치 권한이 거부되었습니다. 설정에서 허용해주세요.' };
  }

  // 백그라운드 권한 — 없어도 동작은 함 (화면 꺼지면 일시 멈춤).
  let hasBackground = false;
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    hasBackground = bg.status === 'granted';
  } catch {
    hasBackground = false;
  }

  // 이미 진행 중인 작업 정리.
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (running) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch {}

  state = createInitialState();
  state.startedAt = Date.now();
  state.active = true;

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5,         // 5m 마다
    timeInterval: 2000,          // 또는 2초마다 (Android)
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: '스노우런 트래킹 중',
      notificationBody: '슬로프 내리는 동안 자동으로 기록됩니다',
      notificationColor: '#0F172A',
    },
  });

  return { ok: true, hasBackground };
}

export async function stopTracking(): Promise<TrackState> {
  state.active = false;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (running) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch {}
  // 깊은 복사해서 반환 (이후 resetTrack 호출해도 호출자는 안전).
  return JSON.parse(JSON.stringify(state));
}

export function getCurrentTrack(): TrackState {
  return state;
}

export function resetTrack(): void {
  state = createInitialState();
}

export async function isCurrentlyTracking(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  } catch {
    return false;
  }
}
