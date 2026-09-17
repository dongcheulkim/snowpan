// 실서비스 데이터가 없어 feature_check 가 건너뛴 흐름을 실제로 눌러 본다 (2026-09-17).
// 1) 방문 예약: 관리자 소유 임시 레슨으로 실제 요청→확정→알림→취소 흐름 (실제 사장님에게 안 감, 끝나면 레슨 삭제)
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

  // 1) 방문 예약 (결제 없음): 관리자 계정이 소유한 임시 레슨을 만들어 승인 → 심사용 계정이 UI 로 예약 요청 → 채팅 카드 → 관리자 API 로 확정 → 손님 알림 → 취소 → 레슨 삭제
  const H = { Authorization: `Bearer ${adminTok}`, 'Content-Type': 'application/json' };
  const resorts = await (await fetch(`${API}/resorts`)).json(); const resort0 = (Array.isArray(resorts) ? resorts : resorts.items || [])[0];
  const lessonRes = await fetch(`${API}/lessons`, { method: 'POST', headers: H, body: JSON.stringify({ name: `점검 레슨 ${ts}`, resortId: resort0.id, description: '전체검사용 임시 레슨이에요. 검사 뒤 바로 삭제돼요.', specialties: '인터' }) });
  const lesson = await lessonRes.json(); ok('임시 레슨 생성(관리자 소유)', lessonRes.status === 201, `HTTP ${lessonRes.status} ${(lesson.error || '')}`);
  let lessonId = lesson.id;
  if (lessonId) {
    if (!lesson.approved) { const ap = await fetch(`${API}/admin/lessons/${lessonId}/approve`, { method: 'PUT', headers: H, body: '{}' }); ok('임시 레슨 승인', ap.status === 200, `HTTP ${ap.status}`); }
    await p.goto(`${BASE}/lesson/${lessonId}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    const rbtn = p.getByRole('button', { name: '레슨 예약' }); ok('레슨 상세 예약 버튼', await rbtn.count() > 0);
    await rbtn.first().click(); await p.waitForTimeout(800);
    const d = new Date(Date.now() + 7 * 86400000); const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await p.locator('input[type="date"]').first().fill(ymd);
    const sel = p.locator('select').first(); if (await sel.count()) await sel.selectOption({ index: 3 }).catch(() => {});
    await p.getByRole('button', { name: '초급' }).first().click().catch(() => {});
    const ta = p.locator('textarea').last(); if (await ta.count()) await ta.fill(`전체검사 예약 ${ts}`);
    await p.getByRole('button', { name: '예약 요청하기' }).first().click();
    await p.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(3000);
    const chatT = await txt(p);
    ok('예약 요청 → 채팅방 이동 + 예약 카드', /\/chat\/[0-9a-f-]{36}/.test(p.url()) && /방문 예약 요청|예약 요청/.test(chatT) && new RegExp(`점검 레슨 ${ts}`).test(chatT), p.url().replace(BASE, ''));
    const roomId = (p.url().match(/\/chat\/([0-9a-f-]{36})/) || [])[1];
    const mine = await (await fetch(`${API}/reservations/mine`, { headers: { Authorization: `Bearer ${await apiLogin(process.env.U_EMAIL, process.env.U_PW)}` } })).json();
    const rsv = (mine.items || []).find((r) => r.shopName === `점검 레슨 ${ts}`);
    ok('내 예약 목록에 요청됨', !!rsv && rsv.status === 'requested', rsv ? rsv.status : JSON.stringify(mine).slice(0, 80));
    if (rsv) {
      const ownerNoti = await (await fetch(`${API}/notifications`, { headers: H })).json(); const on = (ownerNoti.items || ownerNoti.notifications || ownerNoti || []);
      ok('사장님(관리자)에게 예약 요청 알림', Array.isArray(on) && on.some((n) => /예약 요청/.test(n.title || '')));
      const cf = await fetch(`${API}/reservations/${rsv.id}/confirm`, { method: 'PUT', headers: H, body: JSON.stringify({ message: '10시에 뵐게요' }) }); const cfj = await cf.json();
      ok('사장님 확정 (API)', cf.status === 200 && (cfj.reservation || cfj).status === 'confirmed', `HTTP ${cf.status}`);
      await p.waitForTimeout(2500); const chatT2 = await txt(p);
      ok('채팅방에 확정 카드 실시간 표시', /예약 확정/.test(chatT2) && /10시에 뵐게요/.test(chatT2));
      const custTok = await apiLogin(process.env.U_EMAIL, process.env.U_PW);
      const cn = await (await fetch(`${API}/notifications`, { headers: { Authorization: `Bearer ${custTok}` } })).json(); const cl = (cn.items || cn.notifications || cn || []);
      ok('손님에게 확정 알림', Array.isArray(cl) && cl.some((n) => /예약이 확정됐어요/.test(n.title || '')));
      await p.goto(`${BASE}/mypage/reservations`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
      ok('내 예약 페이지에 확정 표시', new RegExp(`점검 레슨 ${ts}`).test(await txt(p)) && /확정/.test(await txt(p)));
      const cc = await fetch(`${API}/reservations/${rsv.id}/cancel`, { method: 'PUT', headers: { Authorization: `Bearer ${custTok}`, 'Content-Type': 'application/json' }, body: '{}' });
      ok('손님 취소 (API)', cc.status === 200, `HTTP ${cc.status}`);
    }
    const del = await fetch(`${API}/lessons/${lessonId}`, { method: 'DELETE', headers: H }); ok('임시 레슨 삭제', del.status === 200, `HTTP ${del.status}`);
    if (roomId) console.log('     (예약 카드는 고객센터 방에 남음 — 검사 기록)');
  }

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
