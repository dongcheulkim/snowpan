// 경계 검사: 비로그인 보호 경로 → /login?next=, 404 페이지, 직접 진입(새로고침) 가로 스크롤·에러바운더리, 로그인 후 제자리 복귀(next)
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = process.env.BASE || 'https://snowpan.kr';
let fail = 0;
const ok = (c, label, extra = '') => { console.log(`${c ? 'OK  ' : 'FAIL'} ${label} ${extra}`); if (!c) fail++; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  for (const [r, want] of [['/mypage', '/login?next=%2Fmypage'], ['/chat', '/login?next=%2Fchat%2Frooms'], ['/notifications', '/login?next=%2Fnotifications'], ['/mypage/wishlist', '/login?next=%2Fmypage%2Fwishlist'], ['/community/write', '/login?next=%2Fcommunity%2Fwrite'], ['/used/register', '/login?next=%2Fused%2Fregister'], ['/admin', '/login?next=%2Fadmin']]) {
    await p.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(600);
    const u = new URL(p.url()); ok(u.pathname + u.search === want, `비로그인 ${r} → ${want}`, u.pathname + u.search);
  }
  // 상세 화면의 로그인 유도 버튼도 next 를 붙이는지 (중고 상세 찜)
  await p.goto(BASE + '/used', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const first = p.locator('a[href^="/used/"]').first();
  if (await first.count()) {
    const href = await first.getAttribute('href');
    await p.goto(BASE + href, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const wish = p.locator('button[aria-label*="찜"]').first();
    if (await wish.count()) { await wish.click(); await p.waitForTimeout(800); const u = new URL(p.url()); ok(u.pathname === '/login' && u.searchParams.get('next') === href, '중고 상세 찜 → /login?next=상세', u.pathname + u.search); }
    else console.log('SKIP 찜 버튼 없음');
  } else console.log('SKIP 중고 매물 없음');
  await p.goto(BASE + '/this-page-does-not-exist', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(600);
  const t404 = (await p.locator('main, #root').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
  ok(t404.includes('페이지를 찾을 수 없습니다'), '404 페이지 안내 문구');
  for (const r of ['/used', '/community', '/overseas', '/rental', '/help', '/partners', '/advertise', '/privacy', '/terms', '/about', '/webcam', '/competitions', '/lesson', '/accommodation', '/repair', '/new-equipment', '/gear-guide', '/search?q=%EC%8A%A4%ED%82%A4']) {
    await p.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(500);
    const eb = await p.locator('text=문제가 발생').count();
    const hs = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    ok(eb === 0 && !hs, `직접 진입 ${r}`, `${eb ? '에러바운더리 ' : ''}${hs ? '가로스크롤' : ''}`);
  }
  ok(errs.length === 0, '페이지 에러 없음', errs.join(' | '));
  await browser.close();
  console.log(`\nEDGE CHECK: ${fail === 0 ? '문제 없음' : fail + '건 실패'}`);
  process.exit(fail ? 1 : 0);
})();
