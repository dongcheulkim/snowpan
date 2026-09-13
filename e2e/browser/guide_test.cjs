// 고객센터 안내 메뉴 전수 검사 — 모든 카테고리 > 모든 소분류 → [문의] 전송 + 자동 답변 도착. + 광고 신청 첫 화면.
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = 'https://snowpan.kr'; let pass = 0, total = 0;
const ok = (n, c, x = '') => { total++; if (c) pass++; console.log(`${c ? 'OK ' : 'FAIL'} ${n} ${x}`); };
const bodyText = (p) => p.evaluate(() => document.body.innerText).catch(() => '');
async function waitText(p, re, ms = 10000) { const end = Date.now() + ms; while (Date.now() < end) { if (re.test(await bodyText(p))) return true; await p.waitForTimeout(300); } return false; }
const guideButtons = (p) => p.evaluate(() => { const hdrBtn = Array.from(document.querySelectorAll('button')).find((b) => /^(접기|뒤로|메뉴 열기)$/.test((b.textContent || '').trim())); if (!hdrBtn) return { header: null, items: [] }; const root = hdrBtn.parentElement.parentElement; const hdr = Array.from(hdrBtn.parentElement.querySelectorAll('button')).map((b) => b.textContent.trim()); return { header: hdr[0], items: Array.from(root.querySelectorAll('button')).map((b) => b.textContent.trim()).filter((t) => t && !hdr.includes(t)) }; });
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); await p.getByText('이메일로 로그인').first().click(); await p.waitForTimeout(400);
  await p.fill('input[type="email"], input[name="email"]', process.env.U_EMAIL); await p.fill('input[type="password"]', process.env.U_PW); await p.keyboard.press('Enter'); await p.waitForTimeout(3500); ok('로그인', !p.url().endsWith('/login'));
  await p.goto(`${BASE}/mypage/support`, { waitUntil: 'networkidle', timeout: 45000 }); await p.getByText('관리자에게 1:1 채팅').first().click(); await p.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(2000);
  ok('소켓 연결됨', await waitText(p, /연결됨/, 10000));
  let g = await guideButtons(p); if (g.header !== '어떤 도움이 필요하신가요?' && (await p.getByRole('button', { name: '메뉴 열기', exact: true }).count())) { await p.getByRole('button', { name: '메뉴 열기', exact: true }).click(); await p.waitForTimeout(400); g = await guideButtons(p); }
  ok(`카테고리 ${g.items.length}개`, g.items.length >= 4, g.items.join(','));
  for (const cat of g.items) {
    await p.getByRole('button', { name: cat, exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(500);
    const s = await guideButtons(p); ok(`"${cat}" 소분류 ${s.items.length}개`, s.header === cat && s.items.length >= 1, s.items.join(','));
    for (const sub of s.items) {
      const before = (await bodyText(p)).length;
      await p.getByRole('button', { name: sub, exact: true }).first().click({ timeout: 3000 }).catch(() => {});
      const sent = await waitText(p, new RegExp(`\\[문의\\] ${cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} > ${sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), 8000);
      let answered = false; const end = Date.now() + 12000; while (Date.now() < end) { const t = await bodyText(p); const idx = t.lastIndexOf(`[문의] ${cat} > ${sub}`); if (idx >= 0 && t.slice(idx).replace(/\s+/g, '').length > (`[문의] ${cat} > ${sub}`).length + 60) { answered = true; break; } await p.waitForTimeout(400); }
      ok(`"${cat} > ${sub}" 전송 + 자동 답변`, sent && answered);
      // 메뉴가 첫 화면으로 돌아감 → 다음 소분류 위해 카테고리 다시 열기
      await p.waitForTimeout(400); const back = await guideButtons(p);
      if (back.header !== cat) { await p.getByRole('button', { name: cat, exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400); }
      void before;
    }
    await p.getByRole('button', { name: '뒤로', exact: true }).first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(300);
  }
  await p.goto(`${BASE}/ad-booking`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(1200); const at = await bodyText(p);
  ok('광고 신청 첫 화면: 위치 선택 버튼', /메인 배너/.test(at) && /프리미엄/.test(at) && (await p.locator('button:visible').count()) > 2);
  ok('페이지 오류 없음', errs.length === 0, errs.join(' | '));
  await browser.close(); console.log(`GUIDE TEST ${pass}/${total}`); process.exit(pass === total ? 0 : 2);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
