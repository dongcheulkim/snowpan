// 2026-09-17 추가 기능 실서비스 검사 (심사용 계정·관리자 계정, 비파괴 — 후기는 남겼다가 삭제, 나머지는 열어 보기만)
// 대상: 시합 등록 신청, 리조트 시즌·후기, 홈 카운트다운, 렌탈 가격 정렬·영업 중 배지·예약 문의 폼, 관리자 설정 패널·시합 승인 탭, 공유 카드
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = 'https://snowpan.kr'; const API = 'https://snowpan.onrender.com/api';
const R = []; const ok = (n, c, x = '') => { R.push(c); console.log(`${c ? 'OK ' : 'FAIL'} ${n} ${x}`); };
const txt = (p) => p.evaluate(() => document.body.innerText).catch(() => '');
async function login(p, email, pw) {
  await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); await p.getByText('이메일로 로그인').first().click(); await p.waitForTimeout(400);
  await p.fill('input[type="email"], input[name="email"]', email); await p.fill('input[type="password"]', pw); await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
}
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120))); p.on('response', (r) => { if (r.status() >= 500) errs.push(`http ${r.status()} ${r.url().slice(0, 80)}`); });
  p.on('dialog', (d) => d.accept());
  await login(p, process.env.U_EMAIL, process.env.U_PW); ok('심사용 계정 로그인', !p.url().includes('/login'));

  // 1) 시합 일정: 목록·등록 신청 폼
  await p.goto(`${BASE}/competitions`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  ok('시합 일정 목록 렌더', /시합|대회/.test(await txt(p)));
  ok('시합 등록 신청 버튼', await p.getByText('시합 등록 신청').count() > 0);
  await p.getByText('시합 등록 신청').first().click(); await p.waitForTimeout(1200);
  ok('시합 등록 신청 폼 열림', /\/competitions\/register/.test(p.url()) && (await p.locator('input, textarea').count()) >= 5, p.url().replace(BASE, ''));
  ok('시합 폼 종목 선택', await p.getByText('스키·보드 모두').count() + await p.getByText('보드').count() > 0);

  // 2) 리조트 랜딩: 시즌 정보 + 후기 작성·삭제
  const resorts = await (await fetch(`${API}/resorts`)).json(); const first = Array.isArray(resorts) ? resorts[0] : (resorts.items || [])[0];
  ok('리조트 목록 API', !!first, first ? first.name : '');
  if (first) {
    await p.goto(`${BASE}/resort/${encodeURIComponent(first.name)}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
    ok('리조트 페이지 후기 섹션', /스키장 후기/.test(await txt(p)));
    const stars = p.locator('button[aria-label*="점"]'); const starCount = await stars.count();
    ok('후기 별점 버튼', starCount >= 5, `${starCount}개`);
    if (starCount >= 5) {
      await stars.nth(4).click(); await p.waitForTimeout(200);
      const ta = p.locator('textarea').last(); await ta.fill('전체검사용 임시 후기입니다. 곧바로 삭제해요.');
      await p.getByRole('button', { name: /후기 남기기|수정/ }).last().click(); await p.waitForTimeout(2000);
      ok('후기 저장 후 목록 표시', /전체검사용 임시 후기/.test(await txt(p)));
      const del = p.getByRole('button', { name: /^삭제$/ }).last(); if (await del.count()) { await del.click(); await p.waitForTimeout(1500); }
      ok('후기 삭제 정리', !/전체검사용 임시 후기/.test(await txt(p)));
    }
  }
  // 3) 홈 카운트다운 (개장일이 있을 때만) — 오류 없이 렌더되면 OK
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const season = await (await fetch(`${API}/resorts/season`)).json().catch(() => null);
  const homeT = await txt(p);
  ok('홈 시즌 카드 (개장일 있으면 표시, 없으면 숨김)', season && season.next ? /시즌 오픈 D-|오늘 .* 개장/.test(homeT) : !/시즌 오픈 D-/.test(homeT), season && season.next ? `next=${season.next.name}` : '개장일 미입력');

  // 4) 렌탈: 가격 정렬 칩, 영업 중 배지(있을 수 있음), 상세 예약 문의 폼
  await p.goto(`${BASE}/rental`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  ok('렌탈 정렬 칩 (기본순/가격 낮은 순)', await p.getByText('가격 낮은 순').count() > 0);
  await p.getByText('가격 낮은 순').first().click(); await p.waitForTimeout(1200);
  ok('가격 낮은 순 → URL sort=price', /sort=price/.test(p.url()));
  const badge = await p.getByText(/^영업 중$|^영업 종료$/).count(); console.log(`     영업 배지 표시 ${badge}개 (영업시간 파싱된 매장 수)`);
  // 사장님 관리(claimable=false) 렌탈 하나 찾아 상세로
  const rl = await (await fetch(`${API}/rentals?limit=50`)).json(); const owned = (rl.items || rl).find((r) => r.claimable === false && r.userId);
  if (owned) {
    await p.goto(`${BASE}/rental/${owned.id}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
    const hasBtn = await p.getByRole('button', { name: '방문 예약' }).count() > 0;
    ok('렌탈 상세 방문 예약 버튼', hasBtn, owned.name);
    if (hasBtn) { await p.getByRole('button', { name: '방문 예약' }).first().click(); await p.waitForTimeout(800); ok('방문 예약 폼 (날짜·인원·장비)', /인원|장비|날짜/.test(await txt(p))); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  } else console.log('SKIP 사장님 관리 렌탈샵 없음 (방문 예약 버튼 검사 생략 — deep_feature_check 가 레슨으로 실제 예약 흐름을 검사)');

  // 5) 공유 카드 (봇 UA 로 HTML og 태그)
  const used = await (await fetch(`${API}/products?category=used&limit=1`)).json(); const u0 = (Array.isArray(used) ? used : (used.items || used.products || []))[0];
  if (u0) {
    const r = await fetch(`${BASE}/used/${u0.id}`, { headers: { 'User-Agent': 'facebookexternalhit/1.1;kakaotalk-scrap/1.0;' } }); const h = await r.text();
    ok('카카오톡 봇 → 매물 공유 카드 og:title', /og:title" content="[^"]*원/.test(h), `HTTP ${r.status}`);
    const r2 = await fetch(`${BASE}/used/${u0.id}`, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone) Safari' } }); const h2 = await r2.text();
    ok('일반 브라우저 → SPA(index.html)', /<div id="root"/.test(h2));
  } else console.log('SKIP 중고 매물 없음');

  // 6) 관리자: 설정 탭 패널·승인관리 시합 탭
  await p.context().clearCookies(); await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  await login(p, process.env.A_EMAIL, process.env.A_PW);
  await p.goto(`${BASE}/admin`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await p.locator('button:has-text("설정")').first().click(); await p.waitForTimeout(2000);
  const st = await txt(p);
  ok('설정 탭: 하루 요약 패널', /관리자 하루 요약/.test(st) && /신고 대기/.test(st));
  ok('설정 탭: 연동 상태', /외부 연동 상태/.test(st) && /켜짐|꺼짐/.test(st));
  ok('설정 탭: 리조트 시즌 패널', /리조트 시즌/.test(st));
  await p.locator('button:has-text("승인관리")').first().click(); await p.waitForTimeout(1500);
  ok('승인관리: 시합 신청 탭', await p.getByText('시합 신청').count() > 0);
  ok('페이지 오류·500 없음', errs.length === 0, errs.join(' | '));
  await browser.close(); const f = R.filter((x) => !x).length; console.log(`\nFEATURE CHECK ${R.length - f}/${R.length}`); process.exit(f ? 2 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
