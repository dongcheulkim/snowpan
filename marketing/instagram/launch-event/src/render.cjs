// 스노우판 릴스 렌더러 — 앱 화면을 프레임 단위로 찍어 stage.html 에 합성 → jpg 시퀀스 → ffmpeg mp4
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const FPS = 25, BASE = 'https://snowpan.kr';
const OUTDIR = process.argv[3] || path.join(__dirname, 'out'); fs.mkdirSync(OUTDIR, { recursive: true });
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ease = k => k < .5 ? 2*k*k : -1 + (4-2*k)*k, clamp = (v,a,b) => Math.max(a, Math.min(b, v)), lerp = (a,b,k) => a + (b-a)*k;
const io = (t, a, b) => clamp((t - a) / (b - a), 0, 1); // 0→1 between a..b
const S = 760/390, toStage = (x, y) => ({ x: 160 + x*S, y: 500 + y*S });
const tapAt = (t, t0, box) => { if (t < t0 || t > t0 + .45) return null; const k = (t - t0)/.45; const c = toStage(box.x + box.width/2, box.y + box.height/2); return { ...c, scale: lerp(.6, 1.4, k), alpha: 1 - k }; };
const typed = (t, a, b, s) => t < a ? '' : s.slice(0, Math.round(s.length * io(t, a, b)));

let browser, app, stage, shotCache = new Map(), shotKey = '';
async function appPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA, locale: 'ko-KR' });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent-v1', 'essential'); localStorage.setItem('pwa-install-dismissed', '1'); localStorage.setItem('snowpan.appCardDismissed', String(Date.now())); } catch {} });
  return ctx.newPage();
}
async function goto(u, waitSel) { shotKey = ''; await app.goto(BASE + u, { waitUntil: 'load', timeout: 60000 }); if (waitSel) await app.waitForSelector(waitSel, { timeout: 30000 }); await app.waitForTimeout(900); }
async function click(sel) { shotKey = ''; const l = typeof sel === 'string' ? app.locator(sel).first() : sel; await l.click(); await app.waitForTimeout(900); }
async function box(sel) { const b = await (typeof sel === 'string' ? app.locator(sel).first() : sel).boundingBox(); return b || { x: 195, y: 346, width: 0, height: 0 }; }
async function shot(scrollY) {
  const key = app.url() + '#' + Math.round(scrollY);
  if (key === shotKey) return shotCache.get('last');
  await app.evaluate(y => window.scrollTo(0, y), scrollY);
  await app.waitForTimeout(40);
  const buf = await app.screenshot({ type: 'jpeg', quality: 88 });
  const d = 'data:image/jpeg;base64,' + buf.toString('base64'); shotKey = key; shotCache.set('last', d); return d;
}
async function renderReel(name, segments) {
  const dir = path.join(__dirname, 'frames_' + name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  let n = 0, t0 = 0;
  for (const seg of segments) {
    if (seg.prep) { try { await seg.prep(); } catch (e) { console.log('PREP FAIL', name, app.url(), e.message.slice(0,80)); throw e; } }
    const frames = Math.round(seg.dur * FPS);
    for (let i = 0; i < frames; i++) {
      const t = i / FPS; const st = await seg.frame(t);
      const f = seg.fade === false ? 0 : Math.max(1 - io(t, 0, .12), io(t, seg.dur - .12, seg.dur)); // 컷 전후 짧은 페이드
      st.fade = Math.max(st.fade || 0, f);
      await stage.evaluate(s => window.render(s), st);
      await stage.screenshot({ type: 'jpeg', quality: 92, path: path.join(dir, String(n++).padStart(5, '0') + '.jpg') });
    }
    t0 += seg.dur; process.stdout.write(`  ${name}: ${t0.toFixed(1)}s\n`);
  }
  const out = path.join(OUTDIR, name + '.mp4');
  execSync(`ffmpeg -hide_banner -loglevel error -y -framerate ${FPS} -i "${dir}/%05d.jpg" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart "${out}"`);
  fs.rmSync(dir, { recursive: true, force: true }); console.log('OK', out);
}
// ---------- 공통 세그먼트 ----------
const bigTitle = (dur, big, extra = {}) => ({ dur, frame: async t => ({ photo: extra.photo ?? .9, red: extra.red ?? 0, chrome: true, big: { ...big, scale: lerp(1.12, 1, ease(io(t, 0, .6))), alpha: io(t, 0, .35) } }) });
const prizeSeg = (dur, headline, kicker, stagger = .8, photo = .35) => ({ dur, frame: async t => ({ photo, kicker, headline, prizes: [0,1,2,3,4].map(i => { const k = ease(io(t, .2 + i*stagger, .2 + i*stagger + .5)); return { alpha: k, y: lerp(90, 0, k) }; }) }) });
const formSeg = (dur, headline, sub, kicker, speed = 1) => ({ dur, frame: async t => { const u = t * speed; const name = typed(u, .2, .9, '김민준'), phone = typed(u, 1.0, 1.9, '010-1234-5678'), insta = typed(u, 2.0, 2.8, '@minjun_ski'); const focus = u < 1 ? 1 : u < 2 ? 2 : u < 2.9 ? 3 : 0; const press = u > 3.05 && u < 3.3; const done = u >= 3.35; const b = { x: 160 + 380, y: 500 + 1210 }; return { photo: .25, kicker, headline, sub, form: { name, phone, insta, msg: '', focus, press, done }, tap: u > 2.95 && u < 3.4 ? { ...b, scale: lerp(.6, 1.4, io(u, 2.95, 3.4)), alpha: 1 - io(u, 2.95, 3.4) } : null }; } });
const endSeg = (dur, t, photo = .9) => ({ dur, frame: async tt => ({ photo, chrome: false, end: { t, scale: lerp(1.06, 1, ease(io(tt, 0, .7))), alpha: io(tt, 0, .4) } }) });
const appSeg = (dur, { prep, kicker, headline, sub, scroll = [[0, 0, 0, 0]], taps = [] }) => ({ dur, prep, frame: async t => {
  let y = 0; for (const [a, b, y0, y1] of scroll) { if (t >= a) y = lerp(y0, y1, ease(io(t, a, b))); }
  let tap = null; for (const tp of taps) { if (t >= tp.at && t < tp.at + .45 && !tp.box) tp.box = await box(tp.sel); if (tp.box) { const r = tapAt(t, tp.at, tp.box); if (r) tap = r; } if (tp.clickAt !== undefined && t >= tp.clickAt && !tp.done) { tp.done = true; await click(tp.sel); } }
  return { photo: .25, kicker, headline, sub, phoneImg: await shot(y), tap };
} });
// ---------- 릴스 정의 ----------
const REELS = {
  reel1_prizes: () => [
    bigTitle(1.6, { n: '20명', t: '정비·왁싱권\n공짜로 받는 법', s: '스노우판 앱 출시 기념' }),
    prizeSeg(5.6, '스노우메타 제공\n총 20명에게', '앱 출시 기념 이벤트'),
    appSeg(2.2, { prep: () => goto('/', 'a[href="/event/launch"]'), kicker: '10월 25일까지', headline: '신청은 30초', sub: '스노우판 앱 또는 snowpan.kr', taps: [{ sel: 'a[href="/event/launch"]', at: 1.0 }] }),
    appSeg(3.2, { prep: () => goto('/event/launch', 'text=경품 안내'), kicker: '10월 25일까지', headline: '신청은 30초', sub: '스노우판 앱 또는 snowpan.kr', scroll: [[0.6, 2.4, 0, 700]] }),
    formSeg(4.2, '이름·연락처·인스타만', '로그인은 카카오·애플로 한 번', '신청 화면'),
    endSeg(3.2, '10월 25일 마감\n추첨 10월 27일 밤 9시\n당첨 발표는 @snowpan.kr'),
  ],
  reel2_tour: () => [
    bigTitle(1.7, { t: '스키장 가기 전\n여는 앱 하나', s: '26/27 시즌, 준비됐어요?' }),
    appSeg(5.6, { prep: () => goto('/rental', 'text=가격 낮은 순'), kicker: '렌탈샵', headline: '전국 렌탈샵 369곳\n가격 한눈에', sub: '지역·리조트별로, 낮은 가격순',
      taps: [{ sel: 'text="경기"', at: .7, clickAt: .95 }, { sel: 'text="곤지암리조트"', at: 1.8, clickAt: 2.05 }, { sel: 'text="가격 낮은 순"', at: 2.9, clickAt: 3.15 }], scroll: [[3.9, 5.4, 0, 420]] }),
    appSeg(4.5, { prep: () => goto('/repair/88a519c8-9e42-41a1-8261-8f0fbf507f91', 'text=채팅 문의'), kicker: '사장님 인증 매장', headline: '전화 없이\n채팅으로 예약·문의', sub: '방문 예약 버튼 한 번이면 끝', scroll: [[.8, 3.6, 0, 400]] }),
    appSeg(2.2, { prep: () => goto('/webcam', 'a[href^="/webcam/"]'), kicker: '실시간 웹캠', headline: '지금 슬로프 상태는?', sub: '국내 스키장 웹캠 한곳에', taps: [{ sel: 'a[href^="/webcam/"]', at: 1.0 }] }),
    appSeg(3.0, { prep: async () => { await click('a[href^="/webcam/"]'); await app.waitForTimeout(2500); }, kicker: '실시간 웹캠', headline: '지금 슬로프 상태는?', sub: '국내 스키장 웹캠 한곳에', scroll: [[1.4, 2.6, 0, 260]] }),
    appSeg(3.4, { prep: () => goto('/used', 'a[href^="/used/"]:not([href$="/register"])'), kicker: '중고장비', headline: '중고 장비 거래까지', sub: '시즌권·스키·보드·부츠', scroll: [[.5, 3.0, 0, 1300]] }),
    endSeg(3.4, '지금 가입하면\n정비·왁싱권 이벤트까지\n10월 25일 마감'),
  ],
  reel3_d3: () => [
    bigTitle(1.6, { n: 'D-3', t: '아직 안 하셨어요?', s: '정비·왁싱권 20명 이벤트', color: '#fff' }, { photo: 0, red: 1 }),
    prizeSeg(3.6, '20명 중 한 명\n마지막 3일', '스노우메타 제공', .42, .3),
    appSeg(2.4, { prep: () => goto('/event/launch', 'text=경품 안내'), kicker: '10월 25일 23시 59분 마감', headline: '신청 30초', sub: '스노우판 앱 또는 snowpan.kr', scroll: [[.3, 2.0, 0, 700]] }),
    formSeg(3.4, '카카오 로그인 한 번', '이름·연락처·인스타만 적으면 끝', '신청 화면', 1.25),
    endSeg(3.2, '10월 25일 23:59 마감\n발표 27일 밤 9시\n@snowpan.kr'),
  ],
  reel3_d1: () => [
    bigTitle(1.6, { n: 'D-1', t: '오늘 밤 12시 마감', s: '정비·왁싱권 20명 이벤트' }, { photo: 0, red: 1 }),
    prizeSeg(3.6, '20명 중 한 명\n마지막 하루', '스노우메타 제공', .42, .3),
    appSeg(2.4, { prep: () => goto('/event/launch', 'text=경품 안내'), kicker: '오늘 23시 59분 마감', headline: '신청 30초', sub: '스노우판 앱 또는 snowpan.kr', scroll: [[.3, 2.0, 0, 700]] }),
    formSeg(3.4, '카카오 로그인 한 번', '이름·연락처·인스타만 적으면 끝', '신청 화면', 1.25),
    endSeg(3.2, '오늘 밤 12시 마감\n발표 27일 밤 9시\n@snowpan.kr'),
  ],
};
// ---------- 스틸(카드·스토리) ----------
async function stills() {
  const dir = path.join(OUTDIR, 'stills'); fs.mkdirSync(dir, { recursive: true });
  const full = [0,1,2,3,4].map(() => ({ alpha: 1, y: 0 }));
  await stage.setViewportSize({ width: 1080, height: 1350 }); await stage.evaluate(() => document.body.classList.add('card'));
  await stage.evaluate(s => window.render(s), { photo: .35, kicker: '앱 출시 기념 이벤트 · 10월 25일까지', headline: '정비·왁싱권\n총 20명에게', prizes: full });
  await stage.screenshot({ type: 'png', path: path.join(dir, 'card_prizes_4x5.png'), clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  await stage.evaluate(s => window.render(s), { photo: .35, kicker: '신청 방법', headline: '신청은 30초', sub: '1. 스노우판 앱 또는 snowpan.kr 접속\n2. 카카오·애플 로그인\n3. 이름·연락처·인스타 입력\n\n추첨 10월 27일 밤 9시, 발표 @snowpan.kr', prizes: null });
  await stage.screenshot({ type: 'png', path: path.join(dir, 'card_howto_4x5.png'), clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  await stage.evaluate(() => document.body.classList.remove('card')); await stage.setViewportSize({ width: 1080, height: 1920 });
  for (let d = 16; d >= 1; d--) {
    await stage.evaluate(s => window.render(s), { photo: d <= 3 ? 0 : .85, red: d <= 3 ? 1 : 0, big: { n: `D-${d}`, t: '정비·왁싱권 20명\n앱 출시 이벤트', s: d === 1 ? '오늘 밤 12시 마감 · 신청은 아래 링크' : '10월 25일 마감 · 신청은 아래 링크' } });
    await stage.screenshot({ type: 'png', path: path.join(dir, `story_D-${String(d).padStart(2, '0')}.png`) });
  }
  await stage.evaluate(s => window.render(s), { photo: .85, chrome: false, end: { t: '당첨자 발표\n10월 27일 밤 9시' } });
  await stage.screenshot({ type: 'png', path: path.join(dir, 'story_announce.png') });
  console.log('OK stills');
}
(async () => {
  browser = await chromium.launch();
  app = await appPage();
  const sctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  stage = await sctx.newPage(); await stage.goto('file://' + path.join(__dirname, 'stage.html')); await stage.waitForTimeout(500);
  const which = (process.argv[2] || 'all').split(',');
  for (const name of Object.keys(REELS)) if (which.includes('all') || which.includes(name)) await renderReel(name, REELS[name]());
  if (which.includes('all') || which.includes('stills')) await stills();
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
