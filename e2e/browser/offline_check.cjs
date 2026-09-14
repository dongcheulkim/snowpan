// 오프라인·서비스워커 검사 (전체검사 깊은 검사 항목, 2026-09-14 추가)
// 1) SW 설치 후 precache 가 그대로 남는지 (예전엔 main.tsx 가 매 로드마다 지워 0개였음)
// 2) 진짜 오프라인(context.setOffline)에서: 방문한 경로 새로고침 / 안 가 본 경로 새로고침(app-shell.html) / 앱 내 이동
// BASE 환경변수로 로컬 preview(http://localhost:4173) 도 검사 가능.
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = process.env.BASE || 'https://snowpan.kr';
let fail = 0;
const ok = (c, label, extra = '') => { console.log(`${c ? 'OK  ' : 'FAIL'} ${label} ${extra}`); if (!c) fail++; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  const n = await p.evaluate(async () => { await navigator.serviceWorker.ready; let last = -1; for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 1000)); const k = (await caches.keys()).find(k => k.includes('precache')); if (!k) continue; const cnt = (await (await caches.open(k)).keys()).length; if (cnt > 100 && cnt === last) return cnt; last = cnt; } return last; });
  ok(n > 100, 'SW precache 설치', `(${n}개)`);
  await p.goto(BASE + '/used', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  await p.goto(BASE + '/help', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  const counts = await p.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k.replace(/^workbox-/, '').replace(/https?:\/\/[^/]+\//, '')] = (await (await caches.open(k)).keys()).length; return o; });
  ok((counts['precache-v2-'] || 0) > 100, '이동 후에도 precache 유지', JSON.stringify(counts));
  ok((counts['navigation-cache'] || 0) >= 1, '방문 페이지 navigation-cache 저장');
  await ctx.setOffline(true);
  const r1 = await p.goto(BASE + '/used', { waitUntil: 'domcontentloaded', timeout: 20000 }).then(r => r && r.status()).catch(() => 0);
  await p.waitForTimeout(3000);
  const t1 = (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  ok(r1 === 200 && t1.includes('중고'), '오프라인: 방문한 경로 새로고침', `status=${r1}`);
  const r2 = await p.goto(BASE + '/community', { waitUntil: 'domcontentloaded', timeout: 20000 }).then(r => r && r.status()).catch(() => 0);
  await p.waitForTimeout(3000);
  const t2 = (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  ok(r2 === 200 && t2.includes('커뮤니티'), '오프라인: 안 가 본 경로 새로고침(app-shell)', `status=${r2}`);
  ok(!t2.includes('아직 게시글이 없습니다'), '오프라인: 빈 목록 대신 "불러오지 못했어요"', t2.includes('불러오지 못했어요') ? '' : t2.slice(0, 120));
  // 앱 내 이동: 하단 탭 홈 → 홈 퀵메뉴 중고 (커뮤니티 화면엔 /used 링크가 없음)
  await p.locator('a[href="/"]').first().click().catch(() => {});
  await p.waitForTimeout(2000);
  await p.locator('a[href="/used"]').first().click().catch(() => {});
  await p.waitForTimeout(3000);
  ok(p.url().endsWith('/used'), '오프라인: 앱 내 이동(홈 → 중고)', p.url());
  ok(await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length).catch(() => 0) === 1, 'SW 등록 유지(오프라인에서 하드리로드로 지워지지 않음)');
  ok(errs.length === 0, '페이지 에러 없음', errs.join(' | '));
  await browser.close();
  console.log(`\nOFFLINE CHECK: ${fail === 0 ? '문제 없음' : fail + '건 실패'}`);
  process.exit(fail ? 1 : 0);
})();
