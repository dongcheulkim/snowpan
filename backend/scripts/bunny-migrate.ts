// Bunny 스토리지 존 복사 (2026-09-24) — 싱가포르 존 → LA 존. Render Shell 에서 실행: npx tsx scripts/bunny-migrate.ts [--dry]
// 원본: BUNNY_STORAGE_HOST / BUNNY_STORAGE_ZONE / BUNNY_STORAGE_KEY (지금 쓰는 존)
// 대상: BUNNY_LA_HOST (기본 la.storage.bunnycdn.com) / BUNNY_LA_ZONE / BUNNY_LA_KEY
// 같은 경로에 같은 크기의 파일이 이미 있으면 건너뛴다 (여러 번 돌려도 안전). 키는 절대 출력하지 않는다.
const SRC = { host: process.env.BUNNY_STORAGE_HOST || 'sg.storage.bunnycdn.com', zone: process.env.BUNNY_STORAGE_ZONE || 'snowman', key: process.env.BUNNY_STORAGE_KEY || '' };
const DST = { host: process.env.BUNNY_LA_HOST || 'la.storage.bunnycdn.com', zone: process.env.BUNNY_LA_ZONE || '', key: process.env.BUNNY_LA_KEY || '' };
const DRY = process.argv.includes('--dry');
const CONCURRENCY = 8;

interface Entry { ObjectName: string; IsDirectory: boolean; Length: number; Path: string }

async function list(z: typeof SRC, dir: string): Promise<Entry[]> {
  const res = await fetch(`https://${z.host}/${z.zone}/${dir}`, { headers: { AccessKey: z.key, Accept: 'application/json' } });
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

async function copyOne(path: string): Promise<'copied' | 'failed'> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const get = await fetch(`https://${SRC.host}/${SRC.zone}/${path}`, { headers: { AccessKey: SRC.key }, signal: AbortSignal.timeout(60_000) });
      if (!get.ok) throw new Error(`GET ${get.status}`);
      const body = Buffer.from(await get.arrayBuffer());
      const type = get.headers.get('content-type') || 'application/octet-stream';
      const put = await fetch(`https://${DST.host}/${DST.zone}/${path}`, { method: 'PUT', headers: { AccessKey: DST.key, 'Content-Type': type }, body, signal: AbortSignal.timeout(60_000) });
      if (!put.ok) throw new Error(`PUT ${put.status}`);
      return 'copied';
    } catch (e) {
      console.warn(`  재시도 ${attempt}/3 ${path}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return 'failed';
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
