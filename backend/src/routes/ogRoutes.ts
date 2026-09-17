// 공유 카드 (2026-09-17, 사용자 요청 "매물·매장별 공유 카드 자동 생성").
// 카카오톡·페이스북 같은 링크 미리보기 봇은 자바스크립트를 안 돌려서 SPA 의 useMeta 태그를 못 본다.
// Vercel 이 그런 봇의 요청만(User-Agent 조건) 이 엔드포인트로 넘기고(vercel.json rewrites), 여기서 대상별 og 태그가 박힌 HTML 을 돌려준다.
// 사람이 이 주소를 직접 열면 스크립트가 원래 페이지로 보낸다. 값은 공개 데이터만(연락처·이메일 없음).
import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { renderOgCardCached, OgCardInput } from '../utils/ogImage';

const router = Router();
const SITE = process.env.FRONTEND_URL || 'https://snowpan.kr';
const API_ORIGIN = process.env.RENDER_EXTERNAL_URL || 'https://snowpan.onrender.com';
const DEFAULT_IMAGE = `${SITE}/icons/og-image-v3.jpg`;
const UUID_RE = /^[0-9a-f-]{36}$/i;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const clean = (s: string | null | undefined, max = 110) => {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
};
// 이미지 주소를 절대 https 로 — CDN(b-cdn) 은 그대로, /uploads 는 API 오리진, 없으면 기본 카드
function absImage(src: string | null | undefined): string {
  if (!src) return DEFAULT_IMAGE;
  let s = src.split(',')[0].trim();
  if (!s) return DEFAULT_IMAGE;
  if (s.startsWith('http://')) s = 'https://' + s.slice(7);
  if (s.startsWith('https://')) return s.includes('.b-cdn.net') && !s.includes('?') ? `${s}?width=1200` : s;
  if (s.startsWith('/icons/')) return `${SITE}${s}`;
  if (s.startsWith('/')) return `${API_ORIGIN}${s}`;
  return DEFAULT_IMAGE;
}

interface Card { title: string; description: string; image: string; path: string; type: 'article' | 'product' | 'website'; og?: OgCardInput }
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

async function buildCard(type: string, id: string): Promise<Card | null> {
  switch (type) {
    case 'used': {
      const p = await prisma.product.findUnique({ where: { id }, select: { name: true, brand: true, price: true, image: true, images: true, description: true, status: true, category: true } });
      if (!p) return null;
      const status = p.status === 'sold' ? ' (판매 완료)' : p.status === 'reserved' ? ' (예약 중)' : '';
      const img = absImage(p.image || p.images);
      return { title: `${clean(p.name, 60)} · ${won(p.price)}${status}`, description: clean(p.description) || `${clean(p.brand, 30)} 중고 장비 · 스노우판에서 채팅으로 바로 거래해요.`, image: img, path: `/used/${id}`, type: 'product',
        og: { kind: `중고 장비${p.brand ? ' · ' + clean(p.brand, 20) : ''}`, title: clean(p.name, 40), price: `${won(p.price)}${status}`, sub: clean(p.description, 60), photo: img === DEFAULT_IMAGE ? null : img } };
    }
    case 'skishop': {
      const s = await prisma.skiShop.findUnique({ where: { id }, select: { name: true, area: true, address: true, description: true, image: true, images: true, approved: true, resort: { select: { name: true } } } });
      if (!s || !s.approved) return null;
      const img = absImage(s.image || s.images); const where = s.resort ? s.resort.name : s.area || '';
      return { title: `${clean(s.name, 60)} · 스키·보드샵${where ? ` · ${where}` : ''}`, description: clean(s.description) || clean(s.address) || '스키·보드 장비 판매 매장', image: img, path: `/skishop/${id}`, type: 'article',
        og: { kind: `스키·보드샵${where ? ' · ' + where : ''}`, title: clean(s.name, 40), sub: clean(s.address, 50) || clean(s.description, 50), photo: img === DEFAULT_IMAGE ? null : img } };
    }
    case 'repair': {
      const s = await prisma.repairShop.findUnique({ where: { id }, select: { name: true, area: true, address: true, description: true, image: true, images: true, approved: true, resort: { select: { name: true } } } });
      if (!s || !s.approved) return null;
      const img = absImage(s.image || s.images); const where = s.resort ? s.resort.name : s.area || '';
      return { title: `${clean(s.name, 60)} · 정비샵${where ? ` · ${where}` : ''}`, description: clean(s.description) || clean(s.address) || '스키·보드 튜닝·왁싱·수리', image: img, path: `/repair/${id}`, type: 'article',
        og: { kind: `정비샵${where ? ' · ' + where : ''}`, title: clean(s.name, 40), sub: clean(s.address, 50) || clean(s.description, 50), photo: img === DEFAULT_IMAGE ? null : img } };
    }
    case 'rental': {
      const s = await prisma.rental.findUnique({ where: { id }, select: { name: true, area: true, address: true, description: true, image: true, images: true, approved: true, priceFrom: true, resort: { select: { name: true } } } });
      if (!s || !s.approved) return null;
      const price = s.priceFrom ? ` · 세트 ${won(s.priceFrom)}~` : '';
      const img = absImage(s.image || s.images); const where = s.resort ? s.resort.name : s.area || '';
      return { title: `${clean(s.name, 60)} · 렌탈샵${where ? ` · ${where}` : ''}${price}`, description: clean(s.description) || clean(s.address) || '스키·보드 렌탈', image: img, path: `/rental/${id}`, type: 'article',
        og: { kind: `렌탈샵${where ? ' · ' + where : ''}`, title: clean(s.name, 40), price: s.priceFrom ? `세트 ${won(s.priceFrom)}~` : undefined, sub: clean(s.address, 50) || clean(s.description, 50), photo: img === DEFAULT_IMAGE ? null : img } };
    }
    case 'lesson': {
      const l = await prisma.lesson.findUnique({ where: { id }, select: { name: true, description: true, image: true, images: true, approved: true, price: true, resort: { select: { name: true } } } });
      if (!l || !l.approved) return null;
      const img = absImage(l.image || l.images);
      return { title: `${clean(l.name, 60)} · 레슨${l.resort ? ` · ${l.resort.name}` : ''}${l.price ? ` · ${won(l.price)}~` : ''}`, description: clean(l.description) || '스키·보드 레슨', image: img, path: `/lesson/${id}`, type: 'article',
        og: { kind: `레슨${l.resort ? ' · ' + l.resort.name : ''}`, title: clean(l.name, 40), price: l.price ? `${won(l.price)}~` : undefined, sub: clean(l.description, 60), photo: img === DEFAULT_IMAGE ? null : img } };
    }
    case 'accommodation': {
      const a = await prisma.accommodation.findUnique({ where: { id }, select: { name: true, type: true, guests: true, features: true, image: true, images: true, approved: true, price: true, resortId: true } });
      if (!a || !a.approved) return null;
      const resort = await prisma.skiResort.findUnique({ where: { id: a.resortId }, select: { name: true } });
      const kind: Record<string, string> = { hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박' };
      const img = absImage(a.image || a.images); const feat = clean(`${a.guests} · ${a.features.split(',').map((f) => f.trim()).filter(Boolean).join(', ')}`) || '스키장 근처 숙소';
      return { title: `${clean(a.name, 60)} · ${kind[a.type] || '숙소'}${resort ? ` · ${resort.name}` : ''} · ${won(a.price)}~`, description: feat, image: img, path: `/accommodation/${id}`, type: 'article',
        og: { kind: `${kind[a.type] || '숙소'}${resort ? ' · ' + resort.name : ''}`, title: clean(a.name, 40), price: `${won(a.price)}~`, sub: clean(feat, 60), photo: img === DEFAULT_IMAGE ? null : img } };
    }
    case 'post': {
      const p = await prisma.post.findUnique({ where: { id }, select: { title: true, content: true, images: true, category: true } });
      if (!p) return null;
      const img = absImage(p.images);
      return { title: `${clean(p.title, 70)} | 스노우판 커뮤니티`, description: clean(p.content) || '스키·보드 커뮤니티', image: img, path: `/community/post/${id}`, type: 'article',
        og: { kind: '커뮤니티', title: clean(p.title, 40), sub: clean(p.content, 70), photo: img === DEFAULT_IMAGE ? null : img } };
    }
    default:
      return null;
  }
}

function html(card: Card): string {
  const url = `${SITE}${card.path}`;
  const t = esc(card.title); const d = esc(card.description); const img = esc(card.image); const u = esc(url);
  return `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<meta property="og:type" content="${card.type === 'product' ? 'product' : 'article'}">
<meta property="og:site_name" content="스노우판">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${img}">
<meta property="og:image:secure_url" content="${img}">
<meta property="og:url" content="${u}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<link rel="canonical" href="${u}">
<meta name="robots" content="noindex">
<script>location.replace(${JSON.stringify(url)});</script>
</head><body><p><a href="${u}">${t}</a></p></body></html>`;
}

// GET /api/og/page/:type/:id — 봇용 HTML (5분 캐시). 없는 대상은 사이트 기본 카드 + 404.
router.get('/page/:type/:id', async (req: Request, res: Response): Promise<void> => {
  const { type, id } = req.params;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  try {
    const card = UUID_RE.test(id) ? await buildCard(type, id) : null;
    if (card && card.og) card.image = `${API_ORIGIN}/api/og/image/${type}/${id}.png`; // 사진+가격+로고 합성 카드 (실패 시 그 라우트가 원본 사진으로 넘김)
    if (!card) {
      res.status(404).send(html({ title: '스노우판 — 스키장 근처 매장 찾기 · 스키·보드 중고거래', description: '리조트별 스키·보드샵, 정비샵, 렌탈샵, 레슨, 숙소와 중고 장비를 한곳에서.', image: DEFAULT_IMAGE, path: '/', type: 'website' }));
      return;
    }
    res.send(html(card));
  } catch (e) {
    console.error('og page error:', e);
    res.status(500).send('<!doctype html><title>스노우판</title>');
  }
});

// GET /api/og/image/:type/:id(.png) — 합성 카드 PNG(1200×630, 1시간 캐시). 그리기 실패면 원본 사진(또는 기본 카드)으로 302.
router.get('/image/:type/:id', async (req: Request, res: Response): Promise<void> => {
  const type = req.params.type; const id = String(req.params.id || '').replace(/\.png$/i, '');
  try {
    const card = UUID_RE.test(id) ? await buildCard(type, id) : null;
    if (!card || !card.og) { res.redirect(302, DEFAULT_IMAGE); return; }
    const png = await renderOgCardCached(`${type}:${id}`, card.og);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(png);
  } catch (e) {
    console.error('og image error:', e);
    try { const card = UUID_RE.test(id) ? await buildCard(type, id) : null; res.redirect(302, card?.image || DEFAULT_IMAGE); } catch { res.redirect(302, DEFAULT_IMAGE); }
  }
});

export default router;
