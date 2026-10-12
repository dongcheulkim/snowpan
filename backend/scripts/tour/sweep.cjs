// 이번에 추가한 스키장 전체: 현재 대표 사진의 눈 점수를 다시 재서 여름 사진이면 비공개로 내린다
const fs = require('fs'); const path = require('path'); const sharp = require('sharp');
const API = 'https://api.snowpan.kr/api'; const TOK = fs.readFileSync(path.join(__dirname, '..', 'tok'), 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOK, Origin: 'https://snowpan.kr', 'X-Snowpan-Client': 'web' };
async function score(url) { const r = await fetch(url); if (!r.ok) return -1; const buf = Buffer.from(await r.arrayBuffer()); const { data, info } = await sharp(buf).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const s = Math.floor(info.height * 0.4); let w = 0, n = 0; for (let y = s; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; n++; if (data[i] > 180 && data[i + 1] > 180 && data[i + 2] > 180 && Math.abs(data[i] - data[i + 2]) < 40) w++; } return w / n; }
(async () => {
  const slugs = new Set(process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).map((x) => x.slug)));
  const all = await (await fetch(API + '/overseas/admin/resorts', { headers: H })).json();
  const mine = all.filter((r) => slugs.has(r.slug));
  let held = 0;
  for (const r of mine) {
    if (!r.published || !r.image) continue;
    const sc = await score(r.image);
    if (sc >= 0 && sc < 0.12) { await fetch(`${API}/overseas/resorts/${r.id}`, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ published: false }) }); console.log('HOLD', r.name, sc.toFixed(2)); held++; }
  }
  console.log('checked', mine.length, 'held', held);
})();
