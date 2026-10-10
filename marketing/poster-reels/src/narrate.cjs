// 포스터 → 내레이션 릴스. 입력: script JSON { id, slides:[{img, lines:[문장...]}], endText }
// 문장마다 macOS say(Yuna)로 음성 → 길이 측정 → 그 길이만큼 슬라이드(천천히 확대) + 자막 → 프레임 합성 → ffmpeg 로 음성과 합침
const { chromium } = require('/Users/jason/bada-now/node_modules/playwright');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const FPS = 25, GAP = 0.35, END_SEC = 3.2;
// 음성: 기본은 마이크로소프트 신경망 음성(edge-tts, 키 불필요) — 맥 내장 say 는 기계 티가 나서 사장님이 거절(2026-10-10)
const ENGINE = process.env.ENGINE || 'edge', VOICE = process.env.VOICE || (ENGINE === 'edge' ? 'ko-KR-SunHiNeural' : 'Yuna'), RATE = process.env.RATE || (ENGINE === 'edge' ? '+8%' : '185');
function tts(text, outBase) {
  if (ENGINE === 'edge') { const f = outBase + '.mp3'; execSync(`python3 -m edge_tts --voice ${VOICE} --rate=${RATE} --text ${JSON.stringify(text)} --write-media "${f}"`, { stdio: 'pipe' }); return f; }
  const f = outBase + '.aiff'; execSync(`say -v ${VOICE} -r ${RATE} -o "${f}" ${JSON.stringify(text)}`); return f;
}
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3] || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const work = path.join(__dirname, 'work_' + spec.id); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work);
const dur = (f) => Number(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim());
const ease = (k) => k < .5 ? 2*k*k : -1 + (4-2*k)*k;
(async () => {
  // 1) 음성 — 문장 단위로 합성해 타임라인을 만든다 (문장 사이 0.35초 쉼)
  const timeline = []; let t = 0.6; const parts = [];
  spec.slides.forEach((sl, si) => {
    sl.lines.forEach((line, li) => {
      const f = tts(line, path.join(work, `s${si}_${li}`));
      const d = dur(f);
      timeline.push({ si, line, start: t, end: t + d }); parts.push({ f, at: t }); t += d + GAP;
    });
  });
  const endStart = t + 0.2;
  if (spec.endLine) { const f = tts(spec.endLine, path.join(work, 'end')); parts.push({ f, at: endStart + 0.3 }); t = Math.max(endStart + END_SEC, endStart + 0.3 + dur(f) + 0.6); } else t = endStart + END_SEC;
  const total = t;
  // 오디오 트랙: 무음 베이스 위에 각 문장을 시작 시각에 얹는다
  const inputs = parts.map((p) => `-i "${p.f}"`).join(' ');
  const delays = parts.map((p, i) => `[${i + 1}:a]adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)}[a${i}]`).join(';');
  const mix = parts.map((_, i) => `[a${i}]`).join('');
  execSync(`ffmpeg -hide_banner -loglevel error -y -f lavfi -t ${total.toFixed(2)} -i anullsrc=r=44100:cl=stereo ${inputs} -filter_complex "${delays};[0:a]${mix}amix=inputs=${parts.length + 1}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[out]" -map "[out]" -c:a aac -b:a 160k "${work}/audio.m4a"`);
  // 2) 프레임
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); await page.goto('file://' + path.join(__dirname, 'stage.html')); await page.waitForTimeout(300);
  const slideSpan = spec.slides.map((_, si) => { const ls = timeline.filter((x) => x.si === si); return { start: si === 0 ? 0 : ls[0].start - GAP / 2, end: ls[ls.length - 1].end + GAP / 2 }; });
  const frames = Math.ceil(total * FPS); const fdir = path.join(work, 'f'); fs.mkdirSync(fdir);
  for (let i = 0; i < frames; i++) {
    const tt = i / FPS; let si = slideSpan.findIndex((s) => tt >= s.start && tt < s.end); if (si < 0) si = tt >= endStart ? spec.slides.length - 1 : Math.max(0, slideSpan.findIndex((s) => tt < s.start) - 1);
    const sp = slideSpan[si] || slideSpan[spec.slides.length - 1]; const k = Math.min(1, Math.max(0, (tt - sp.start) / Math.max(0.1, sp.end - sp.start)));
    const cur = timeline.find((x) => tt >= x.start - 0.05 && tt < x.end + GAP * 0.6);
    const st = { img: spec.slides[si].img, zoom: 1 + 0.06 * k, panX: (si % 2 ? -1 : 1) * 10 * k, panY: -8 * k, sub: cur ? cur.line : '', progress: Math.min(1, tt / endStart) };
    if (tt >= endStart) { const ek = Math.min(1, (tt - endStart) / 0.5); st.end = { t: spec.endText, bg: spec.slides[0].img, alpha: ek }; st.sub = ''; }
    if (tt < 0.4) st.fade = 1 - tt / 0.4; if (tt > total - 0.5) st.fade = (tt - (total - 0.5)) / 0.5;
    await page.evaluate((s) => window.render(s), st);
    await page.screenshot({ type: 'jpeg', quality: 90, path: path.join(fdir, String(i).padStart(5, '0') + '.jpg') });
  }
  await b.close();
  const out = path.join(OUT, spec.id + '.mp4');
  execSync(`ffmpeg -hide_banner -loglevel error -y -framerate ${FPS} -i "${fdir}/%05d.jpg" -i "${work}/audio.m4a" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -c:a copy -shortest -movflags +faststart "${out}"`);
  fs.writeFileSync(path.join(OUT, spec.id + '.timeline.json'), JSON.stringify({ total, timeline }, null, 1));
  fs.rmSync(work, { recursive: true, force: true });
  console.log('OK', out, total.toFixed(1) + 's');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
