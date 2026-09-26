// 2026-09-26 관리자 신규 기능 실서비스 검사 — 유저관리 탈퇴 회원 마스킹·원래 정보 보기, 설정 탭 개인정보 열람 기록·앱 업데이트 안내 패널,
// 지운 매물 기록 API, 사장님 이용 안내 페이지. 관리자 계정으로 읽기만 한다 (원래 정보 보기 클릭은 열람 기록을 남긴다).
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = 'https://snowpan.kr'; const R = []; const ok = (n, c, x = '') => { R.push(c); console.log(`${c ? 'OK ' : 'FAIL'} ${n} ${x}`); };
async function login(p, email, pw) { await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); await p.getByText('이메일로 로그인').first().click(); await p.waitForTimeout(400); await p.fill('input[type="email"], input[name="email"]', email); await p.fill('input[type="password"]', pw); await p.keyboard.press('Enter'); await p.waitForTimeout(3500); return !p.url().endsWith('/login'); }
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 500) errs.push(`http ${r.status()} ${r.url()}`); });
  ok('관리자 로그인', await login(p, process.env.A_EMAIL, process.env.A_PW));
  await p.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(1500);
  // 유저관리
  const userTab = p.getByRole('button', { name: /유저/ }).first();
  if (await userTab.count()) { await userTab.click(); await p.waitForTimeout(1500); }
  const body = await p.textContent('body');
  ok('유저관리 목록 표시', /명/.test(body || ''));
  const delCard = p.locator('text=탈퇴').first();
  const hasDel = (await delCard.count()) > 0;
  ok('탈퇴 회원 카드 표시(탈퇴 배지)', hasDel);
  if (hasDel) {
    const txt = await p.textContent('body');
    ok('탈퇴 회원: 원래 정보 없음(이전 방식) 또는 원래 정보 보기 버튼', /원래 정보 없음|원래 정보 보기/.test(txt || ''));
    const btn = p.getByText('원래 정보 보기').first();
    if (await btn.count()) { await btn.click(); await p.waitForTimeout(1500); const t2 = await p.textContent('body'); ok('원래 정보 펼침(로그인 수단 표시)', /로그인 수단/.test(t2 || '')); }
  }
  // 설정 탭
  const setTab = p.getByRole('button', { name: /설정/ }).first();
  if (await setTab.count()) { await setTab.click(); await p.waitForTimeout(2000); }
  const st = await p.textContent('body');
  ok('설정 탭: 앱 업데이트 안내 패널', /앱 업데이트 안내/.test(st || ''));
  ok('설정 탭: 개인정보 열람 기록 패널', /개인정보 열람 기록/.test(st || ''));
  ok('설정 탭: 열람 기록 항목 또는 빈 안내', /탈퇴 회원 원래 정보|아직 열람 기록이 없어요/.test(st || ''));
  // 이용 안내 페이지
  await p.goto(`${BASE}/partners/guide`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800);
  ok('사장님 이용 안내 페이지', (await p.textContent('h1')) === '사장님 이용 안내', await p.textContent('h1'));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok('이용 안내 가로 스크롤 없음', sw <= 390, String(sw));
  await p.goto(`${BASE}/partners`, { waitUntil: 'networkidle', timeout: 45000 });
  ok('입점 안내 → 이용 안내 링크', (await p.locator('a[href="/partners/guide"]').count()) > 0);
  ok('페이지 오류·5xx 없음', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`== admin_new_check ok=${R.filter(Boolean).length} fail=${R.filter((x) => !x).length}`);
  await b.close(); process.exit(R.every(Boolean) ? 0 : 2);
})();
