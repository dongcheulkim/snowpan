// 공유 카드 PNG (2026-09-17, 사용자 요청 "사진 위에 가격과 스노우판 로고를 얹은 카드").
// satori 로 카드 레이아웃을 SVG 로 그리고 resvg 로 PNG 로 바꾼다. 한글은 assets/fonts 의 Noto Sans KR Bold 서브셋(OFL).
// 사진은 서버가 받아 data URL 로 넣는다(5MB·6초 제한). 실패하면 사진 없는 카드로, 그것도 실패하면 호출 쪽이 원본 사진/기본 카드로 대체.
import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export interface OgCardInput {
  kind: string;        // 예: '중고 장비', '렌탈샵 · 하이원'
  title: string;       // 상품명·상호
  price?: string;      // 예: '1,000,000원', '세트 30,000원~'
  sub?: string;        // 한 줄 설명
  photo?: string | null; // 절대 URL
}

const W = 1200; const H = 630;
let fontData: ArrayBuffer | null = null;
function loadFont(): ArrayBuffer {
  if (fontData) return fontData;
  const p = path.resolve(__dirname, '../../assets/fonts/NotoSansKR-Bold-subset.ttf');
  const buf = fs.readFileSync(p);
  fontData = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return fontData;
}

async function fetchPhoto(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'snowpan-og/1.0' } });
    if (!r.ok) return null;
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (!/^image\/(jpeg|jpg|png|webp)/.test(ct)) return null;
    const len = Number(r.headers.get('content-length') || 0);
    if (len > 5 * 1024 * 1024) return null;
    const ab = await r.arrayBuffer();
    if (ab.byteLength > 5 * 1024 * 1024) return null;
    return `data:${ct.split(';')[0]};base64,${Buffer.from(ab).toString('base64')}`;
  } catch { return null; }
}

// satori 는 JSX 대신 {type, props} 트리를 받는다.
const el = (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } });

function layout(c: OgCardInput, photo: string | null) {
  const navy = '#0f172a'; const ink = '#111827'; const muted = '#94a3b8';
  const titleSize = c.title.length > 22 ? 44 : c.title.length > 14 ? 52 : 60;
  const rightW = photo ? 560 : W;
  const textBlock = el('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: rightW, height: H, padding: photo ? '56px 56px 48px 52px' : '64px 80px 56px 80px', background: photo ? navy : `linear-gradient(135deg, ${navy} 0%, #1e3a8a 100%)`, color: '#fff' } },
    el('div', { style: { display: 'flex', flexDirection: 'column' } },
      el('div', { style: { display: 'flex', alignItems: 'center', letterSpacing: 6, fontSize: 26, color: '#e2e8f0' } }, 'SNOW PAN'),
      el('div', { style: { display: 'flex', marginTop: 34, fontSize: 24, color: muted } }, c.kind),
      el('div', { style: { display: 'flex', marginTop: 12, fontSize: titleSize, lineHeight: 1.25, color: '#fff', maxHeight: titleSize * 1.25 * 2.1, overflow: 'hidden' } }, c.title),
      c.price ? el('div', { style: { display: 'flex', marginTop: 22, fontSize: 48, color: '#7dd3fc' } }, c.price) : el('div', { style: { display: 'flex' } }),
      c.sub ? el('div', { style: { display: 'flex', marginTop: 16, fontSize: 24, color: '#cbd5e1', maxHeight: 64, overflow: 'hidden' } }, c.sub) : el('div', { style: { display: 'flex' } }),
    ),
    el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 22, color: muted } },
      el('div', { style: { display: 'flex' } }, 'snowpan.kr'),
      el('div', { style: { display: 'flex' } }, '스키장 근처 매장과 중고 장비'),
    ),
  );
  if (!photo) return el('div', { style: { display: 'flex', width: W, height: H, background: ink } }, textBlock);
  return el('div', { style: { display: 'flex', width: W, height: H, background: ink } },
    el('img', { src: photo, style: { width: W - rightW, height: H, objectFit: 'cover' } }),
    textBlock,
  );
}

export async function renderOgCard(c: OgCardInput): Promise<Buffer> {
  const font = loadFont();
  const photo = c.photo ? await fetchPhoto(c.photo) : null;
  const svg = await satori(layout(c, photo) as never, { width: W, height: H, fonts: [{ name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' }] });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  return Buffer.from(png);
}

// 간단 캐시 — 같은 카드 반복 요청(카카오·페북 봇이 여러 번 긁음) 대비. 10분, 최대 150장.
const cache = new Map<string, { at: number; png: Buffer }>();
export async function renderOgCardCached(key: string, c: OgCardInput): Promise<Buffer> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.png;
  const png = await renderOgCard(c);
  if (cache.size >= 150) { const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]; if (oldest) cache.delete(oldest[0]); }
  cache.set(key, { at: Date.now(), png });
  return png;
}
