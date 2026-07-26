// 네이버 지역검색 API — 매장 상호/전화/주소를 실제 네이버 등록 정보와 대조(더블체크).
// 키: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (developers.naver.com 앱 등록 후 발급, 무료).
// 미설정 시 naverConfigured()=false → AI 직원은 검증 스킵.

export interface NaverPlace {
  title: string;      // 상호 (검색어 매칭부에 <b> 태그 포함)
  telephone: string;  // 전화 (요즘 대부분 빈 값이라 주소 매칭 위주)
  address: string;    // 지번 주소
  roadAddress: string; // 도로명 주소
  category: string;
}

export function naverConfigured(): boolean {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

export async function naverLocalSearch(query: string): Promise<NaverPlace[]> {
  if (!naverConfigured()) return [];
  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=comment`;
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
    });
    if (!res.ok) {
      console.warn('네이버 검색 실패:', res.status);
      return [];
    }
    const data = await res.json() as { items?: NaverPlace[] };
    return data.items || [];
  } catch (err) {
    console.warn('네이버 검색 에러:', (err as Error).message);
    return [];
  }
}

// 문자열 정규화 — 공백·괄호·특수문자 제거 후 소문자.
function norm(s: string | null | undefined): string {
  return (s || '').replace(/<[^>]+>/g, '').replace(/[\s\-()·・.,]/g, '').toLowerCase();
}
function digits(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '');
}

export interface VerifyResult {
  verified: boolean;
  confidence: 'high' | 'medium' | 'none';
  note: string;
}

// 매장 정보 ↔ 네이버 검색결과 대조. 전화 일치=high, 상호+주소 일치=medium, 그 외=none.
export function matchShopWithNaver(
  shop: { name: string; phone?: string | null; address?: string | null },
  places: NaverPlace[],
): VerifyResult {
  if (places.length === 0) {
    return { verified: false, confidence: 'none', note: '네이버에서 못 찾음 — 수동 확인 필요' };
  }
  const shopName = norm(shop.name);
  const shopPhone = digits(shop.phone);
  const shopAddr = norm(shop.address);

  let best: { conf: 'high' | 'medium' | 'none'; place: NaverPlace } = { conf: 'none', place: places[0] };

  for (const p of places) {
    const pName = norm(p.title);
    const pPhone = digits(p.telephone);
    const pAddr = norm(p.roadAddress) + norm(p.address);

    const nameHit = Boolean(pName && shopName && (pName.includes(shopName) || shopName.includes(pName)));
    const phoneHit = Boolean(shopPhone && pPhone && shopPhone === pPhone);
    // 주소 일치: 시/군/구 단위 지역 토큰이 겹치는지 (앞 6자 정도 비교로 근접 판단)
    const addrHit = Boolean(shopAddr && pAddr && (pAddr.includes(shopAddr.slice(0, 6)) || shopAddr.includes(pAddr.slice(0, 6))));

    let conf: 'high' | 'medium' | 'none' = 'none';
    if (phoneHit && (nameHit || addrHit)) conf = 'high';
    else if (nameHit && addrHit) conf = 'high';
    else if (nameHit || (phoneHit)) conf = 'medium';

    const rank = { high: 3, medium: 2, none: 1 };
    if (rank[conf] > rank[best.conf]) best = { conf, place: p };
  }

  const cleanTitle = best.place.title.replace(/<[^>]+>/g, '');
  if (best.conf === 'high') {
    return { verified: true, confidence: 'high', note: `✅ 네이버 일치: ${cleanTitle} · ${best.place.roadAddress || best.place.address}` };
  }
  if (best.conf === 'medium') {
    return { verified: true, confidence: 'medium', note: `🟡 네이버 유사: ${cleanTitle} · ${best.place.roadAddress || best.place.address} (부분 일치)` };
  }
  return { verified: false, confidence: 'none', note: `⚠️ 네이버 결과와 불일치 (검색 상위: ${cleanTitle}) — 수동 확인 필요` };
}
