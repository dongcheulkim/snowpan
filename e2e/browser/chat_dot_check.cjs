// 채팅 안 읽음 점(폰 하단 탭) — 방 안에서 받은 메시지는 점이 안 켜지고, 밖에서 받으면 켜지고, 읽고 나오면 바로 꺼짐 (2026-10-08)
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = process.env.BASE || 'https://snowpan.kr';
let pass = 0, fail = 0; const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} | ${n}${c ? '' : ' ' + d}`); };
async function login(p, email, pw) { await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); const c = p.getByRole('button', { name: '필수만' }); if (await c.isVisible().catch(() => false)) await c.click(); await p.getByText('이메일로 로그인').first().click(); await p.waitForTimeout(400); await p.fill('input[type="email"], input[name="email"]', email); await p.fill('input[type="password"]', pw); await p.keyboard.press('Enter'); await p.waitForTimeout(3500); return !p.url().endsWith('/login'); }
const dot = (p) => p.locator('a[href="/chat/rooms"]:visible .bg-coral').first().isVisible().catch(() => false); // 폰: 하단 탭의 점 (PC 메뉴 링크는 숨김이라 제외)
const waitText = async (p, re, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(await p.locator('body').innerText())) return true; await p.waitForTimeout(400); } return false; };
(async () => {
  const b = await chromium.launch(); const ts = Date.now();
  const uc = await b.newContext({ viewport: { width: 390, height: 844 } }); const u = await uc.newPage();
  const ac = await b.newContext({ viewport: { width: 1366, height: 900 } }); const a = await ac.newPage();
  ok('손님 로그인', await login(u, process.env.U_EMAIL, process.env.U_PW));
  await u.goto(`${BASE}/mypage/support`, { waitUntil: 'networkidle', timeout: 45000 }); await u.getByText('관리자에게 1:1 채팅').first().click(); await u.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {});
  const roomId = (u.url().match(/\/chat\/([0-9a-f-]{36})/) || [])[1]; ok('손님 고객센터 방 진입', !!roomId, u.url()); await u.waitForTimeout(2500);
  ok('관리자 로그인', await login(a, process.env.A_EMAIL, process.env.A_PW)); await a.goto(`${BASE}/chat/${roomId}`, { waitUntil: 'networkidle', timeout: 45000 }); await a.waitForTimeout(2000);
  // 1) 손님이 방 안에 있을 때 관리자가 보냄 → 손님이 홈으로 나가도 점 없음
  const m1 = `점 검사 1 ${ts}`; await a.locator('textarea').first().fill(m1); await a.getByRole('button', { name: '전송' }).first().click();
  ok('방 안에서 실시간 수신', await waitText(u, new RegExp(m1), 12000)); await u.waitForTimeout(1500);
  await u.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await u.waitForTimeout(2500);
  ok('방 안에서 받은 메시지는 나와도 점 없음', !(await dot(u)));
  // 2) 홈에 있을 때 관리자가 보냄 → 점 켜짐
  const m2 = `점 검사 2 ${ts}`; await a.locator('textarea').first().fill(m2); await a.getByRole('button', { name: '전송' }).first().click();
  { const t0 = Date.now(); let on = false; while (Date.now() - t0 < 15000 && !on) { on = await dot(u); if (!on) await u.waitForTimeout(500); } ok('밖에서 받으면 점 켜짐 (' + Math.round((Date.now() - t0) / 100) / 10 + '초)', on); }
  // 3) 방 들어가 읽고 나오면 바로 꺼짐
  await u.goto(`${BASE}/chat/${roomId}`, { waitUntil: 'networkidle' }); ok('방에서 메시지 확인', await waitText(u, new RegExp(m2), 10000)); await u.waitForTimeout(1500);
  await u.goto(`${BASE}/`, { waitUntil: 'networkidle' }); await u.waitForTimeout(2500);
  ok('읽고 나오면 점 바로 꺼짐 (30초 안)', !(await dot(u)));
  await b.close(); console.log(`----- chat_dot_check: PASS=${pass} FAIL=${fail} -----`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
