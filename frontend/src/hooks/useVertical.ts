import { useLocation } from 'react-router-dom';
import { getVerticalBySlug, getActiveVertical, type Vertical } from '../config/verticals';

// URL 의 첫 segment 로 현재 vertical 판별.
//   / , /used, /community 등 → snow (default)
//   /bike , /bike/used 등 → bike
//
// 사용 예:
//   const v = useVertical();
//   if (v.slug === 'snow') ...
//   API: api('/products?vertical=' + v.slug)

const KNOWN_SLUGS = ['bike', 'run', 'surf', 'golf', 'camp'];

export function useVertical(): Vertical {
  const location = useLocation();
  const first = location.pathname.split('/')[1] || '';
  if (KNOWN_SLUGS.includes(first)) {
    const v = getVerticalBySlug(first);
    if (v) return v;
  }
  return getActiveVertical();
}

// API URL 에 vertical 쿼리 파라미터 자동 부착 — 컴포넌트가 활성 vertical 의
// 데이터만 받도록 보장.
export function appendVertical(url: string, slug: string): string {
  if (slug === 'snow') return url; // default — no need to send
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}vertical=${encodeURIComponent(slug)}`;
}
