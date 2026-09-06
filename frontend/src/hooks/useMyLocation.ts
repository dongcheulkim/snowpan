// "내 주변" — 사용자가 버튼을 눌렀을 때만 위치 권한을 요청한다 (페이지 진입 시 자동 요청 금지).
// 받은 좌표는 세션 안에서만 기억(sessionStorage)해 목록·상세를 오가며 다시 묻지 않는다. 서버로는 보내지 않는다.
import { useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { LatLng } from '../utils/geo';

export type LocStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unsupported' | 'error';
const KEY = 'snowpan.myloc';
const MAX_AGE_MS = 30 * 60 * 1000; // 30분 지나면 다시 측정

function readCache(): LatLng | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LatLng & { ts: number };
    if (!v || Date.now() - v.ts > MAX_AGE_MS) return null;
    return { lat: v.lat, lng: v.lng };
  } catch { return null; }
}

async function locate(): Promise<LatLng> {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const perm = await Geolocation.requestPermissions();
    if (perm.location === 'denied' && perm.coarseLocation === 'denied') throw new Error('denied');
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }
  if (!('geolocation' in navigator)) throw new Error('unsupported');
  return new Promise<LatLng>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? 'denied' : 'error')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });
}

export function useMyLocation() {
  const [coords, setCoords] = useState<LatLng | null>(() => readCache());
  const [status, setStatus] = useState<LocStatus>(() => (readCache() ? 'ok' : 'idle'));

  const request = useCallback(async () => {
    setStatus('asking');
    try {
      const c = await locate();
      setCoords(c); setStatus('ok');
      try { sessionStorage.setItem(KEY, JSON.stringify({ ...c, ts: Date.now() })); } catch { /* 저장 실패는 무시 */ }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error';
      setCoords(null);
      setStatus(msg === 'denied' ? 'denied' : msg === 'unsupported' ? 'unsupported' : 'error');
    }
  }, []);

  const clear = useCallback(() => {
    setCoords(null); setStatus('idle');
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  return { coords, status, request, clear };
}
