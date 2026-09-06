// 주소 → 좌표 (카카오 로컬 API). 카카오 로그인용 REST 키(KAKAO_CLIENT_ID)를 그대로 쓴다 (별도 키 KAKAO_REST_API_KEY 있으면 우선).
// 키가 없으면 조용히 null — 좌표 없는 매장은 '내 주변' 거리만 안 보일 뿐 나머지 기능은 그대로.
import prisma from '../config/database';

const KEY = process.env.KAKAO_REST_API_KEY || process.env.KAKAO_CLIENT_ID || '';
export function geocodeConfigured(): boolean { return Boolean(KEY); }

export interface LatLng { lat: number; lng: number }

async function kakao(url: string): Promise<LatLng | null> {
  const r = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const d = await r.json() as { documents?: { x?: string; y?: string }[] };
  const doc = d?.documents?.[0];
  if (!doc) return null;
  const lat = parseFloat(doc.y || ''), lng = parseFloat(doc.x || '');
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// 1) 주소 검색 (정확) → 2) 번지까지만 잘라 주소 검색 (뒤에 건물명·층이 붙은 경우) → 3) 키워드 검색 (최후)
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!KEY) return null;
  const q = (address || '').trim().replace(/\s+/g, ' ');
  if (q.length < 5) return null;
  const short = q.match(/^(.*?\d+(?:-\d+)?)(?:\s|$)/)?.[1];
  try {
    return (await kakao(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}`))
      || (short && short !== q ? await kakao(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(short)}`) : null)
      || (await kakao(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=1`));
  } catch {
    return null;
  }
}

// 진단용 — 카카오 응답 상태/본문을 그대로 (키 미활성화 등 원인 파악). 관리자 백필 API 의 debug 옵션에서만 사용.
export async function geocodeDebug(address: string): Promise<{ status: number; body: string; keyConfigured: boolean }> {
  if (!KEY) return { status: 0, body: 'no key', keyConfigured: false };
  const r = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`, { headers: { Authorization: `KakaoAK ${KEY}` }, signal: AbortSignal.timeout(6000) });
  return { status: r.status, body: (await r.text()).slice(0, 400), keyConfigured: true };
}

export type GeoShopKind = 'skishop' | 'repair' | 'rental';

// 등록·수정 직후 fire-and-forget 으로 좌표 저장 (실패해도 응답엔 영향 없음)
export async function geocodeAndStore(kind: GeoShopKind, id: string, address?: string | null): Promise<boolean> {
  const c = await geocodeAddress(address || '');
  if (!c) return false;
  const data = { lat: c.lat, lng: c.lng };
  if (kind === 'skishop') await prisma.skiShop.update({ where: { id }, data });
  else if (kind === 'repair') await prisma.repairShop.update({ where: { id }, data });
  else await prisma.rental.update({ where: { id }, data });
  return true;
}
