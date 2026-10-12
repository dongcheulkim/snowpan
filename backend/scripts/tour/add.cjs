// 해외 스키장 일괄 추가: 위키백과 대표 사진(공용, 상업 이용 가능 라이선스만) → Bunny 업로드 → 스노우판 등록. 사진 못 구하면 비공개(published=false)로 등록.
const fs = require('fs'); const path = require('path');
const API = 'https://api.snowpan.kr/api'; const TOK = fs.readFileSync(path.join(__dirname, '..', 'tok'), 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOK, Origin: 'https://snowpan.kr', 'X-Snowpan-Client': 'web' };
const UA = 'SnowpanTourBot/1.0 (snowpan.kr; help.snowpan@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const okLicense = (s) => /\b(CC0|Public domain|CC BY(?:-SA)?(?: \d(\.\d)?)?)\b/i.test(s || '') && !/NC|ND/i.test(s || '');

async function wikiImage(lang, title) {
  const u = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original|name&titles=${encodeURIComponent(title)}&format=json&redirects=1`;
  const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (!r.ok) return null; const d = await r.json();
  const pages = Object.values(d.query?.pages || {}); const p = pages[0]; if (!p || !p.original) return null;
  return { file: p.pageimage, url: p.original.source };
}
async function commonsSearch(q) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1600&format=json`;
  const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (!r.ok) return []; const d = await r.json();
  return Object.values(d.query?.pages || {}).map((p) => ({ title: p.title, info: p.imageinfo?.[0] })).filter((x) => x.info);
}
async function commonsInfo(file) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent('File:' + file)}&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1600&format=json`;
  const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (!r.ok) return null; const d = await r.json();
  const p = Object.values(d.query?.pages || {})[0]; return p?.imageinfo?.[0] || null;
}
function licenseOf(info) { const m = info.extmetadata || {}; return { lic: (m.LicenseShortName?.value || '').replace(/<[^>]+>/g, ''), artist: (m.Artist?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 60) }; }
function usable(info) { if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime || '')) return false; if ((info.width || 0) < 800) return false; return okLicense(licenseOf(info).lic); }

// 후보(위키 대표사진 + 공용 검색 결과)를 모아 '눈 점수'(밝은 픽셀 비율)가 높은 것을 고른다 — 여름 마을 사진·지도 대신 겨울 슬로프 사진
async function snowScore(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) { if (process.env.DEBUG) console.log('  score-http', r.status, url.slice(0, 80)); return 0; }
    const buf = Buffer.from(await r.arrayBuffer());
    const sharp = require('sharp');
    const { data, info } = await sharp(buf).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    // 하늘(위 40%)은 빼고 아래 60% 에서 흰 픽셀 비율 — 여름 사진의 밝은 하늘·구름이 눈으로 잡히지 않게
    const startRow = Math.floor(info.height * 0.4); let white = 0, n = 0;
    for (let y = startRow; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; const r1 = data[i], g = data[i + 1], b = data[i + 2]; n++; if (r1 > 180 && g > 180 && b > 180 && Math.abs(r1 - b) < 40) white++; }
    return white / n;
  } catch (e) { if (process.env.DEBUG) console.log('  score-err', url.slice(0, 90), e.message); return 0; }
}
async function pickPhoto(c) {
  const cands = [];
  for (const w of c.wiki || []) {
    try { const im = await wikiImage(w[0], w[1]); if (im && im.file) { const info = await commonsInfo(im.file); if (usable(info)) cands.push({ info, file: im.file, via: `${w[0]}:${w[1]}` }); } } catch { /* 다음 */ }
    await sleep(250);
  }
  const base = (c.search || [])[0] || c.name;
  const queries = [...(c.search || []), base.replace(/ ski.*$/i, '') + ' ski winter', base.replace(/ ski.*$/i, '') + ' piste snow'];
  for (const q of queries) {
    try { const list = await commonsSearch(q); for (const x of list) if (usable(x.info)) cands.push({ info: x.info, file: x.title.replace(/^File:/, ''), via: 'search:' + q }); } catch { /* 다음 */ }
    await sleep(250);
  }
  const seen = new Set(); const uniq = cands.filter((x) => (seen.has(x.file) ? false : (seen.add(x.file), true))).slice(0, 14);
  for (const x of uniq) { x.score = await snowScore(x.info.thumburl || x.info.url); await sleep(150); }
  if (process.env.DEBUG) for (const x of uniq) console.log('  cand', x.score.toFixed(2), x.via, x.file.slice(0, 50), licenseOf(x.info).lic);
  uniq.sort((a, b) => b.score - a.score);
  if (process.env.SKIP_FIRST) uniq.shift(); // 지금 걸린 사진(1순위)이 표지판·지도 같은 것일 때 2순위로
  const best = uniq[0]; if (!best) return null;
  if (best.score < 0.12 && !process.env.ALLOW_NO_SNOW) return { ...best, lowSnow: true };
  return best;
}
async function upload(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error('download ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer()); const type = r.headers.get('content-type') || 'image/jpeg';
  const fd = new FormData(); fd.append('images', new Blob([buf], { type }), 'photo.' + (type.includes('png') ? 'png' : 'jpg'));
  const up = await fetch(API + '/upload', { method: 'POST', headers: H, body: fd }); const d = await up.json(); if (!up.ok) throw new Error('upload ' + (d.error || up.status));
  return d.urls[0];
}
async function exists(slug) { const r = await fetch(`${API}/overseas/resorts/${slug}`, { headers: { 'User-Agent': UA } }); return r.status === 200; }

(async () => {
  const file = process.argv[2]; const mode = process.argv[3] || 'add'; const list = JSON.parse(fs.readFileSync(file, 'utf8')); const report = [];
  const existing = await (await fetch(API + '/overseas/admin/resorts', { headers: H })).json(); const slugs = new Set(existing.map((r) => r.slug)); const names = new Set(existing.map((r) => r.name));
  if (mode === 'refresh') {
    const only = new Set((process.argv[4] || '').split(',').filter(Boolean));
    for (const c of list) {
      if (only.size && !only.has(c.slug)) continue;
      const row = existing.find((r) => r.slug === c.slug); if (!row) { console.log('없음', c.slug); continue; }
      const ph = await pickPhoto(c);
      if (process.env.DRY) { console.log('DRY', c.name, ph ? ph.via + ' ' + ph.score.toFixed(2) + (ph.lowSnow ? ' LOW' : '') : 'none'); continue; }
      if (!ph || ph.lowSnow) {
        // 겨울 사진이 없으면 비공개로 내린다 (여름 마을 사진·지도로 공개돼 있던 것)
        await fetch(`${API}/overseas/resorts/${row.id}`, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ published: false }) });
        console.log('HOLD', c.name, ph ? 'best score ' + ph.score.toFixed(2) : 'no candidate'); continue;
      }
      const { lic, artist } = licenseOf(ph.info); const image = await upload(ph.info.thumburl || ph.info.url);
      await fetch(`${API}/overseas/resorts/${row.id}`, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ image, imageCredit: `위키미디어 공용 · ${lic}${artist ? ' · ' + artist : ''}`, published: true }) });
      console.log('SWAP', c.name, ph.via, 'score', ph.score.toFixed(2)); await sleep(2500);
    }
    return;
  }
  for (const c of list) {
    if (slugs.has(c.slug) || names.has(c.name)) { report.push({ slug: c.slug, skip: 'exists' }); continue; }
    let image = null, credit = null, photoNote = '', lowSnow = false;
    try {
      const ph = await pickPhoto(c);
      if (ph) { const { lic, artist } = licenseOf(ph.info); const src = ph.info.thumburl || ph.info.url; image = await upload(src); credit = `위키미디어 공용 · ${lic}${artist ? ' · ' + artist : ''}`; photoNote = ph.via + ' score ' + ph.score.toFixed(2) + (ph.lowSnow ? ' LOWSNOW' : ''); if (ph.lowSnow) lowSnow = true; await sleep(2500); }
    } catch (e) { photoNote = 'photo-error: ' + e.message; }
    const body = { ...c, image, published: !!image && !lowSnow, scope: '해외', vertical: 'snow' }; // 여름 사진뿐이면 사진은 넣되 비공개 delete body.wiki; delete body.search;
    const r = await fetch(API + '/overseas/resorts', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json();
    if (!r.ok) { report.push({ slug: c.slug, error: d.error || r.status }); continue; }
    if (image && credit) { await fetch(`${API}/overseas/resorts/${d.id}`, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ imageCredit: credit }) }).catch(() => {}); }
    report.push({ slug: c.slug, name: c.name, published: !!image && !lowSnow, photo: photoNote, credit });
    console.log((image && !lowSnow ? 'OK  ' : 'HOLD') + ' ' + c.name + ' ' + photoNote);
  }
  fs.writeFileSync(file.replace(/\.json$/, '.report.json'), JSON.stringify(report, null, 1));
  console.log('done', report.filter((r) => r.published).length, 'published /', report.filter((r) => r.published === false).length, 'held /', report.filter((r) => r.skip).length, 'skipped /', report.filter((r) => r.error).length, 'errors');
})();
