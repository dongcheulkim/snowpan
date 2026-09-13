// 고객센터 채팅 왕복 — 손님 문의 → 자동답변 → 메시지 → 관리자 목록·답장 → 손님 실시간 수신 + 상대에게 차단·대화삭제 반영
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = 'https://snowpan.kr'; const ts = Date.now().toString().slice(-6); const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, ok: !!cond, extra }); console.log(`${cond ? 'OK ' : 'FAIL'} ${name} ${extra}`); };
async function login(page, email, pw) { await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); await page.getByText('이메일로 로그인').first().click(); await page.waitForTimeout(400); await page.fill('input[type="email"], input[name="email"]', email); await page.fill('input[type="password"]', pw); await page.keyboard.press('Enter'); await page.waitForTimeout(3500); return !page.url().endsWith('/login'); }
const bodyText = (page) => page.evaluate(() => document.body.innerText).catch(() => '');
async function waitText(page, re, ms = 10000) { const end = Date.now() + ms; while (Date.now() < end) { if (re.test(await bodyText(page))) return true; await page.waitForTimeout(400); } return false; }
(async () => {
  const browser = await chromium.launch(); const mk = () => browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const uctx = await mk(); const u = await uctx.newPage(); const actx = await mk(); const a = await actx.newPage();
  const uerr = []; u.on('pageerror', (e) => uerr.push(e.message)); const aerr = []; a.on('pageerror', (e) => aerr.push(e.message));
  ok('손님 로그인', await login(u, process.env.U_EMAIL, process.env.U_PW));
  await u.goto(`${BASE}/mypage/support`, { waitUntil: 'networkidle', timeout: 45000 }); await u.getByText('관리자에게 1:1 채팅').first().click(); await u.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {});
  const roomUrl = u.url(); ok('1:1 채팅방 진입', /\/chat\/[0-9a-f-]{36}/.test(roomUrl), roomUrl); await u.waitForTimeout(2000);
  ok('고정 안내 메뉴 표시', await waitText(u, /어떤 도움이 필요하신가요/, 8000)); ok('소켓 연결됨', await waitText(u, /연결됨/, 10000));
  await u.getByRole('button', { name: '광고', exact: true }).first().click(); await u.waitForTimeout(500); await u.getByRole('button', { name: '광고 비용', exact: true }).first().click();
  ok('[문의] 광고 > 광고 비용 전송', await waitText(u, /\[문의\] 광고 > 광고 비용/, 8000)); ok('자동 답변(요금표) 도착', await waitText(u, /월결제 60만원\(1년 720만원\)/, 12000));
  const msg = `베타 점검 메시지 ${ts}`; await u.locator('textarea').first().fill(msg); await u.getByRole('button', { name: '전송' }).first().click(); ok('손님 메시지 전송 표시', await waitText(u, new RegExp(msg), 8000));
  ok('관리자 로그인', await login(a, process.env.A_EMAIL, process.env.A_PW)); await a.goto(`${BASE}/chat/rooms`, { waitUntil: 'networkidle', timeout: 45000 }); await a.waitForTimeout(1500);
  ok('관리자 채팅 목록에 손님 방 노출', new RegExp(msg).test(await bodyText(a)));
  const roomId = (roomUrl.match(/\/chat\/([0-9a-f-]{36})/) || [])[1]; await a.goto(`${BASE}/chat/${roomId}`, { waitUntil: 'networkidle', timeout: 45000 }); await a.waitForTimeout(1500);
  ok('관리자가 손님 메시지 조회', await waitText(a, new RegExp(msg), 8000)); ok('관리자 헤더에 "광고 링크" 버튼', await waitText(a, /광고 링크/, 3000)); ok('관리자 화면엔 안내 메뉴 없음', !/어떤 도움이 필요하신가요/.test(await bodyText(a)));
  const reply = `관리자 답장 ${ts}`; await a.locator('textarea').first().fill(reply); await a.getByRole('button', { name: '전송' }).first().click(); ok('관리자 답장 전송 표시', await waitText(a, new RegExp(reply), 8000));
  ok('손님 화면에 답장 실시간 도착', await waitText(u, new RegExp(reply), 12000));
  // 대화 삭제 = 내 쪽만 숨김
  await u.goto(`${BASE}/chat/rooms`, { waitUntil: 'networkidle', timeout: 45000 }); await u.waitForTimeout(1000); ok('손님 채팅 목록에 방 + 마지막 메시지', new RegExp(reply).test(await bodyText(u)));
  u.once('dialog', (d) => { ok('삭제 확인창: 상대에겐 남는다 안내', /상대방에게는 대화 내용이 그대로 남아요/.test(d.message())); d.accept(); });
  const delBtn = u.getByRole('button', { name: '대화 삭제' }).first(); if (await delBtn.count()) { await delBtn.click(); await u.waitForTimeout(1500); ok('손님 목록에서 방 사라짐', !new RegExp(reply).test(await bodyText(u))); }
  await a.reload({ waitUntil: 'networkidle' }); await a.waitForTimeout(1200); ok('관리자 쪽 대화 내역 유지', await waitText(a, new RegExp(msg), 5000));
  const reply2 = `삭제 후 답장 ${ts}`; await a.locator('textarea').first().fill(reply2); await a.getByRole('button', { name: '전송' }).first().click(); await a.waitForTimeout(1500);
  await u.goto(`${BASE}/chat/rooms`, { waitUntil: 'networkidle', timeout: 45000 }); await u.waitForTimeout(1200); ok('새 메시지 오면 손님 목록에 방 다시 표시', new RegExp(reply2).test(await bodyText(u)));
  await u.goto(`${BASE}/chat/${roomId}`, { waitUntil: 'networkidle', timeout: 45000 }); await u.waitForTimeout(1500); const ut = await bodyText(u); ok('손님은 삭제 이후 메시지만 봄', new RegExp(reply2).test(ut) && !new RegExp(msg).test(ut));
  ok('손님 페이지 오류 없음', uerr.length === 0, uerr.join(' | ')); ok('관리자 페이지 오류 없음', aerr.length === 0, aerr.join(' | '));
  await browser.close(); const fails = results.filter((r) => !r.ok); console.log(`\nCHAT TEST: ${results.length - fails.length}/${results.length} OK`); process.exit(fails.length ? 2 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
