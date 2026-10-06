// 2026-10-05 기능: 스키장 개장 알림(신청→새로고침 유지→끄기, 데이터 남기지 않음), 장비 브랜드 가이드 진입. 폰·PC 폭 모두.
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = process.env.BASE || 'https://snowpan.kr';
let pass = 0, fail = 0; const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} | ${n}${c ? '' : ' ' + d}`); };
async function login(p, email, pw) { await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); { const c = p.getByRole('button', { name: '필수만' }); if (await c.isVisible().catch(() => false)) { await c.click(); await p.waitForTimeout(300); } } await p.getByText('이메일로 로그인').first().click(); await p.waitForTimeout(400); await p.fill('input[type="email"], input[name="email"]', email); await p.fill('input[type="password"]', pw); await p.keyboard.press('Enter'); await p.waitForTimeout(3500); return !p.url().endsWith('/login'); }
(async () => {
  const b = await chromium.launch();
  for (const [tag, vp] of [['폰', { width: 390, height: 844 }], ['PC', { width: 1366, height: 900 }]]) {
    const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    // 비로그인: 버튼 누르면 로그인으로
    await p.goto(`${BASE}/resort/${encodeURIComponent('용평리조트')}`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(1500);
    const on = p.getByRole('button', { name: '개장하면 알려줘' }); const off = p.getByRole('button', { name: /개장 알림 받는 중/ });
    const shown = await on.isVisible().catch(() => false);
    ok(`${tag} 스키장 페이지에 개장 알림 버튼`, shown);
    if (shown) { await on.click(); await p.waitForTimeout(1200); ok(`${tag} 비로그인은 로그인 화면으로`, new URL(p.url()).pathname === '/login', p.url()); }
    ok(`${tag} 로그인`, await login(p, process.env.U_EMAIL, process.env.U_PW));
    await p.goto(`${BASE}/resort/${encodeURIComponent('용평리조트')}`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(1500);
    if (await off.isVisible().catch(() => false)) { await off.click(); await p.waitForTimeout(1200); } // 이전 실행 잔여 정리
    await on.click(); await p.waitForTimeout(1500); ok(`${tag} 신청하면 '받는 중'으로`, await off.isVisible().catch(() => false));
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500); ok(`${tag} 새로고침해도 유지`, await off.isVisible().catch(() => false));
    await off.click(); await p.waitForTimeout(1500); ok(`${tag} 끄기`, await on.isVisible().catch(() => false));
    // 장비 가이드는 브랜드 소개만 (사이즈·DIN 계산은 사장님 결정으로 제거, 2026-10-06). 중고 '키워드 알림' 밑 '스키 브랜드 알아보기'로 진입
    await p.goto(`${BASE}/used`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800);
    await p.getByRole('link', { name: /스키 브랜드 알아보기/ }).first().click(); await p.waitForTimeout(1500);
    const gb = await p.locator('body').innerText();
    ok(`${tag} 중고 → 브랜드 가이드 진입`, new URL(p.url()).pathname === '/gear-guide' && gb.includes('아토믹'), p.url());
    ok(`${tag} 사이즈·DIN 계산 없음`, !gb.includes('내 사이즈 계산') && !gb.includes('바인딩 이탈값'));
    ok(`${tag} 가로 넘침·페이지 오류 없음`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) && errs.length === 0, errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await b.close(); console.log(`----- season_tools_check: PASS=${pass} FAIL=${fail} -----`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
