// 실제 쓰기 흐름 — 심사용 계정으로 글·댓글·수정·삭제, 신고, 차단·해제, 프로필 닉네임 변경·원복, 중고 등록·상태 변경·삭제. 끝나면 전부 정리.
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = 'https://snowpan.kr'; const ts = Date.now().toString().slice(-6); const R = []; const ok = (n, c, x = '') => { R.push(c); console.log(`${c ? 'OK ' : 'FAIL'} ${n} ${x}`); };
const txt = (p) => p.evaluate(() => document.body.innerText).catch(() => '');
async function waitText(p, re, ms = 8000) { const end = Date.now() + ms; while (Date.now() < end) { if (re.test(await txt(p))) return true; await p.waitForTimeout(300); } return false; }
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 500) errs.push(`http ${r.status()} ${r.url().slice(0, 80)}`); });
  p.on('dialog', (d) => d.accept());
  await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); await p.getByText('이메일로 로그인').first().click(); await p.waitForTimeout(400);
  await p.fill('input[type="email"], input[name="email"]', process.env.U_EMAIL); await p.fill('input[type="password"]', process.env.U_PW); await p.keyboard.press('Enter'); await p.waitForTimeout(3500); ok('로그인', !p.url().endsWith('/login'));

  // 1) 커뮤니티 글 작성 → 상세 → 댓글 → 수정 → 삭제
  await p.goto(`${BASE}/community/write`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800);
  const title = `점검 글 ${ts}`; await p.getByPlaceholder('제목을 입력하세요').fill(title); await p.getByPlaceholder('내용을 입력하세요').fill('전체검사용 임시 글입니다. 곧 삭제돼요.');
  await p.locator('input[type="checkbox"]').first().check().catch(() => {}); // 커뮤니티 이용규칙 동의
  await p.getByRole('button', { name: '등록하기' }).click(); await p.waitForURL(/\/community(\?|$)/, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1500);
  // 등록 후 목록으로 감 → 목록에서 내 글을 눌러 상세로
  await p.getByText(title, { exact: false }).first().click({ timeout: 8000 }).catch(() => {}); await p.waitForURL(/\/community\/post\/[0-9a-f-]{36}/, { timeout: 15000 }).catch(() => {}); const postUrl = p.url();
  ok('글 작성 → 상세 이동', /\/community\/post\//.test(postUrl) && await waitText(p, new RegExp(title), 5000), postUrl.replace(BASE, ''));
  const cInput = p.locator('input.h-9, input[placeholder*="댓글"]').last(); await cInput.fill(`점검 댓글 ${ts}`); await p.keyboard.press('Enter'); ok('댓글 작성', await waitText(p, new RegExp(`점검 댓글 ${ts}`), 8000));
  const editBtn = p.getByRole('button', { name: /^수정$/ }).first(); const editLink = p.getByRole('link', { name: /^수정$/ }).first();
  if (await editBtn.count() || await editLink.count()) { await (await editBtn.count() ? editBtn : editLink).click(); await p.waitForTimeout(1500); const t2 = p.getByPlaceholder('제목을 입력하세요'); if (await t2.count()) { await t2.fill(title + ' 수정'); await p.locator('input[type="checkbox"]').first().check().catch(() => {}); await p.getByRole('button', { name: '수정하기' }).click(); await p.waitForTimeout(2000); ok('글 수정', await waitText(p, new RegExp(title + ' 수정'), 6000)); } else ok('글 수정 화면', false); } else ok('글 수정 버튼', false);
  await p.goto(postUrl, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800);
  const cdel = p.locator('button').filter({ hasText: /^삭제$/ }); const ccount = await cdel.count();
  if (ccount > 1) { await cdel.last().click(); await p.waitForTimeout(1500); ok('댓글 삭제', !(await txt(p)).includes(`점검 댓글 ${ts}`)); }
  await p.getByRole('button', { name: /^삭제$/ }).first().click(); await p.waitForTimeout(2000); ok('글 삭제 → 목록 이동', /\/community/.test(p.url()) && !/\/post\//.test(p.url()));
  await p.goto(postUrl, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800); ok('삭제된 글 접근 시 안내', /삭제|찾을 수 없|존재하지/.test(await txt(p)));

  // 2) 다른 사람 글 신고 + 차단 → 해제
  await p.goto(`${BASE}/community`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800);
  const others = p.locator('a[href^="/community/post/"]'); let target = null;
  for (let i = 0; i < Math.min(5, await others.count()); i++) { const href = await others.nth(i).getAttribute('href'); await p.goto(BASE + href, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800); if (await p.getByRole('button', { name: /^차단$/ }).count()) { target = href; break; } }
  ok('다른 사람 글 찾음', !!target, target || '');
  if (target) {
    const rep = p.getByRole('button', { name: /신고/ }).first(); if (await rep.count()) { await rep.click(); await p.waitForTimeout(600); await p.getByRole('button', { name: '욕설/비방' }).first().click().catch(() => {}); const sub = p.locator('button:has-text("신고")').last(); if (await sub.count()) await sub.click(); ok('신고 접수', await waitText(p, /신고가 접수|이미 신고/, 6000)); } else ok('신고 버튼', false);
    await p.goto(BASE + target, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800);
    await p.getByRole('button', { name: /^차단$/ }).first().click(); ok('차단 처리', await waitText(p, /차단했어요/, 6000));
    await p.goto(`${BASE}/mypage/blocks`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800); const un = p.getByRole('button', { name: /해제/ }).first(); ok('차단 목록에 표시', await un.count() > 0);
    if (await un.count()) { await un.click(); await p.waitForTimeout(1500); ok('차단 해제', (await p.getByRole('button', { name: /해제/ }).count()) === 0 || /없어요|없습니다/.test(await txt(p))); }
  }

  // 3) 프로필 닉네임 변경 → 원복
  await p.goto(`${BASE}/mypage/edit`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800);
  const nick = p.getByPlaceholder('닉네임을 입력하세요'); const orig = await nick.inputValue(); await nick.fill((orig || '심사용계정').slice(0, 16) + '점검'); await p.getByRole('button', { name: '저장하기' }).click(); ok('닉네임 변경 저장', await waitText(p, /저장|변경|완료/, 6000));
  await p.goto(`${BASE}/mypage/edit`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800); await p.getByPlaceholder('닉네임을 입력하세요').fill(orig); await p.getByRole('button', { name: '저장하기' }).click(); await p.waitForTimeout(1500);
  await p.goto(`${BASE}/mypage/edit`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800); ok('닉네임 원복', (await p.getByPlaceholder('닉네임을 입력하세요').inputValue()) === orig);

  // 4) 중고 등록(사진 포함) → 상태 변경 → 삭제
  await p.goto(`${BASE}/used/register`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800);
  await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 900; c.height = 700; const g = c.getContext('2d'); g.fillStyle = '#2b6cb0'; g.fillRect(0, 0, 900, 700); g.fillStyle = '#fff'; g.font = 'bold 80px sans-serif'; g.fillText('TEST', 320, 380); const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)); const f = new File([blob], 'test.jpg', { type: 'image/jpeg' }); const input = document.querySelector('input[type="file"]'); const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(4000);
  await p.getByPlaceholder(/로시뇰|나이키 베이퍼/).fill(`점검 매물 ${ts}`); const brand = p.getByPlaceholder(/예: 피셔|예: 나이키|예: SG|예: 오클리/).first(); if (await brand.count()) await brand.fill('테스트');
  await p.getByPlaceholder('예: 450,000').fill('10000'); const loc = p.getByPlaceholder('예: 서울 강남구'); if (await loc.count()) await loc.fill('강원 평창'); const desc = p.getByPlaceholder(/장비의 상태/); if (await desc.count()) await desc.fill('전체검사용 임시 매물, 곧 삭제');
  await p.locator('input[type="checkbox"]').last().check().catch(() => {}); // 중고거래 주의사항 동의
  await p.locator('button[type="submit"]').first().click(); await p.waitForTimeout(3000);
  const prodOk = await waitText(p, new RegExp(`점검 매물 ${ts}`), 20000) || /\/used\/[0-9a-f-]{36}/.test(p.url()); // 사진 업로드+등록이 배포 직후엔 10초 넘게 걸릴 수 있어 20초까지 기다림
  ok('중고 등록', prodOk, p.url().replace(BASE, '') + ' ' + (await txt(p)).replace(/\s+/g, ' ').slice(0, 160)); // (예전엔 주석 뒤에 붙어 있어 실행되지 않았음 — 2026-09-24)
  // 등록 후 목록으로 감 → 내 판매내역에서 열어 상태 변경 → 삭제
  await p.goto(`${BASE}/mypage/sales`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(1000);
  const card = p.locator('.card').filter({ hasText: `점검 매물 ${ts}` }).first();
  ok('내 판매내역에 등록된 매물 표시', await card.count() > 0);
  if (await card.count()) {
    const sel = card.locator('select').first(); if (await sel.count()) { await sel.selectOption('reserved'); await p.waitForTimeout(1500); ok('예약중 변경', /예약중/.test(await card.innerText())); }
    await card.getByRole('button', { name: /삭제/ }).first().click(); await p.waitForTimeout(2000); ok('매물 삭제', (await p.locator('.card').filter({ hasText: `점검 매물 ${ts}` }).count()) === 0); }
  // 5) 정리 확인: 내 글·내 매물에 점검 항목 남지 않음
  await p.goto(`${BASE}/mypage/posts`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800); ok('내 글에 점검 글 없음', !(await txt(p)).includes(`점검 글 ${ts}`));
  await p.goto(`${BASE}/mypage/sales`, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(800); ok('내 매물에 점검 매물 없음', !(await txt(p)).includes(`점검 매물 ${ts}`));
  // 6) 정리: 이 계정이 남긴 대기 신고를 관리자 API 로 '문제 없음' 처리 — 관리자 신고관리에 점검 신고가 쌓여 있던 것(2026-09-15 발견)
  try {
    const API = 'https://snowpan.onrender.com/api';
    const lg = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.A_EMAIL, password: process.env.A_PW }) }).then((r) => r.json());
    const h = { Authorization: `Bearer ${lg.token}`, 'Content-Type': 'application/json' };
    const rs = await fetch(`${API}/admin/reports`, { headers: h }).then((r) => r.json());
    const mine = Array.isArray(rs) ? rs.filter((r) => r.status === 'pending' && r.reporter && r.reporter.email === process.env.U_EMAIL) : [];
    for (const r of mine) await fetch(`${API}/admin/reports/${r.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ action: 'keep' }) });
    ok('점검 신고 정리(문제 없음 처리)', true, `${mine.length}건`);
  } catch (e) { ok('점검 신고 정리', false, String(e).slice(0, 80)); }
  ok('페이지 오류·500 없음', errs.length === 0, errs.join(' | '));
  await browser.close(); const f = R.filter((x) => !x).length; console.log(`\nWRITE FLOWS ${R.length - f}/${R.length}`); process.exit(f ? 2 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
