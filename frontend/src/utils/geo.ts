// 거리 계산·표시 — 위치는 기기 안에서만 쓴다(서버 전송 없음).
export interface LatLng { lat: number; lng: number }

// 하버사인 거리 (km)
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

// 목록에 거리 붙이고(좌표 없는 매장은 null) 내 위치가 있으면 가까운 순으로 정렬 — 좌표 없는 매장은 맨 뒤.
export function withDistance<T extends { lat?: number | null; lng?: number | null }>(
  items: T[], from: LatLng | null,
): (T & { distanceKm: number | null })[] {
  const out = items.map((it) => ({
    ...it,
    distanceKm: from && it.lat != null && it.lng != null ? distanceKm(from, { lat: it.lat, lng: it.lng }) : null,
  }));
  if (!from) return out;
  return out.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
