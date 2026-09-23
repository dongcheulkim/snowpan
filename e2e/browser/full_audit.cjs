// 스노우판 전체검사 — 홈 → 모든 카테고리(모든 버튼·필터·정렬·검색·상세·목록복귀) → 채팅 → 알림 → 알람 → 검색 → 마이 → 관리자.
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://snowpan.kr'; const API = 'https://snowpan.onrender.com';
const OUT = path.join(__dirname, 'audit'); fs.mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (section, name, cond, extra = '') => { results.push({ section, name, ok: !!cond, extra }); console.log(`${cond ? 'OK  ' : 'FAIL'} [${section}] ${name}${extra ? '  -- ' + String(extra).slice(0, 300) : ''}`); };
const NOISE = [/cloudflareinsights/, /favicon/, /ResizeObserver/, /googletagmanager/, /third-party cookie/i, /beacon/, /net::ERR_ABORTED/, /the server responded with a status of 4\d\d/];
const isNoise = (s) => NOISE.some((r) => r.test(s));
const DESTRUCTIVE = /삭제|신고|로그아웃|탈퇴|승인|거절|정지|결제|전송|등록|저장|취소|제출|구매|판매|완료|차단|해제|수정|보내기|올리기|업로드|사진|파일|카카오|네이버|구글|애플|Apple|로그인|회원가입|비밀번호|인증|발송|신청|초대|링크|복사|공유|전화|문의|채팅|대화|추가|생성|만들기|투표|확인|닫기|뒤로|메뉴|접기|열기|재생|일시정지|음소거|전체화면|다운로드|설치|허용|나중에|동의|거부|더보기|캠|지우기|초기화|모두|읽음|기록/;
function track(page) { const bag = [];
  page.on('pageerror', (e) => bag.push('pageerror: ' + String(e.message).slice(0, 220)));
  page.on('console', (m) => { if (m.type() === 'error' && !isNoise(m.text())) bag.push('console: ' + m.text().slice(0, 220)); });
  page.on('response', (r) => { const u = r.url(); if (r.status() >= 500 && !isNoise(u)) bag.push(`http ${r.status()} ${u.replace(API, 'api:').replace(BASE, '')}`); });
  page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && r.status() < 500 && u.startsWith(API) && !/\/api\/(auth\/me|notifications\/unread|wishlist)/.test(u)) bag.push(`http ${r.status()} ${u.replace(API, 'api:')}`); });
  return bag; }
const text = (p) => p.evaluate(() => document.body.innerText).catch(() => '');
const isErrScreen = (t) => /문제가 발생했습니다|새 버전이 나왔어요/.test(t);
async function go(page, route, wait = 1200) { try { await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 40000 }); } catch { return 'nav-timeout'; }
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(wait);
  const t = await text(page); if (isErrScreen(t)) return 'ERROR_SCREEN'; if (t.replace(/\s+/g, '').length < 30) return 'BLANK'; return 'ok'; }
async function shot(page, name) { await page.screenshot({ path: path.join(OUT, name.replace(/[^a-z0-9가-힣_-]+/gi, '_').slice(0, 80) + '.png') }).catch(() => {}); }
async function brokenImages(page) { return page.evaluate(() => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && !i.getAttribute('src').startsWith('data:') && i.offsetParent !== null).map((i) => i.currentSrc || i.src).slice(0, 5)); }
async function login(page, email, pw) { await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 }); await page.getByText('이메일로 로그인').first().click(); await page.waitForTimeout(400);
  await page.fill('input[type="email"], input[name="email"]', email); await page.fill('input[type="password"]', pw); await page.keyboard.press('Enter'); await page.waitForTimeout(3500); return !page.url().endsWith('/login'); }
async function pressAllButtons(page, section, label, bag, { max = 60, homeUrl } = {}) { const b0 = bag.length; const startUrl = homeUrl || page.url(); const seen = new Set(); let pressed = 0, navigated = 0;
  for (let round = 0; round < max; round++) {
    const names = await page.evaluate(() => Array.from(document.querySelectorAll('button, [role="tab"], [role="button"]')).filter((b) => b.offsetParent !== null && !b.disabled).map((b) => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    const next = names.find((n) => !seen.has(n) && !DESTRUCTIVE.test(n) && n.length <= 24); if (!next) break; seen.add(next);
    const before = bag.length; const btn = page.locator('button, [role="tab"], [role="button"]').filter({ hasText: next }).first();
    try { await btn.click({ timeout: 4000 }); } catch { continue; } pressed++;
    await page.waitForTimeout(700); await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    const t = await text(page); if (isErrScreen(t)) { ok(section, `${label} 버튼 "${next}" 클릭 후 오류 화면`, false, page.url()); await shot(page, `${section}_${label}_${next}`); }
    if (bag.length > before) ok(section, `${label} 버튼 "${next}" 클릭 시 오류`, false, bag.slice(before).join(' | '));
    if (page.url().split('?')[0] !== startUrl.split('?')[0]) { navigated++; await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}); await page.waitForTimeout(800); }
    await page.keyboard.press('Escape').catch(() => {}); }
  ok(section, `${label} 버튼 ${pressed}개 눌러봄 (이동 ${navigated}회) 오류 없음`, bag.length === b0, bag.slice(b0).join(' | ')); return pressed; }
async function cycleSelects(page, section, label, bag) { const b0 = bag.length; const n = await page.locator('select:visible').count(); let changed = 0;
  for (let i = 0; i < Math.min(n, 4); i++) { const sel = page.locator('select:visible').nth(i); const opts = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value));
    for (const v of opts.slice(0, 6)) { try { await sel.selectOption(v); changed++; await page.waitForTimeout(700); } catch {} } if (isErrScreen(await text(page))) ok(section, `${label} 셀렉트 ${i} 변경 후 오류 화면`, false); }
  if (n) ok(section, `${label} 셀렉트 ${n}개 옵션 ${changed}회 변경 오류 없음`, bag.length === b0, bag.slice(b0).join(' | ')); }
(async () => {
  const browser = await chromium.launch();
  const mk = (extra = {}) => browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR', ...extra });
  { const ctx = await mk(); const p = await ctx.newPage(); const bag = track(p); const S = '1.홈';
    ok(S, '홈 열림', (await go(p, '/', 2500)) === 'ok'); const t = await text(p);
    ok(S, '메인 배너 영역', await p.locator('.aspect-\\[5\\/4\\]').count() > 0); ok(S, '스노우판 매거진 섹션', /스노우판 매거진/.test(t));
    const mag = await p.evaluate(() => { const h = Array.from(document.querySelectorAll('h2')).find((e) => /스노우판 매거진/.test(e.textContent || '')); const box = h && (h.closest('div.px-4') || h.parentElement.parentElement); if (!box) return { n: -1 }; const imgs = Array.from(box.querySelectorAll('img')); return { n: box.querySelectorAll('button').length - 1, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, imgs: imgs.length, arrows: box.querySelectorAll('button[aria-label="왼쪽으로"], button[aria-label="오른쪽으로"]').length }; });
    ok(S, `매거진 카드 1~7개 (${mag.n}) 이미지 ${mag.loaded}/${mag.imgs} 화살표 없음`, mag.n >= 1 && mag.n <= 7 && mag.loaded === mag.imgs && mag.arrows === 0);
    ok(S, '커뮤니티 HOT 섹션', /핫한 커뮤니티|HOT/.test(t)); ok(S, '중고거래 섹션', /중고/.test(t));
    const broken = await brokenImages(p); ok(S, '깨진 이미지 없음', broken.length === 0, broken.join(' , ')); await shot(p, 'home');
    for (const [name, link] of [['스키·보드샵', '/new-equipment'], ['정비샵', '/repair'], ['중고거래', '/used'], ['렌탈샵', '/rental'], ['강습', '/lesson'], ['숙소', '/accommodation'], ['커뮤니티', '/community'], ['시합일정', '/competitions'], ['라이브캠', '/webcam'], ['스키장 투어', '/overseas']]) {
      const a = p.locator(`a[href="${link}"]`).first(); if (await a.count() === 0) { ok(S, `퀵메뉴 "${name}" 링크 존재`, false); continue; }
      const b0 = bag.length; await a.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1500); await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      ok(S, `퀵메뉴 "${name}" → ${link}`, p.url().startsWith(BASE + link) && !isErrScreen(await text(p)) && bag.length === b0, `${p.url().replace(BASE, '')} ${bag.slice(b0).join(' | ')}`); await go(p, '/', 800); }
    const links = await p.evaluate(() => Array.from(document.querySelectorAll('a[href^="/"]')).map((a) => a.getAttribute('href')).filter((h, i, arr) => arr.indexOf(h) === i));
    const dead = []; for (const h of links.slice(0, 40)) { const st = await go(p, h, 600); const tt = await text(p); if (st !== 'ok' || /페이지를 찾을 수 없/.test(tt.slice(0, 300))) dead.push(`${h}[${st}]`); }
    ok(S, `홈 내부 링크 ${links.length}개 전부 열림`, dead.length === 0, dead.join(' '));
    await go(p, '/', 1500); await pressAllButtons(p, S, '홈', bag, { max: 30 });
    for (const [name, link] of [['홈', '/'], ['커뮤니티', '/community'], ['채팅', '/chat'], ['MY', '/login']]) { const a = p.locator(`nav a[href="${link}"], nav a[href^="${link}"]`).first(); ok(S, `하단탭 "${name}" 존재`, await a.count() > 0); }
    ok(S, '홈 페이지 오류 없음', bag.length === 0, bag.join(' | ')); await ctx.close(); }
  { const ctx = await mk({ geolocation: { latitude: 37.643, longitude: 128.68 }, permissions: ['geolocation'] }); const p = await ctx.newPage(); const bag = track(p); const S = '2.카테고리';
    const cats = [
      { name: '스키·보드샵', path: '/new-equipment', detail: /\/(skishop|rental|repair)\/[0-9a-f-]{36}/, link: 'a[href^="/skishop/"], a[href^="/rental/"], a[href^="/repair/"]', listRe: /목록/ },
      { name: '정비샵', path: '/repair', detail: /\/repair\/[0-9a-f-]{36}/, link: 'a[href^="/repair/"]:not([href$="register"])', listRe: /정비샵 목록|목록/ },
      { name: '중고거래', path: '/used', detail: /\/used\/[0-9a-f-]{36}/, link: 'a[href^="/used/"]:not([href$="register"])' },
      { name: '렌탈샵', path: '/rental', detail: /\/rental\/[0-9a-f-]{36}/, link: 'a[href^="/rental/"]:not([href$="register"])', listRe: /렌탈샵 목록|목록/ },
      { name: '강습', path: '/lesson', detail: /\/lesson\/[0-9a-f-]{36}/, link: 'a[href^="/lesson/"]:not([href$="register"])', listRe: /목록/, mayBeEmpty: true },
      { name: '숙소', path: '/accommodation', detail: /\/accommodation\/[0-9a-f-]{36}/, link: 'a[href^="/accommodation/"]:not([href$="register"])', listRe: /목록/, mayBeEmpty: true },
      { name: '커뮤니티', path: '/community', detail: /\/(community\/post|poll)\/[0-9a-f-]{36}/, link: 'a[href^="/community/post/"], a[href^="/poll/"]' },
      { name: '시합일정', path: '/competitions', detail: /\/competitions\/[0-9a-f-]{36}/, link: 'a[href^="/competitions/"]', mayBeEmpty: true },
      { name: '라이브캠', path: '/webcam', detail: /\/webcam\/[^/]+/, link: 'a[href^="/webcam/"]' },
      { name: '스키장 투어', path: '/overseas', detail: /\/(overseas|agency)\/[^/]+/, link: 'a[href^="/overseas/"]:not([href*="register"]), a[href^="/agency/"]' },
      { name: '매장 소식', path: '/shop-news', detail: /\/shop-post\/[0-9a-f-]{36}/, link: 'a[href^="/shop-post/"]', mayBeEmpty: true },
      { name: '장비 가이드', path: '/gear-guide' } ];
    for (const c of cats) { const L = c.name; const b0 = bag.length; const st = await go(p, c.path, 1500); ok(S, `${L} 목록 열림`, st === 'ok', st); if (st !== 'ok') { await shot(p, `cat_${L}`); continue; }
      const broken = await brokenImages(p); ok(S, `${L} 깨진 이미지 없음`, broken.length === 0, broken.join(' , '));
      await pressAllButtons(p, S, L, bag, { max: 45, homeUrl: BASE + c.path }); await go(p, c.path, 800); await cycleSelects(p, S, L, bag); await go(p, c.path, 800);
      const search = p.locator('input[type="search"]:visible, input[placeholder*="검색"]:visible').first();
      if (await search.count()) { const bs = bag.length; await search.fill('스키'); await p.keyboard.press('Enter'); await p.waitForTimeout(1800); ok(S, `${L} 검색 "스키" 결과 표시`, !isErrScreen(await text(p)) && bag.length === bs, bag.slice(bs).join(' | ')); await go(p, c.path, 800); }
      const next = p.getByRole('button', { name: /다음|2$/ }).first(); if (await next.count()) { const bs = bag.length; await next.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1500); ok(S, `${L} 페이지 넘김 오류 없음`, !isErrScreen(await text(p)) && bag.length === bs, bag.slice(bs).join(' | ')); await go(p, c.path, 800); }
      if (c.detail) { const resortChip = p.getByRole('button', { name: /휘닉스평창/ }).first(); let filtered = false;
        if (await resortChip.count()) { await resortChip.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1500); filtered = /[?&]resort=/.test(p.url()); }
        const link = p.locator(c.link).first();
        if (await link.count() === 0) { ok(S, `${L} 목록에 항목 있음`, !!c.mayBeEmpty, c.mayBeEmpty ? '(등록 데이터 없음 — 빈 안내 표시)' : (await text(p)).replace(/\s+/g, ' ').slice(0, 150)); continue; }
        const listUrl = p.url(); const bs = bag.length; await link.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1800); await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        const td = await text(p); ok(S, `${L} 상세 열림`, c.detail.test(p.url()) && !isErrScreen(td) && td.replace(/\s+/g, '').length > 80, p.url().replace(BASE, ''));
        const brokenD = await brokenImages(p); ok(S, `${L} 상세 깨진 이미지 없음`, brokenD.length === 0, brokenD.join(' , ')); await shot(p, `detail_${L}`);
        const detailUrl = p.url(); await pressAllButtons(p, S, `${L} 상세`, bag, { max: 25, homeUrl: detailUrl });
        const ask = p.getByRole('button', { name: /문의|채팅|대화/ }).first();
        if (await ask.count()) { await ask.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1500); ok(S, `${L} 상세 문의 버튼 → 익명은 로그인 안내`, /\/login/.test(p.url()) || /로그인/.test(await text(p)), p.url().replace(BASE, '')); await p.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}); await p.waitForTimeout(1000); }
        // 목록 복귀는 앱 내 이동 기준으로만 검사 (직접 goto 후엔 state 가 없어 기본 목록으로 감 — 정상)
        await p.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}); await p.waitForTimeout(800);
        const link2 = p.locator(c.link).first(); if (await link2.count()) { await link2.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1500);
          const back = p.getByRole('link', { name: c.listRe || /목록/ }).first();
          if (await back.count()) { await back.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1500); ok(S, `${L} 상세 → 목록보기 복귀${filtered ? ' (필터 유지)' : ''}`, p.url().split('?')[0] === listUrl.split('?')[0] && (!filtered || /[?&]resort=/.test(p.url())), p.url().replace(BASE, '')); }
          else { await p.goBack().catch(() => {}); await p.waitForTimeout(1200); ok(S, `${L} 상세 → 뒤로가기 복귀`, p.url().split('?')[0] === listUrl.split('?')[0], p.url().replace(BASE, '')); } }
        ok(S, `${L} 상세 흐름 오류 없음`, bag.length === bs, bag.slice(bs).join(' | ')); }
      ok(S, `${L} 전체 오류 없음`, bag.length === b0, bag.slice(b0).join(' | ')); }
    for (const sub of ['/community/ski', '/community/board', '/community?category=poll', '/community?category=notice', '/community?group=g_info', '/community?group=g_jobs']) { const bs = bag.length; const st = await go(p, sub, 1200); ok(S, `커뮤니티 ${sub}`, st === 'ok' && bag.length === bs, bag.slice(bs).join(' | ')); }
    for (const r of ['하이원', '용평', '휘닉스평창', '비발디파크', '곤지암', '웰리힐리파크', '지산', '엘리시안강촌', '오투', '무주덕유산', '에덴밸리', '알펜시아']) { const bs = bag.length; const st = await go(p, `/resort/${encodeURIComponent(r)}`, 1200); let seen = new RegExp(r.slice(0, 2)).test(await text(p)); for (let i = 0; i < 6 && !seen; i++) { await p.waitForTimeout(500); seen = new RegExp(r.slice(0, 2)).test(await text(p)); } ok(S, `스키장 페이지 ${r}`, st === 'ok' && bag.length === bs && seen, `${st} ${bag.slice(bs).join(' | ')}`); }
    for (const r of ['/about', '/advertise', '/help', '/safe-trade', '/terms', '/privacy', '/account-deletion', '/partners', '/login', '/forgot-password']) { const bs = bag.length; const st = await go(p, r, 900); ok(S, `정보 페이지 ${r}`, st === 'ok' && bag.length === bs, `${st} ${bag.slice(bs).join(' | ')}`); }
    await go(p, '/privacy', 900); ok(S, '개인정보처리방침에 재가입 제한·로그인 기록 조항', /재가입 제한/.test(await text(p)) && /로그인 기록/.test(await text(p)));
    await ctx.close(); }
  { const ctx = await mk(); const p = await ctx.newPage(); const bag = track(p); let S = '3.채팅';
    ok(S, '일반 유저 로그인', await login(p, process.env.U_EMAIL, process.env.U_PW)); const b30 = bag.length;
    ok(S, '채팅 목록 열림', (await go(p, '/chat/rooms', 1500)) === 'ok'); await pressAllButtons(p, S, '채팅 목록', bag, { max: 12, homeUrl: BASE + '/chat/rooms' }); await go(p, '/chat/rooms', 1000);
    const room = p.locator('main a[href^="/chat/"]:not([href="/chat/rooms"])').first();
    if (await room.count()) { await room.click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(2000); const tt = await text(p); ok(S, '첫 채팅방 열림', /\/chat\/[0-9a-f-]{36}/.test(p.url()) && !isErrScreen(tt), p.url().replace(BASE, '')); ok(S, '채팅 입력창 있음', await p.locator('textarea').count() > 0); await pressAllButtons(p, S, '채팅방', bag, { max: 12, homeUrl: p.url() }); }
    else ok(S, '채팅방 목록에 방 있음 (숨긴 방은 새 메시지 전까지 안 보임 — 정상)', true);
    await go(p, '/mypage/support', 1000); const cs = p.getByText('관리자에게 1:1 채팅').first(); ok(S, '고객센터 1:1 채팅 버튼', await cs.count() > 0);
    if (await cs.count()) { await cs.click({ timeout: 4000 }).catch(() => {}); await p.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(2500);
      ok(S, '고객센터 방 진입 + 안내 메뉴', /\/chat\/[0-9a-f-]{36}/.test(p.url()) && /어떤 도움이 필요하신가요/.test(await text(p)));
      let connected = false; for (let i = 0; i < 30; i++) { if (/연결됨/.test(await text(p))) { connected = true; break; } await p.waitForTimeout(300); } ok(S, '소켓 연결됨', connected);
      const catNames = await p.evaluate(() => { const box = Array.from(document.querySelectorAll('div')).find((d) => d.textContent && d.textContent.startsWith('어떤 도움이 필요하신가요') && d.querySelector('button')); return box ? Array.from(box.querySelectorAll('button')).map((b) => b.textContent.trim()).filter((x) => x && !/접기|메뉴 열기|뒤로/.test(x)) : []; });
      ok(S, `안내 메뉴 카테고리 ${catNames.length}개`, catNames.length >= 3, catNames.join(','));
      // 안내 메뉴 전수(모든 카테고리 > 소분류 > 자동답변)는 guide_test.cjs 에서 검사
      const bs = bag.length; await p.locator('textarea').first().fill(`전체검사 메시지 ${Date.now().toString().slice(-5)}`); await p.getByRole('button', { name: '전송' }).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(2000);
      ok(S, '고객센터 메시지 전송 오류 없음', bag.length === bs && /전체검사 메시지/.test(await text(p)), bag.slice(bs).join(' | '));
      ok(S, '채팅방 차단 버튼 없음(고객센터 방)', !/^차단$/m.test(await text(p))); }
    ok(S, '채팅 전체 오류 없음', bag.length === b30, bag.slice(b30).join(' | '));
    S = '4.알림'; const b40 = bag.length; const stN = await go(p, '/notifications', 2000); ok(S, '알림 페이지 열림', stN === 'ok', stN + ' ' + (await text(p)).replace(/\s+/g, ' ').slice(0, 100)); await shot(p, 'notifications_user');
    await pressAllButtons(p, S, '알림', bag, { max: 15, homeUrl: BASE + '/notifications' }); await go(p, '/notifications', 1000);
    const readAll = p.getByRole('button', { name: /모두 읽음/ }).first(); if (await readAll.count()) { const bs = bag.length; await readAll.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1500); ok(S, '모두 읽음 처리 오류 없음', bag.length === bs && !isErrScreen(await text(p)), bag.slice(bs).join(' | ')); }
    await go(p, '/notifications', 1000); const first = p.locator('main a[href^="/"], main button').filter({ hasNotText: /모두 읽음|삭제/ }).first(); if (await first.count()) { const bs = bag.length; await first.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1800); ok(S, '첫 알림 클릭 → 이동 오류 없음', bag.length === bs && !isErrScreen(await text(p)), `${p.url().replace(BASE, '')} ${bag.slice(bs).join(' | ')}`); }
    ok(S, '알림 전체 오류 없음', bag.length === b40, bag.slice(b40).join(' | '));
    S = '5.알람'; const b50 = bag.length; ok(S, '키워드 알림 페이지', (await go(p, '/mypage/keywords', 1200)) === 'ok'); const kw = `점검${Date.now().toString().slice(-4)}`; const kin = p.locator('input:visible').first();
    if (await kin.count()) { await kin.fill(kw); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); let tt = await text(p); if (!tt.includes(kw)) { await p.getByRole('button', { name: /추가|등록/ }).first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(1500); tt = await text(p); } ok(S, `키워드 "${kw}" 추가됨`, tt.includes(kw));
      const row = p.locator('li, div').filter({ hasText: kw }).last(); const del = row.getByRole('button', { name: /삭제|제거|X|×/ }).first();
      if (await del.count()) { await del.click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(1500); ok(S, `키워드 "${kw}" 삭제됨`, !(await text(p)).includes(kw)); } else { const anyDel = p.getByRole('button', { name: /삭제|제거/ }); ok(S, '키워드 삭제 버튼 존재', await anyDel.count() > 0); if (await anyDel.count()) { await anyDel.last().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(1500); ok(S, `키워드 "${kw}" 삭제됨`, !(await text(p)).includes(kw)); } } }
    else ok(S, '키워드 입력창 존재', false);
    ok(S, '알람 전체 오류 없음', bag.length === b50, bag.slice(b50).join(' | '));
    S = '6.검색'; const b60 = bag.length; ok(S, '검색 페이지', (await go(p, '/search', 1200)) === 'ok'); const sin = p.locator('input[type="search"]:visible, input[placeholder*="검색"]:visible, input:visible').first(); ok(S, '검색 입력창', await sin.count() > 0);
    for (const q of ['부츠', '용평', '렌탈', '강습', 'ㅋㅋ', '']) { const bs = bag.length; await sin.fill(q); await p.keyboard.press('Enter'); await p.waitForTimeout(2000); ok(S, `검색 "${q || '(빈값)'}" 오류 없음`, !isErrScreen(await text(p)) && bag.length === bs, bag.slice(bs).join(' | ')); }
    await go(p, '/search?q=%EB%B6%80%EC%B8%A0', 1500); await pressAllButtons(p, S, '검색 결과 탭', bag, { max: 20, homeUrl: BASE + '/search?q=%EB%B6%80%EC%B8%A0' }); 
    ok(S, '검색 전체 오류 없음', bag.length === b60, bag.slice(b60).join(' | '));
    S = '7.마이'; const b70 = bag.length; ok(S, '마이페이지 열림', (await go(p, '/mypage', 1500)) === 'ok');
    const myLinks = await p.evaluate(() => Array.from(document.querySelectorAll('a[href^="/"]')).map((a) => a.getAttribute('href')).filter((h, i, arr) => arr.indexOf(h) === i));
    const must = ['/mypage/edit', '/mypage/sales', '/mypage/wishlist', '/mypage/keywords', '/mypage/blocks', '/mypage/recent', '/chat/rooms', '/mypage/posts', '/mypage/shops', '/mypage/ads', '/mypage/password', '/mypage/terms', '/mypage/support', '/notifications', '/help', '/privacy', '/safe-trade'];
    for (const h of Array.from(new Set([...myLinks, ...must]))) { if (/^\/(login|logout)/.test(h)) continue; const bs = bag.length; const st = await go(p, h, 1000); ok(S, `마이 ${h}`, st === 'ok' && bag.length === bs && !/\/login/.test(p.url()), `${st} ${p.url().replace(BASE, '')} ${bag.slice(bs).join(' | ')}`);
      if (st === 'ok' && /^\/mypage\/(sales|wishlist|posts|recent|shops|ads|support|blocks)/.test(h)) await pressAllButtons(p, S, `마이 ${h}`, bag, { max: 12, homeUrl: BASE + h }); }
    await go(p, '/mypage', 1200); await p.getByRole('button', { name: '회원 탈퇴' }).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(600); const dt = await text(p);
    ok(S, '탈퇴 안내: 게시물 삭제·90일 재가입 제한·채팅 유지 문구', /모두 삭제됨/.test(dt) && /90일/.test(dt) && /익명으로 남음/.test(dt)); await p.getByRole('button', { name: '취소' }).first().click({ timeout: 2000 }).catch(() => {});
    await go(p, '/mypage/edit', 1000); ok(S, '프로필 수정 입력창', await p.locator('input:visible').count() > 0);
    await go(p, '/used', 1200); const usedLink = p.locator('a[href^="/used/"]:not([href$="register"])').first();
    if (await usedLink.count()) { await usedLink.click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(1500); const wish = p.getByRole('button', { name: /찜|관심|하트|wishlist/i }).first();
      if (await wish.count()) { const bs = bag.length; await wish.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1200); await go(p, '/mypage/wishlist', 1200); const t1 = await text(p); await p.goBack().catch(() => {}); await p.waitForTimeout(1200); await p.getByRole('button', { name: /찜|관심|하트|wishlist/i }).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1200); ok(S, '찜 추가 → 찜 목록 → 찜 해제 왕복 오류 없음', bag.length === bs, `${t1.replace(/\s+/g, ' ').slice(0, 80)} ${bag.slice(bs).join(' | ')}`); } else ok(S, '중고 상세 찜 버튼 존재', false); }
    for (const r of ['/used/register', '/skishop/register', '/repair/register', '/rental/register', '/lesson/register', '/accommodation/register', '/overseas/agency/register', '/community/write', '/community/write?category=poll', '/ad-booking', '/partners/find']) { const bs = bag.length; const st = await go(p, r, 1000); ok(S, `등록/신청 화면 ${r}`, st === 'ok' && bag.length === bs && (await p.locator('input:visible, textarea:visible, select:visible, button:visible, a[href]:visible').count()) > 0, `${st} ${bag.slice(bs).join(' | ')}`); }
    await go(p, '/community/write', 1000); ok(S, '글쓰기 협찬 안내 문구', /쿠팡 파트너스/.test(await text(p)));
    await go(p, '/ad-booking', 1500); await pressAllButtons(p, S, '광고 신청', bag, { max: 25, homeUrl: BASE + '/ad-booking' });
    ok(S, '마이 전체 오류 없음', bag.length === b70, bag.slice(b70).join(' | ')); await go(p, '/admin', 1200); ok(S, '일반 유저 /admin 차단', !/승인관리|유저관리/.test(await text(p))); await ctx.close(); }
  { const ctx = await mk(); const p = await ctx.newPage(); const bag = track(p); const S = '9.관리자';
    ok(S, '관리자 로그인', await login(p, process.env.A_EMAIL, process.env.A_PW)); ok(S, '대시보드 열림', (await go(p, '/admin', 2000)) === 'ok');
    for (const tab of ['승인관리', '신고관리', '통계', '유저관리', '광고관리', '매장 관리', '설정']) { const bs = bag.length; const b = p.getByRole('button', { name: tab, exact: true }).first(); if (await b.count() === 0) { ok(S, `탭 "${tab}" 존재`, false); continue; }
      await b.click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(1500); ok(S, `탭 "${tab}" 오류 없음`, !isErrScreen(await text(p)) && bag.length === bs, bag.slice(bs).join(' | '));
      if (tab === '유저관리') { const lb = p.getByRole('button', { name: '로그인 기록' }).first(); if (await lb.count()) { const b1 = bag.length; await lb.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(2000); const tt = await text(p); ok(S, '유저관리 로그인 기록 패널', /최근 로그인/.test(tt) && /같은 IP/.test(tt) && bag.length === b1, bag.slice(b1).join(' | ')); } else ok(S, '유저관리 로그인 기록 버튼', false); }
      await pressAllButtons(p, S, `관리자 ${tab}`, bag, { max: 20, homeUrl: BASE + '/admin' }); await go(p, '/admin', 1000); await p.getByRole('button', { name: tab, exact: true }).first().click({ timeout: 3000 }).catch(() => {}); }
    await go(p, '/admin', 1500); await p.getByRole('button', { name: '설정', exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1500); ok(S, '설정 탭 인스타그램 연결 표시', /인스타그램/.test(await text(p)) && /snowpan/.test(await text(p)));
    ok(S, '관리자 알림 페이지', (await go(p, '/notifications', 1500)) === 'ok'); ok(S, '관리자 채팅 목록', (await go(p, '/chat/rooms', 1500)) === 'ok'); ok(S, '관리자 내 광고', (await go(p, '/mypage/ads', 1500)) === 'ok');
    await go(p, '/admin', 1500); await p.getByRole('button', { name: '승인관리', exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1500);
    const rej = p.getByRole('button', { name: /^거부$|^반려$/ }).first(); if (await rej.count()) { p.once('dialog', (d) => d.dismiss()); await rej.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(800); const tt = await text(p); ok(S, '승인관리 거부 → 사유 입력창', /사유/.test(tt)); await p.getByRole('button', { name: /취소|닫기/ }).first().click({ timeout: 2000 }).catch(() => {}); await p.keyboard.press('Escape').catch(() => {}); } else ok(S, '승인관리: 대기 항목 없음 (거부 사유 UI는 E2E 로 검증)', true);
    ok(S, '관리자 전체 오류 없음', bag.length === 0, bag.join(' | ')); await ctx.close(); }
  await browser.close(); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  const fails = results.filter((r) => !r.ok); console.log(`\n===== 전체검사: ${results.length - fails.length}/${results.length} OK, ${fails.length} FAIL =====`); for (const f of fails) console.log(`FAIL [${f.section}] ${f.name} -- ${String(f.extra).slice(0, 400)}`); process.exit(fails.length ? 2 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
