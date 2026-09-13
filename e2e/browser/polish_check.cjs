// 자잘한 것: 모바일 가로 스크롤(레이아웃 깨짐), 빈 목록 안내 문구, 느린 API, 404 링크, 폰트 크기 12px 미만 입력창
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = 'https://snowpan.kr';
(async () => {
  const browser = await chromium.launch(); const slow = []; for (const vw of [360, 390, 1280]) { const ctx = await browser.newContext({ viewport: { width: vw, height: vw > 800 ? 900 : 812 }, isMobile: vw < 800, hasTouch: vw < 800, locale: 'ko-KR' }); const p = await ctx.newPage(); console.log(`\n--- 화면 폭 ${vw}px`);
  p.on('response', async (r) => { try { const t = r.request().timing(); const ms = t ? t.responseEnd - t.startTime : 0; if (r.url().includes('/api/') && ms > 2500) slow.push(`${Math.round(ms)}ms ${r.url().replace('https://snowpan.onrender.com', '')}`); } catch {} });
  const routes = ['/', '/new-equipment', '/repair', '/used', '/rental', '/lesson', '/accommodation', '/community', '/competitions', '/webcam', '/overseas', '/shop-news', '/search?q=%EB%B6%80%EC%B8%A0', '/help', '/advertise', '/partners', '/privacy', '/terms', '/account-deletion', '/resort/%ED%95%98%EC%9D%B4%EC%9B%90', '/login'];
  for (const r of routes) {
    await p.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {}); await p.waitForTimeout(800);
    const info = await p.evaluate(() => {
      const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
      const wide = Array.from(document.querySelectorAll('body *')).filter((e) => { const r = e.getBoundingClientRect(); return r.right > cw + 2 && r.width > 40 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ').slice(0, 2).join('.')}`);
      const tiny = Array.from(document.querySelectorAll('input:not([type=hidden]),textarea,select')).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16 && e.offsetParent !== null).length;
      const empties = Array.from(document.querySelectorAll('main, [role=main], #root')).length;
      const txt = document.body.innerText;
      return { sw, cw, wide, tiny, emptyHint: /없어요|없습니다|아직/.test(txt), len: txt.replace(/\s+/g, '').length };
    });
    const flag = info.sw > info.cw + 2 ? `가로스크롤 ${info.sw}>${info.cw} ${info.wide.join(',')}` : '';
    console.log(`${r.padEnd(36)} ${flag || 'ok'}`);
  }
  await ctx.close(); }
  console.log('\n느린 API(2.5초 초과):'); console.log(slow.length ? slow.join('\n') : '없음');
  await browser.close();
})();
