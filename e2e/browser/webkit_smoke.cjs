// WebKit(사파리 엔진) 스모크 — 아이폰 사용자 화면. 주요 경로가 렌더되고 핵심 문구가 있는지, 페이지 오류·가로 스크롤 없는지.
const { webkit } = require('/Users/jason/bada-now/node_modules/playwright');
const BASE = process.env.BASE || 'https://snowpan.kr';
const ROUTES = [
  ['/', /스키장 근처 매장/], ['/skishop', /스키·보드샵|스키샵/], ['/repair', /정비/], ['/rental', /렌탈/], ['/lessons', /레슨|강습/], ['/accommodations', /숙소/],
  ['/used', /중고/], ['/community', /커뮤니티/], ['/webcam', /캠/], ['/search?q=%EC%8A%A4%ED%82%A4', /스키/], ['/partners', /입점/], ['/partners/guide', /이용 안내/],
  ['/advertise', /광고/], ['/help', /도움|문의/], ['/login', /로그인/], ['/privacy', /개인정보/], ['/resort/%ED%95%98%EC%9D%B4%EC%9B%90', /하이원/],
];
(async () => {
  const b = await webkit.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  let ok = 0, fail = 0;
  for (const [r, re] of ROUTES) {
    const errs = []; const h = (e) => errs.push(e.message); p.on('pageerror', h);
    try {
      await p.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45000 }); await p.waitForTimeout(700);
      const t = (await p.evaluate(() => document.body.innerText)) || ''; // style 태그 문자열 제외, 보이는 글자만
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      const pass = re.test(t) && sw <= 390 && errs.length === 0;
      if (pass) ok++; else { fail++; console.log(`FAIL ${r} -- ${!re.test(t) ? '문구 없음' : ''} ${sw > 390 ? '가로 ' + sw : ''} ${errs.slice(0, 2).join(';')}`); }
    } catch (e) { fail++; console.log(`FAIL ${r} -- ${e.message.slice(0, 80)}`); }
    p.off('pageerror', h);
  }
  console.log(`== webkit_smoke ok=${ok} fail=${fail}`);
  await b.close(); process.exit(fail ? 2 : 0);
})();
