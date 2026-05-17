import { Request, Response, NextFunction } from 'express';

// ?vertical=bike/run/surf/golf/camp 가 오면 — 해당 vertical 의 데이터가 없는 동안
// 빈 응답 즉시 반환. snow (또는 미지정) 만 정상 처리.
//
// DB 에 vertical 컬럼이 추가되면 이 미들웨어 대신 controller 에서 where 절에 추가.

const KNOWN_NON_SNOW = ['bike', 'run', 'surf', 'golf', 'camp'];

export function emptyForNonSnow(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') { next(); return; }
  const v = typeof req.query.vertical === 'string' ? req.query.vertical : '';
  if (!v || v === 'snow') { next(); return; }
  if (!KNOWN_NON_SNOW.includes(v)) {
    res.status(400).json({ error: '잘못된 vertical 파라미터입니다.' });
    return;
  }
  res.set('Cache-Control', 'public, max-age=60');

  // originalUrl 로 어떤 엔드포인트인지 판별해 알맞은 빈 응답 반환.
  const url = req.originalUrl;
  if (url.startsWith('/api/community/popular')) {
    res.json([]); // 인기 게시글 배열
    return;
  }
  if (url.startsWith('/api/community')) {
    res.json({ posts: [], totalCount: 0 });
    return;
  }
  if (url.startsWith('/api/products/market-stats')) {
    res.json({ available: false, count: 0 });
    return;
  }
  if (url.startsWith('/api/products')) {
    res.json({ products: [], totalCount: 0 });
    return;
  }
  if (url.startsWith('/api/rentals') || url.startsWith('/api/lessons') || url.startsWith('/api/accommodations')) {
    res.json({ items: [], totalCount: 0 });
    return;
  }
  // /api/ski-shops, /api/repair-shops, /api/webcams 는 단순 배열
  res.json([]);
}
