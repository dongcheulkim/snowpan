// 포스터 → 키네틱 릴스 (2026-10-15, "지루하다" 피드백 반영): 문장마다 컷이 바뀌고, 말하는 단어가 큰 글자로 켜지고,
// 포스터는 핵심 부분을 빠르게 확대해 보여준다. 입력 spec 은 narrate.cjs 와 같은 형식 (slides[].img, slides[].lines, endText, endLine).
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const FPS = 25, GAP = Number(process.env.GAP || 0.12), END_SEC = Number(process.env.END_SEC || 1.8);
const VOICE = process.env.VOICE || 'none', RATE = process.env.RATE || '+12%';
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3] || path.join(__dirname, 'out_k'); fs.mkdirSync(OUT, { recursive: true });
const work = path.join(__dirname, 'kwork_' + spec.id); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work);
const dur = (f) => Number(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim());
const ease = (k) => k < .5 ? 2*k*k : -1 + (4-2*k)*k; const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const tts = (text, base) => { const f = base + '.mp3'; execSync(`python3 -m edge_tts --voice ${VOICE} --rate=${RATE} --text ${JSON.stringify(text)} --write-media "${f}"`, { stdio: 'pipe' }); return f; };
// 문장 → 단어 (줄바꿈은 글자 수 기준 14자 안팎), 숫자·키워드 색
const KEYS = /(스노우판|무료|0원|수수료|할인|필수|추천|주의|꿀팁|자격증|레벨|티칭|예약|무투|시즌권|하드쉘|소프트쉘|인슐레이티드|왁싱|정비)/;
function wordsOf(line) {
  const raw = line.replace(/[.?!]$/, '').split(/\s+/).filter(Boolean);
  const out = []; let len = 0;
  raw.forEach((w, idx) => { const lastShort = idx === raw.length - 1 && w.length <= 2; if (len + w.length > 13 && len > 0 && !lastShort) { out.push({ t: '\n' }); len = 0; } out.push({ t: w, cls: /\d/.test(w) ? 'num' : KEYS.test(w) ? 'key' : '' }); len += w.length + 1; });
  return out;
}
(async () => {
  // 1) 음성 타임라인
  // 음성 없음(사장님 결정 2026-10-15 "음성 빼자") — 문장 길이로 읽기 시간을 정한다. VOICE=none 이 기본, 음성이 필요하면 VOICE=ko-KR-SunHiNeural
  const SILENT = (process.env.VOICE || 'none') === 'none';
  const readSec = (line) => clamp(0.55 + 0.11 * line.replace(/\s/g, '').length, 1.0, 2.2); // 빠르게 (사장님 2026-10-15 "더 짧고 빠르게")
  const timeline = []; let t = 0.25; const parts = [];
  spec.slides.forEach((sl, si) => sl.lines.forEach((line, li) => { let d; if (SILENT) d = readSec(line); else { const f = tts(line, path.join(work, `s${si}_${li}`)); d = dur(f); parts.push({ f, at: t }); } timeline.push({ si, li, line, start: t, end: t + d, words: wordsOf(line) }); t += d + GAP; }));
  const endStart = t + 0.15; let total = endStart + END_SEC;
  if (!SILENT && spec.endLine) { const f = tts(spec.endLine, path.join(work, 'end')); parts.push({ f, at: endStart + 0.25 }); total = Math.max(total, endStart + 0.25 + dur(f) + 0.5); }
  if (parts.length) {
    const inputs = parts.map((p) => `-i "${p.f}"`).join(' ');
    const delays = parts.map((p, i) => `[${i + 1}:a]adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[a${i}]`).join(';');
    execSync(`ffmpeg -hide_banner -loglevel error -y -f lavfi -t ${total.toFixed(2)} -i anullsrc=r=44100:cl=stereo ${inputs} -filter_complex "${delays};[0:a]${parts.map((_, i) => `[a${i}]`).join('')}amix=inputs=${parts.length + 1}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" -c:a aac -b:a 160k "${work}/audio.m4a"`);
  } else {
    // 무음 트랙(플랫폼 호환용) — 올릴 때 앱에서 음악을 입힌다
    execSync(`ffmpeg -hide_banner -loglevel error -y -f lavfi -t ${total.toFixed(2)} -i anullsrc=r=44100:cl=stereo -c:a aac -b:a 64k "${work}/audio.m4a"`);
  }
  // 2) 샷 배정 — 문장마다 한 컷. 종류: hook(첫 문장, 사진 배경), text(흐린 포스터 배경 + 큰 글자), punch(포스터 확대 패닝 + 아래쪽 글자), close(마지막, 사진 배경)
  const n = timeline.length; const slideCount = spec.slides.length;
  timeline.forEach((x, i) => {
    const firstOfSlide = i === 0 || timeline[i - 1].si !== x.si;
    if (i === 0) x.shot = 'hook'; else if (i === n - 1) x.shot = 'close';
    else if (firstOfSlide && x.si > 0 && x.si < slideCount - 1) x.shot = 'punch'; // 새 슬라이드 첫 문장은 포스터를 보여준다
    else x.shot = (i % 3 === 2) ? 'punch' : 'text';
    x.dir = i % 2 ? -1 : 1;
  });
  // 3) 프레임
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await page.goto('file://' + path.join(__dirname, 'kstage.html')); await page.waitForTimeout(300);
  const frames = Math.ceil(total * FPS); const fdir = path.join(work, 'f'); fs.mkdirSync(fdir);
  const lastImg = spec.slides[slideCount - 1].img, firstImg = spec.slides[0].img;
  for (let i = 0; i < frames; i++) {
    const tt = i / FPS; const st = { progress: clamp(tt / endStart, 0, 1) };
    let cur = timeline.find((x) => tt >= x.start - 0.12 && tt < x.end + GAP); if (!cur && tt < endStart) cur = timeline[timeline.length - 1];
    if (cur && tt < endStart) {
      const sStart = cur.start - 0.12, sLen = (cur.end + GAP) - sStart, k = clamp((tt - sStart) / sLen, 0, 1); const punch = 1 + 0.1 * (1 - ease(clamp((tt - sStart) / 0.2, 0, 1)));
      // 단어 상태 — 문장 길이에 글자 수 비례 배분
      const chars = cur.words.filter((w) => w.t !== "\n").reduce((a, w) => a + w.t.length, 0); let acc = 0;
      st.words = cur.words.map((w) => { if (w.t === '\n') return w; const ws = cur.start + (acc / chars) * (cur.end - cur.start); acc += w.t.length; const we = cur.start + (acc / chars) * (cur.end - cur.start); return { ...w, state: tt >= we ? 'said' : tt >= ws ? 'on' : '' }; });
      st.cam = punch; st.flash = i > 0 && tt - sStart < 0.08 ? 0.18 : 0;
      const img = spec.slides[cur.si].img;
      if (cur.shot === 'hook' || cur.shot === 'close') { st.bg = cur.shot === 'hook' ? firstImg : lastImg; st.bgZoom = 1.08 + 0.1 * k; st.bgX = cur.dir * 14 * k; st.bgY = -10 * k; st.bgBlur = 0; st.bgBright = .85; st.shade = 1; st.kicker = cur.shot === 'hook' ? (spec.kicker || 'SNOWPAN') : ''; st.low = false; }
      else if (cur.shot === 'punch') { st.bg = firstImg; st.bgZoom = 1.15; st.bgBlur = 28; st.bgBright = .35; st.shade = .55; st.poster = img; st.posterZoom = 0.9 + 0.05 * k; st.posterX = 0; st.posterY = 150 - 90 * k; st.low = true; st.kicker = ''; }
      else { st.bg = (cur.si % 2 ? lastImg : firstImg); st.bgZoom = 1.14 + 0.08 * k; st.bgX = cur.dir * 24 * k; st.bgBlur = 34; st.bgBright = .4; st.shade = .78; st.low = false; st.kicker = ''; }
      st.txtY = 12 * (1 - ease(clamp((tt - sStart) / 0.3, 0, 1)));
    }
    if (tt >= endStart) { const ek = clamp((tt - endStart) / 0.45, 0, 1); st.end = { t: spec.endText, bg: lastImg, alpha: ek }; st.words = []; st.bg = lastImg; st.bgBlur = 0; }
    if (tt < 0.2) st.fade = 1 - tt / 0.2; if (tt > total - 0.35) st.fade = (tt - (total - 0.35)) / 0.35;
    await page.evaluate((s) => window.render(s), st);
    await page.screenshot({ type: 'jpeg', quality: 90, path: path.join(fdir, String(i).padStart(5, '0') + '.jpg') });
  }
  await b.close();
  const out = path.join(OUT, spec.id + '.mp4');
  execSync(`ffmpeg -hide_banner -loglevel error -y -framerate ${FPS} -i "${fdir}/%05d.jpg" -i "${work}/audio.m4a" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a copy -shortest -movflags +faststart "${out}"`);
  fs.rmSync(work, { recursive: true, force: true });
  console.log('OK', out, total.toFixed(1) + 's', n + ' cuts');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
