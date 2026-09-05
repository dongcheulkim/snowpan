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

