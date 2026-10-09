// 업로드 압축 검사 — 커뮤니티 글쓰기에서 사진을 고르면 /api/upload 로 가는 multipart 를 가로채 실제 저장 없이
// 압축 결과(타입·용량)만 본다. 두 번 실행: 크롬 그대로(WebP 기대) + 사파리 흉내(toBlob 이 WebP 를 못 만들어 PNG 를 돌려줌).
// 2026-10-09 전체검사: 투명 PNG(RGBA 스크린샷)가 PNG 로 유지돼 1000px 에 2MB 였던 경로를 고친 뒤 추가.
// 실행: source .env && node upload_test.cjs   (BASE 기본 https://snowpan.kr)
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = process.env.BASE || 'https://snowpan.kr';
const results = []; const ok = (name, pass, extra = '') => { results.push(pass); console.log(`${pass ? 'OK  ' : 'FAIL'} ${name} ${extra}`); };

// 투명 픽셀 + 노이즈가 섞인 RGBA PNG (1400x1800) — 단순 도형이면 PNG 가 작아져 600KB 기준을 못 넘는다
async function makeRgbaPng(browser) {
  const p = await browser.newPage();
  const dataUrl = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 1800; const ctx = c.getContext('2d');
    const img = ctx.createImageData(1400, 1800); const d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = (Math.random() * 255) | 0; d[i + 1] = (Math.random() * 255) | 0; d[i + 2] = (Math.random() * 255) | 0; d[i + 3] = (i / 4) % 1400 < 100 ? 0 : 255; }
    ctx.putImageData(img, 0, 0); return c.toDataURL('image/png');
  });
  await p.close();
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  const emailLink = page.getByText('이메일로 로그인'); if (await emailLink.count()) await emailLink.click();
  await page.fill('input[type="email"]', process.env.U_EMAIL); await page.fill('input[type="password"]', process.env.U_PW);
  await page.locator('button[type="submit"]').first().click(); await page.waitForTimeout(2500);
  return !page.url().includes('/login');
}

async function run(browser, label, safari, png) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent-v1', 'essential'); localStorage.setItem('snowpan.appCardDismissed', String(Date.now())); } catch {} });
  if (safari) await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb, type, q) { return orig.call(this, cb, type === 'image/webp' ? 'image/png' : type, q); };
  });
  const page = await ctx.newPage();
  const uploads = [];
  await page.route('**/api/upload', async (route) => {
    const req = route.request(); const body = req.postDataBuffer() || Buffer.alloc(0);
    const ct = (body.toString('latin1').match(/Content-Type: (image\/[a-z]+)/) || [])[1];
    uploads.push({ bytes: body.length, type: ct });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ urls: ['https://snowpankr.b-cdn.net/test/fake.webp'] }) });
  });
  // 글 생성 POST 도 가로채 실제 글이 남지 않게 한다
  await page.route('**/api/community', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000000' }) });
  });
  ok(`${label} 로그인`, await login(page));
  await page.goto(`${BASE}/community/write`, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: 'shot.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(4000); // 고른 즉시 압축
  await page.fill('input[placeholder="제목을 입력하세요"]', '업로드 압축 검사(저장 안 됨)');
  await page.fill('textarea[placeholder="내용을 입력하세요"]', '검사용 — 요청은 가로채서 저장되지 않습니다.');
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: '등록하기' }).click();
  await page.waitForTimeout(6000);
  const u = uploads[0];
  if (!u) { ok(`${label} 업로드 요청 발생`, false, '(등록 흐름에서 /api/upload 호출이 없음)'); await ctx.close(); return; }
  const kb = Math.round(u.bytes / 1024);
  ok(`${label} 압축 결과`, u.bytes < 700 * 1024, `type=${u.type} size=${kb}KB (원본 ${Math.round(png.length / 1024)}KB)`);
  ok(`${label} 타입`, safari ? u.type === 'image/jpeg' || u.type === 'image/png' : u.type === 'image/webp', u.type || '');
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const png = await makeRgbaPng(browser);
  await run(browser, '크롬', false, png);
  await run(browser, '사파리 흉내', true, png);
  await browser.close();
  const fails = results.filter((r) => !r).length;
  console.log(`== upload_test ok=${results.length - fails} fail=${fails}`);
  process.exit(fails ? 1 : 0);
})();
