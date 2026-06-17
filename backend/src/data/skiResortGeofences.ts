// 국내 스키장 지오펜스 — 원형 (lat, lng, radius m).
// 폴리곤이 이상적이지만 MVP 는 원형으로 충분. 좌표는 리조트 중심부 기준,
// 반경은 슬로프 + 베이스 시설 다 포괄. 차로 옆 도로/케이블카 부정 사용 차단이 목적.
//
// 정확한 폴리곤이 필요해지면 OSM/Naver Map 에서 수집해 GeoJSON 으로 대체.

export interface ResortGeofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
}

export const SKI_RESORTS: ResortGeofence[] = [
  // 강원도
  { id: 'yongpyong',  name: '용평리조트',        lat: 37.6433, lng: 128.6736, radiusM: 3000 },
  { id: 'phoenix',    name: '휘닉스 평창',        lat: 37.5650, lng: 128.6850, radiusM: 2500 },
  { id: 'alpensia',   name: '알펜시아 리조트',    lat: 37.6630, lng: 128.6750, radiusM: 2500 },
  { id: 'vivaldi',    name: '비발디파크',         lat: 37.6403, lng: 127.6850, radiusM: 2500 },
  { id: 'highone',    name: '하이원 리조트',      lat: 37.2150, lng: 128.8200, radiusM: 3500 },
  { id: 'oakvalley',  name: '오크밸리',           lat: 37.3617, lng: 127.7556, radiusM: 2000 },
  { id: 'wellihilli', name: '웰리힐리파크',       lat: 37.4467, lng: 128.0883, radiusM: 2500 },
  { id: 'elysian',    name: '엘리시안 강촌',      lat: 37.8472, lng: 127.5642, radiusM: 2000 },
  // 경기/충북
  { id: 'jisan',      name: '지산 포레스트',      lat: 37.2706, lng: 127.4153, radiusM: 1500 },
  { id: 'konjiam',    name: '곤지암 리조트',      lat: 37.4203, lng: 127.2997, radiusM: 1500 },
  { id: 'bears',      name: '베어스타운',         lat: 37.7831, lng: 127.3242, radiusM: 1800 },
  // 전북
  { id: 'muju',       name: '무주 덕유산 리조트', lat: 35.8861, lng: 127.7375, radiusM: 3000 },
];

// 좌표가 반경 안에 있는 리조트를 반환. 없으면 null.
export function findResortContaining(lat: number, lng: number): ResortGeofence | null {
  for (const r of SKI_RESORTS) {
    if (distanceM(lat, lng, r.lat, r.lng) <= r.radiusM) return r;
  }
  return null;
}

// haversine distance (m).
function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
