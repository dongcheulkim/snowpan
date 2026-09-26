// 저장소(Bunny)에 있지만 DB 어디에서도 참조하지 않는 사진 찾기·삭제 (2026-09-26, 사장님 "옛날 테스트 사진이 많다").
// 글·매물·매장이 지워져도 파일은 저장소에 남아 있었다. 관리자 즉시 실행 작업으로 훑어보고(dry run) 지운다.
// - 참조 수집: DB 의 모든 text/varchar 컬럼에서 CDN 주소(snowpankr.b-cdn.net/...)를 정규식으로 뽑는다 (컬럼을 하나하나 나열하지 않아 새 컬럼이 생겨도 빠지지 않음).
// - 안전장치: 만든 지 olderThanDays(기본 1일) 안 된 파일은 건드리지 않는다 (업로드 직후 아직 글을 저장하기 전일 수 있음).
// - 키는 절대 로그·응답에 넣지 않는다.
import prisma from '../config/database';

const BUNNY_ZONE = process.env.BUNNY_STORAGE_ZONE || 'snowman';
const BUNNY_KEY = process.env.BUNNY_STORAGE_KEY || '';
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST || 'sg.storage.bunnycdn.com';
const BUNNY_CDN_HOST = process.env.BUNNY_CDN_HOST || 'snowpankr.b-cdn.net';

export interface StorageFile { path: string; bytes: number; createdAt: string }
export interface OrphanReport {
  configured: boolean;
  scannedFiles: number;
  referenced: number;
  orphans: number;
  orphanBytes: number;
  skippedRecent: number;
  sample: StorageFile[];
  deleted?: number;
  failed?: number;
}

function encodePath(p: string): string {
  return p.split('/').map((s) => encodeURIComponent(s)).join('/');
}

// 저장소 폴더를 재귀로 훑어 파일 목록을 만든다.
export async function listStorageFiles(prefix = ''): Promise<StorageFile[]> {
  const out: StorageFile[] = [];
  const walk = async (dir: string): Promise<void> => {
    const url = `https://${BUNNY_STORAGE_HOST}/${BUNNY_ZONE}/${dir ? encodePath(dir) + '/' : ''}`;
    const res = await fetch(url, { headers: { AccessKey: BUNNY_KEY, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Bunny list failed: ${res.status} ${dir}`);
    const rows = (await res.json()) as Array<{ ObjectName: string; IsDirectory: boolean; Length: number; DateCreated: string }>;
    for (const r of rows) {
      const p = dir ? `${dir}/${r.ObjectName}` : r.ObjectName;
      if (r.IsDirectory) await walk(p);
      else out.push({ path: p, bytes: Number(r.Length) || 0, createdAt: r.DateCreated });
    }
  };
  await walk(prefix);
  return out;
}

// DB 의 모든 문자열 컬럼에서 CDN 경로를 뽑는다. 값은 URL 그대로일 수도, 콤마로 여러 개일 수도, 본문 속에 섞여 있을 수도 있다.
export async function referencedStoragePaths(): Promise<Set<string>> {
  const cols = await prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string }>>(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND data_type IN ('text', 'character varying')`,
  );
  const host = BUNNY_CDN_HOST.replace(/\./g, '\\.');
  const found = new Set<string>();
  for (const c of cols) {
    const t = `"${c.table_name.replace(/"/g, '""')}"`;
    const col = `"${c.column_name.replace(/"/g, '""')}"`;
    const rows = await prisma.$queryRawUnsafe<Array<{ m: string[] }>>(
      `SELECT regexp_matches(${col}, 'https?://${host}/([^\\s",'')<>\\]]+)', 'g') AS m FROM ${t} WHERE ${col} LIKE '%${BUNNY_CDN_HOST}%'`,
    );
    for (const r of rows) {
      const raw = r.m?.[0];
      if (!raw) continue;
      // ?width= 같은 변환 파라미터는 떼고, URL 인코딩된 이름은 풀어서 저장소 경로와 맞춘다
      const clean = raw.split('?')[0].split('#')[0];
      found.add(clean);
      try { found.add(decodeURIComponent(clean)); } catch { /* 잘못된 인코딩은 무시 */ }
    }
  }
  return found;
}

export async function findStorageOrphans(olderThanDays = 1): Promise<OrphanReport & { orphanFiles: StorageFile[] }> {
  if (!BUNNY_KEY) return { configured: false, scannedFiles: 0, referenced: 0, orphans: 0, orphanBytes: 0, skippedRecent: 0, sample: [], orphanFiles: [] };
  const [files, refs] = await Promise.all([listStorageFiles(), referencedStoragePaths()]);
  const cutoff = Date.now() - olderThanDays * 86_400_000;
  let skippedRecent = 0;
  const orphanFiles: StorageFile[] = [];
  for (const f of files) {
    if (refs.has(f.path)) continue;
    const created = new Date(f.createdAt).getTime();
    if (!isNaN(created) && created > cutoff) { skippedRecent++; continue; }
    orphanFiles.push(f);
  }
  orphanFiles.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    configured: true,
    scannedFiles: files.length,
    referenced: files.length - orphanFiles.length - skippedRecent,
    orphans: orphanFiles.length,
    orphanBytes: orphanFiles.reduce((s, f) => s + f.bytes, 0),
    skippedRecent,
    sample: orphanFiles.slice(0, 20),
    orphanFiles,
  };
}

// 안 쓰는 파일 삭제 — 사장님 결정(2026-09-26 "삭제해")으로 추가. 찾은 목록을 4개씩 동시에 지우고, 이미 없는 파일(404)은 지운 것으로 센다.
export async function deleteStorageOrphans(olderThanDays = 1): Promise<OrphanReport> {
  const report = await findStorageOrphans(olderThanDays);
  const { orphanFiles, ...rest } = report;
  if (!report.configured) return rest;
  let deleted = 0, failed = 0;
  const queue = [...orphanFiles];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        const res = await fetch(`https://${BUNNY_STORAGE_HOST}/${BUNNY_ZONE}/${encodePath(f.path)}`, {
          method: 'DELETE', headers: { AccessKey: BUNNY_KEY }, signal: AbortSignal.timeout(20_000),
        });
        if (res.ok || res.status === 404) deleted++; else { failed++; console.warn(`storage orphan delete ${res.status}: ${f.path}`); }
      } catch (e) { failed++; console.warn(`storage orphan delete error: ${f.path} ${(e as Error).message}`); }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`storage orphans: deleted ${deleted}, failed ${failed}, olderThanDays ${olderThanDays}`);
  return { ...rest, deleted, failed };
}
