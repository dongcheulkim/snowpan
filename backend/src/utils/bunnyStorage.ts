// Bunny 저장소에 정해진 경로로 파일 넣기 (인스타 매거진 사진 캐시 등). 업로드 라우트(uploadRoutes)는 무작위 이름을 쓰므로 별도.
// 키는 절대 로그·응답에 넣지 않는다.
const BUNNY_ZONE = process.env.BUNNY_STORAGE_ZONE || 'snowman';
const BUNNY_KEY = process.env.BUNNY_STORAGE_KEY || '';
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST || 'sg.storage.bunnycdn.com';
const BUNNY_CDN_HOST = process.env.BUNNY_CDN_HOST || 'snowpankr.b-cdn.net';

export function isStorageConfigured(): boolean { return Boolean(BUNNY_KEY); }
function cdnUrl(objectPath: string): string { return `https://${BUNNY_CDN_HOST}/${objectPath}`; }
export function isOurCdn(url: string): boolean { return url.startsWith(`https://${BUNNY_CDN_HOST}/`); }

export async function putObject(objectPath: string, body: Buffer, mime: string): Promise<string> {
  if (!BUNNY_KEY) throw new Error('BUNNY_STORAGE_KEY 미설정');
  const encoded = objectPath.split('/').map((s) => encodeURIComponent(s)).join('/');
  const res = await fetch(`https://${BUNNY_STORAGE_HOST}/${BUNNY_ZONE}/${encoded}`, {
    method: 'PUT', headers: { AccessKey: BUNNY_KEY, 'Content-Type': mime }, body, signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Bunny put failed: ${res.status}`);
  return cdnUrl(objectPath);
}
