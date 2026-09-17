// 실서비스 데이터가 없어 feature_check 가 건너뛴 흐름을 실제로 눌러 본다 (2026-09-17).
// 1) 렌탈 예약 문의 폼 → 채팅 첫 메시지 자동 전송 (매장 소유자를 관리자 계정으로 바꿔치기해 고객센터 방으로 보냄 — 실제 사장님에게 안 감)
// 2) 판매완료 → 구매자 선택 창 (앱 밖 거래 선택) → 삭제
// 3) 시합 신청 제출 → 관리자 API 로 삭제
// 4) 공유 카드: 글·스키샵
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = 'https://snowpan.kr'; const API = 'https://snowpan.onrender.com/api'; const ts = Date.now().toString().slice(-6);
const R = []; const ok = (n, c, x = '') => { R.push(c); console.log(`${c ? 'OK ' : 'FAIL'} ${n} ${x}`); };
const txt = (p) => p.evaluate(() => document.body.innerText).catch(() => '');
async function waitText(p, re, ms = 8000) { const end = Date.now() + ms; while (Date.now() < end) { if (re.test(await txt(p))) return true; await p.waitForTimeout(300); } return false; }
async function login(p, email, pw) { await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); await p.getByText('이메일로 로그인').first().click(); await p.waitForTimeout(400); await p.fill('input[type="email"], input[name="email"]', email); await p.fill('input[type="password"]', pw); await p.keyboard.press('Enter'); await p.waitForTimeout(3000); }
async function apiLogin(email, password) { const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); return (await r.json()).token; }
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120))); p.on('response', (r) => { if (r.status() >= 500) errs.push(`http ${r.status()} ${r.url().slice(0, 80)}`); }); p.on('dialog', (d) => d.accept());
  const adminTok = await apiLogin(process.env.A_EMAIL, process.env.A_PW); const adminMe = await (await fetch(`${API}/auth/profile`, { headers: { Authorization: `Bearer ${adminTok}` } })).json();
  await login(p, process.env.U_EMAIL, process.env.U_PW); ok('심사용 계정 로그인', !p.url().includes('/login'));

  // 1) 렌탈 예약 문의 — 상세 API 응답을 가로채 소유자를 관리자로(claimable=false) 만들어 버튼을 띄운다
  const rl = await (await fetch(`${API}/rentals?limit=1`)).json(); const rent = (rl.items || rl)[0];
  await p.route(`**/api/rentals/${rent.id}`, async (route) => { const res = await route.fetch(); const j = await res.json(); j.claimable = false; j.userId = adminMe.id; j.user = { id: adminMe.id, name: '고객센터', nickname: null }; await route.fulfill({ response: res, body: JSON.stringify(j), headers: { ...res.headers(), 'content-type': 'application/json' } }); });
  await p.goto(`${BASE}/rental/${rent.id}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const btn = p.getByRole('button', { name: '예약 문의' }); ok('예약 문의 버튼(소유 매장)', await btn.count() > 0, rent.name);
  await btn.first().click(); await p.waitForTimeout(800);
  const dates = p.locator('input[type="date"]'); ok('예약 폼: 날짜 입력 2개', await dates.count() >= 2);
  await dates.nth(0).fill('2026-12-20'); await dates.nth(1).fill('2026-12-21');
  const nums = p.locator('input[type="number"], input[inputmode="numeric"]'); if (await nums.count() >= 3) { await nums.nth(0).fill('2'); await nums.nth(2).fill('1'); }
  const ta = p.locator('textarea').last(); if (await ta.count()) await ta.fill(`전체검사 예약 문의 ${ts}`);
  const submit = p.locator('div.fixed button').filter({ hasText: /보내|문의|채팅/ }).last(); ok('예약 폼: 보내기 버튼', await submit.count() > 0, (await submit.innerText().catch(() => '')));
  await submit.click(); await p.waitForURL(/\/chat\//, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(4000);
  const chatT = await txt(p);
  ok('채팅방 이동 + 첫 메시지 자동 전송', /\/chat\//.test(p.url()) && /\[렌탈 예약 문의\]/.test(chatT) && /2026-12-20/.test(chatT) && new RegExp(`전체검사 예약 문의 ${ts}`).test(chatT), p.url().replace(BASE, ''));
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  ok('새로고침해도 중복 전송 없음', ((await txt(p)).match(new RegExp(`전체검사 예약 문의 ${ts}`, 'g')) || []).length === 1); // 같은 방에 이전 검사 메시지가 남아 있으니 이번 고유 번호로만 센다
  await p.unroute(`**/api/rentals/${rent.id}`);

  // 2) 판매완료 → 구매자 선택 창
  await p.goto(`${BASE}/used/register`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 900; c.height = 700; const g = c.getContext('2d'); g.fillStyle = '#334155'; g.fillRect(0, 0, 900, 700); const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8)); const f = new File([blob], 'check.jpg', { type: 'image/jpeg' }); const input = document.querySelector('input[type="file"]'); const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(4000);
  await p.getByPlaceholder(/로시뇰|나이키 베이퍼/).fill(`점검 매물 ${ts}`); const brand = p.getByPlaceholder(/예: 피셔|예: 나이키|예: SG|예: 오클리/).first(); if (await brand.count()) await brand.fill('점검');
  await p.getByPlaceholder('예: 450,000').fill('10000'); const loc = p.getByPlaceholder('예: 서울 강남구'); if (await loc.count()) await loc.fill('강원 평창'); const desc = p.getByPlaceholder(/장비의 상태/); if (await desc.count()) await desc.fill('전체검사용 임시 매물, 바로 삭제');
  await p.locator('input[type="checkbox"]').last().check().catch(() => {}); await p.locator('button[type="submit"]').first().click(); await waitText(p, new RegExp(`점검 매물 ${ts}`), 20000);
  await p.goto(`${BASE}/mypage/sales`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const card = p.locator('.card').filter({ hasText: `점검 매물 ${ts}` }).first(); ok('점검 매물 등록', await card.count() > 0);
  if (await card.count()) {
    await card.locator('select').first().selectOption('sold'); await p.waitForTimeout(1200);
    const modalT = await txt(p); ok('판매완료 → 구매자 선택 창', /누구에게 판매했나요/.test(modalT));
    ok('선택 창: 채팅 상대 목록 또는 빈 안내', /최근 대화|아직 채팅한 상대가 없어요/.test(modalT));
    await p.getByRole('button', { name: /선택 안 함/ }).first().click(); await p.waitForTimeout(2000);
    const after = await p.locator('.card').filter({ hasText: `점검 매물 ${ts}` }).first().innerText();
    ok('앱 밖 거래로 판매완료 처리', /판매완료|판매 완료/.test(after));
    await p.locator('.card').filter({ hasText: `점검 매물 ${ts}` }).first().getByRole('button', { name: /삭제/ }).first().click(); await p.waitForTimeout(2000);
    ok('점검 매물 삭제', (await p.locator('.card').filter({ hasText: `점검 매물 ${ts}` }).count()) === 0);
  }

  // 3) 시합 신청 제출 → 내 신청 내역 '검토 중' → 관리자 API 로 삭제
  await p.goto(`${BASE}/competitions/register`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  const title = `점검 대회 ${ts}`;
  const fill = async (re, v) => { const el = p.getByPlaceholder(re).first(); if (await el.count()) { await el.fill(v); return true; } return false; };
  const f1 = await fill(/제10회|챔피언/, title); const f2 = await fill(/용평리조트|레인보/, '휘닉스 평창'); const f3 = await fill(/대한스키협회/, '점검 주최');
  const d = p.locator('input[type="date"]').first(); if (await d.count()) await d.fill('2027-01-15');
  ok('시합 폼 입력 (대회명·장소·주최·날짜)', f1 && f2 && f3);
  await p.getByRole('button', { name: /신청하기|등록 신청|신청 보내기|저장/ }).last().click(); await p.waitForTimeout(3000);
  const mine = await (await fetch(`${API}/competitions/mine`, { headers: { Authorization: `Bearer ${await apiLogin(process.env.U_EMAIL, process.env.U_PW)}` } })).json();
  const c0 = (mine.items || mine).find((c) => c.title === title);
  ok('시합 신청 저장 (status pending)', !!c0 && c0.status === 'pending', c0 ? c0.status : JSON.stringify(mine).slice(0, 80));
  if (c0) {
    const pub = await (await fetch(`${API}/competitions`)).json(); ok('공개 목록에는 아직 없음', !(pub.items || pub).some((c) => c.id === c0.id));
    const pend = await (await fetch(`${API}/competitions/admin/pending`, { headers: { Authorization: `Bearer ${adminTok}` } })).json(); ok('관리자 대기 목록에 표시', (pend.items || pend).some((c) => c.id === c0.id));
    const del = await fetch(`${API}/competitions/${c0.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminTok}` } }); ok('점검 대회 삭제 (관리자)', del.status === 200, `HTTP ${del.status}`);
  }

  // 4) 공유 카드: 글·스키샵
  const posts = await (await fetch(`${API}/community?limit=1`)).json(); const p0 = (posts.posts || posts.items || [])[0];
  if (p0) { const h = await (await fetch(`${BASE}/community/post/${p0.id}`, { headers: { 'User-Agent': 'kakaotalk-scrap/1.0' } })).text(); ok('글 공유 카드 og:title', /og:title" content="[^"]*스노우판 커뮤니티/.test(h)); }
  const shops = await (await fetch(`${API}/ski-shops?limit=1`)).json(); const s0 = (shops.items || shops)[0];
  if (s0) { const h = await (await fetch(`${BASE}/skishop/${s0.id}`, { headers: { 'User-Agent': 'kakaotalk-scrap/1.0' } })).text(); ok('스키샵 공유 카드 og:title', /og:title" content="[^"]*스키·보드샵/.test(h)); }
  ok('페이지 오류·500 없음', errs.length === 0, errs.join(' | '));
  await browser.close(); const f = R.filter((x) => !x).length; console.log(`\nDEEP FEATURE CHECK ${R.length - f}/${R.length}`); process.exit(f ? 2 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
