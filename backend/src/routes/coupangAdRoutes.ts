import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

// 쿠팡 파트너스 카드 — 공개 목록·클릭 집계, 관리자 등록/수정/삭제 (2026-10-02)
const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.coupangAd.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }], select: { id: true, title: true, image: true, price: true, link: true } });
    res.json(rows);
  } catch (e) { console.error('coupang ads list error:', e); res.status(500).json({ error: '광고를 불러오지 못했어요.' }); }
});

router.post('/:id/click', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(id)) { res.status(400).json({ error: '잘못된 식별자입니다.' }); return; }
    await prisma.coupangAd.updateMany({ where: { id, active: true }, data: { clickCount: { increment: 1 } } });
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

const LINK_RE = /^https:\/\/(link\.coupang\.com|www\.coupang\.com|coupa\.ng)\//i;
function pick(b: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (typeof b.title === 'string') data.title = b.title.trim().slice(0, 120);
  if (b.image === null || typeof b.image === 'string') data.image = b.image ? String(b.image).trim().slice(0, 500) : null;
  if (b.price === null || b.price === '' || b.price === undefined) { if ('price' in b) data.price = null; }
  else if (Number.isFinite(Number(b.price))) data.price = Math.max(0, Math.round(Number(b.price)));
  if (typeof b.link === 'string') data.link = b.link.trim().slice(0, 500);
  if (typeof b.active === 'boolean') data.active = b.active;
  if (Number.isFinite(Number(b.order))) data.order = Number(b.order);
  return data;
}

// 쿠팡 파트너스 "이미지+텍스트" HTML(iframe src=https://coupa.ng/xxxx) 또는 coupa.ng 주소를 붙여넣으면
// 위젯 리다이렉트 주소의 쿼리(productImage·productDescription·linkUrl)에서 이름·사진·제휴 링크를 뽑아 준다 (2026-10-03, 사장님 수동 등록 편의).
// 가격은 위젯에 없어서 사장님이 직접 입력.
router.post('/admin/resolve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const raw = String((req.body || {}).url || '').trim();
  const m = raw.match(/https?:\/\/coupa\.ng\/[A-Za-z0-9]+/);
  if (!m) { res.status(400).json({ error: '쿠팡 파트너스의 "HTML 복사" 내용이나 coupa.ng 주소를 붙여넣어 주세요.' }); return; }
  try {
    // 리다이렉트를 한 단계씩 따라가며(최대 5번) productDescription 이 든 위젯 주소를 찾는다 — 지역·시점에 따라 hop 수가 다름
    let loc = m[0]; let q: URLSearchParams | null = null;
    for (let hop = 0; hop < 5 && loc; hop++) {
      const r = await fetch(loc, { redirect: 'manual', signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept': 'text/html,*/*' } });
      const next = r.headers.get('location') || '';
      if (next.includes('productDescription=')) { q = new URLSearchParams(next.slice(next.indexOf('?') + 1)); break; }
      if (!next) {
        // 리다이렉트가 아니라 본문으로 넘기는 경우: HTML 안의 productDescription 쿼리를 찾는다
        const html = r.status === 200 ? await r.text() : '';
        const mm = html.match(/[?&]productDescription=[^"'\s<>]+/);
        if (mm) { const i = html.lastIndexOf('?', html.indexOf(mm[0]) + 1); q = new URLSearchParams(html.slice(i + 1).split(/["'\s<>]/)[0]); }
        break;
      }
      loc = next.startsWith('http') ? next : new URL(next, loc).toString();
      // 쿠팡 도메인 밖으로 나가는 리다이렉트는 따라가지 않음 (서버가 임의 주소를 열지 않도록)
      if (!/^https:\/\/([a-z0-9-]+\.)*(coupang\.com|coupangcdn\.com|coupa\.ng)\//i.test(loc)) break;
    }
    const title = q?.get('productDescription')?.trim() || '';
    let image = q?.get('productImage')?.trim() || '';
    if (image) image = image.replace(/\/thumbnails\/remote\/\d+x\d+ex\//, '/thumbnails/remote/492x492ex/'); // 212px 썸네일 → 492px
    const link = q?.get('linkUrl')?.trim() || '';
    if (!title || !link) { res.status(422).json({ error: '쿠팡 위젯에서 상품 정보를 읽지 못했어요. 상품 이름·사진 주소·링크를 직접 넣어 주세요.' }); return; }
    if (!LINK_RE.test(link)) { res.status(422).json({ error: '쿠팡 링크가 아니에요.' }); return; }
    res.json({ title: title.slice(0, 120), image: image || null, link });
  } catch (e) { console.error('coupang resolve error:', e); res.status(502).json({ error: '쿠팡에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.' }); }
});

router.get('/admin', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(await prisma.coupangAd.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }));
});
router.post('/admin', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const data = pick(req.body || {});
  if (!data.title || !data.link) { res.status(400).json({ error: '제목과 쿠팡 링크는 필수예요.' }); return; }
  if (!LINK_RE.test(String(data.link))) { res.status(400).json({ error: '쿠팡 링크(link.coupang.com / coupa.ng / www.coupang.com)만 등록할 수 있어요.' }); return; }
  res.status(201).json(await prisma.coupangAd.create({ data: data as { title: string; link: string } }));
});
router.put('/admin/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const data = pick(req.body || {});
  if (data.link && !LINK_RE.test(String(data.link))) { res.status(400).json({ error: '쿠팡 링크만 등록할 수 있어요.' }); return; }
  try { res.json(await prisma.coupangAd.update({ where: { id: String(req.params.id) }, data })); }
  catch { res.status(404).json({ error: '카드를 찾을 수 없어요.' }); }
});
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try { await prisma.coupangAd.delete({ where: { id: String(req.params.id) } }); res.json({ ok: true }); }
  catch { res.status(404).json({ error: '카드를 찾을 수 없어요.' }); }
});

export default router;
