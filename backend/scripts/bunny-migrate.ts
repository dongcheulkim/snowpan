// Bunny 스토리지 존 복사 (2026-09-24) — 싱가포르 존 → LA 존. Render Shell 에서 실행: npx tsx scripts/bunny-migrate.ts [--dry]
// 원본: BUNNY_STORAGE_HOST / BUNNY_STORAGE_ZONE / BUNNY_STORAGE_KEY (지금 쓰는 존)
// 대상: BUNNY_LA_HOST (기본 la.storage.bunnycdn.com) / BUNNY_LA_ZONE / BUNNY_LA_KEY
// 같은 경로에 같은 크기의 파일이 이미 있으면 건너뛴다 (여러 번 돌려도 안전). 키는 절대 출력하지 않는다.
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';

const SRC = { host: process.env.BUNNY_STORAGE_HOST || 'sg.storage.bunnycdn.com', zone: process.env.BUNNY_STORAGE_ZONE || 'snowman', key: process.env.BUNNY_STORAGE_KEY || '' };
const DST = { host: process.env.BUNNY_LA_HOST || 'la.storage.bunnycdn.com', zone: process.env.BUNNY_LA_ZONE || '', key: process.env.BUNNY_LA_KEY || '' };
const DRY = process.argv.includes('--dry');
const CONCURRENCY = 4;

interface Entry { ObjectName: string; IsDirectory: boolean; Length: number; Path: string }

// 경로 조각마다 URL 인코딩 (한글·공백 파일명 대비)
const enc = (p: string): string => p.split('/').map((seg) => encodeURIComponent(seg)).join('/');

async function list(z: typeof SRC, dir: string): Promise<Entry[]> {
  const res = await fetch(`https://${z.host}/${z.zone}/${enc(dir)}`, { headers: { AccessKey: z.key, Accept: 'application/json' } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`목록 실패 ${res.status} ${dir}`);
  return (await res.json()) as Entry[];
}

async function walk(z: typeof SRC, dir = ''): Promise<{ path: string; size: number }[]> {
  const out: { path: string; size: number }[] = [];
  for (const e of await list(z, dir)) {
    const p = `${dir}${e.ObjectName}`;
    if (e.IsDirectory) out.push(...(await walk(z, `${p}/`)));
    else out.push({ path: p, size: e.Length });
  }
  return out;
}

// 파일을 통째로 메모리에 올리지 않고 임시 파일로 흘려보낸다 (동영상 수백 MB 여러 개를 동시에 다루면 Render 512MB 를 넘길 수 있음).
function download(path: string, tmp: string): Promise<{ size: number; type: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request({ host: SRC.host, path: `/${SRC.zone}/${enc(path)}`, method: 'GET', headers: { AccessKey: SRC.key }, timeout: 120_000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`GET ${res.statusCode}`)); return; }
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => resolve({ size: fs.statSync(tmp).size, type: String(res.headers['content-type'] || 'application/octet-stream') }));
      out.on('error', reject); res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('GET timeout'))); req.on('error', reject); req.end();
  });
}
function upload(path: string, tmp: string, size: number, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.request({ host: DST.host, path: `/${DST.zone}/${enc(path)}`, method: 'PUT', headers: { AccessKey: DST.key, 'Content-Type': type, 'Content-Length': size }, timeout: 300_000 }, (res) => {
      res.resume();
      res.on('end', () => (res.statusCode && res.statusCode < 300 ? resolve() : reject(new Error(`PUT ${res.statusCode}`))));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('PUT timeout'))); req.on('error', reject);
    fs.createReadStream(tmp).on('error', reject).pipe(req);
  });
}
async function copyOne(path: string): Promise<'copied' | 'failed'> {
  const tmp = `${os.tmpdir()}/bunny-migrate-${crypto.randomBytes(6).toString('hex')}`;
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { size, type } = await download(path, tmp);
        await upload(path, tmp, size, type);
        return 'copied';
      } catch (e) {
        console.warn(`  재시도 ${attempt}/3 ${path}: ${e instanceof Error ? e.message : e}`);
      }
    }
    return 'failed';
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* 없으면 무시 */ }
  }
}

(async () => {
  if (!SRC.key || !DST.zone || !DST.key) { console.error('환경변수 부족: BUNNY_STORAGE_KEY, BUNNY_LA_ZONE, BUNNY_LA_KEY 가 필요합니다.'); process.exit(1); }
  console.log(`원본 ${SRC.host}/${SRC.zone} → 대상 ${DST.host}/${DST.zone}${DRY ? ' (dry run)' : ''}`);
  const srcFiles = await walk(SRC);
  const dstFiles = new Map((await walk(DST)).map((f) => [f.path, f.size]));
  const todo = srcFiles.filter((f) => dstFiles.get(f.path) !== f.size);
  const totalMB = (srcFiles.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(1);
  console.log(`원본 파일 ${srcFiles.length}개 (${totalMB}MB), 이미 있는 것 ${srcFiles.length - todo.length}개, 복사할 것 ${todo.length}개`);
  if (DRY) return;
  let copied = 0, failed = 0, done = 0;
  const queue = [...todo];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const f = queue.shift()!;
      const r = await copyOne(f.path);
      if (r === 'copied') copied++; else failed++;
      done++;
      if (done % 50 === 0 || done === todo.length) console.log(`  진행 ${done}/${todo.length} (복사 ${copied}, 실패 ${failed})`);
    }
  }));
  console.log(`끝: 복사 ${copied}, 건너뜀 ${srcFiles.length - todo.length}, 실패 ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('오류:', e instanceof Error ? e.message : e); process.exit(1); });
