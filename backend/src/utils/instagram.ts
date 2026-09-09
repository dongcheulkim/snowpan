// 인스타그램 @snowpan.kr 최신 게시물 — 홈 섹션용.
// 공식 API(Instagram API with Instagram Login)만 사용한다. 화면 스크래핑은 인스타 약관 위반이라 쓰지 않음(사용자 요청 2026-09-09).
//
// 토큰은 관리자가 한 번 넣으면(PUT /api/admin/instagram/token) DB(AdminSetting)에 보관하고 서버가 알아서 갱신한다.
// - 장기 토큰 수명 60일. 만료 10일 전부터 refresh_access_token 으로 연장(하루 한 번 확인).
// - 게시물은 1시간마다 받아 캐시. 인스타가 잠깐 막혀도 마지막 캐시를 그대로 보여준다.
// - media_url 은 서명된 CDN 주소라 며칠이면 만료 → 1시간 주기 갱신으로 항상 신선하게 유지.
import prisma from '../config/database';

const KEY_TOKEN = 'instagram.token';
const KEY_EXPIRES = 'instagram.tokenExpiresAt';
const KEY_CACHE = 'instagram.cache';
const KEY_FETCHED = 'instagram.fetchedAt';
const KEY_USERNAME = 'instagram.username';

const GRAPH = 'https://graph.instagram.com';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const MAX_POSTS = 12;
const REFRESH_BEFORE_MS = 10 * 24 * 60 * 60 * 1000; // 만료 10일 전부터 연장

export interface IgPost {
  id: string;
  caption: string;
  mediaType: string;      // IMAGE | VIDEO | CAROUSEL_ALBUM
  image: string;          // 표시용 이미지 (동영상은 thumbnail_url)
  permalink: string;
  timestamp: string;
}

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.adminSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}
async function setSetting(key: string, value: string): Promise<void> {
  await prisma.adminSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

// 인스타 응답 → 화면에 필요한 것만. 이미지 없는 항목은 버린다.
function toPosts(data: unknown): IgPost[] {
  const arr = (data as { data?: unknown[] })?.data;
  if (!Array.isArray(arr)) return [];
  const out: IgPost[] = [];
  for (const raw of arr) {
    const m = raw as Record<string, unknown>;
    const type = String(m.media_type || '');
    const image = String((type === 'VIDEO' ? m.thumbnail_url : m.media_url) || m.media_url || '');
    if (!image.startsWith('https://')) continue;
    const permalink = String(m.permalink || '');
    if (!permalink.startsWith('https://www.instagram.com/')) continue;
    out.push({
      id: String(m.id || ''),
      caption: String(m.caption || '').slice(0, 300),
      mediaType: type,
      image,
      permalink,
      timestamp: String(m.timestamp || ''),
    });
    if (out.length >= MAX_POSTS) break;
  }
  return out;
}

async function igFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

// 토큰 저장 + 즉시 1회 수집. 짧은 토큰(1시간)을 받으면 장기 토큰으로 교환한다.
export async function saveInstagramToken(token: string, appSecret?: string): Promise<{ posts: number; username: string | null; expiresAt: string | null }> {
  let longLived = token;
  let expiresAt: Date | null = null;
  // 짧은 토큰 → 장기 토큰 교환 (앱 시크릿이 있을 때만 가능). 이미 장기 토큰이면 실패해도 그대로 진행.
  if (appSecret) {
    try {
      const ex = await igFetch(`${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(token)}`) as { access_token?: string; expires_in?: number };
      if (ex?.access_token) {
        longLived = ex.access_token;
        if (ex.expires_in) expiresAt = new Date(Date.now() + ex.expires_in * 1000);
      }
    } catch { /* 이미 장기 토큰이면 교환이 실패한다 — 그대로 사용 */ }
  }
  // 유효성 확인 겸 사용자명 조회
  const me = await igFetch(`${GRAPH}/me?fields=username&access_token=${encodeURIComponent(longLived)}`) as { username?: string };
  await setSetting(KEY_TOKEN, longLived);
  if (me?.username) await setSetting(KEY_USERNAME, me.username);
  if (!expiresAt) expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 교환 못 했으면 60일로 가정
  await setSetting(KEY_EXPIRES, expiresAt.toISOString());
  const posts = await refreshInstagramPosts(true);
  return { posts: posts.length, username: me?.username ?? null, expiresAt: expiresAt.toISOString() };
}

export async function clearInstagramToken(): Promise<void> {
  await prisma.adminSetting.deleteMany({ where: { key: { in: [KEY_TOKEN, KEY_EXPIRES, KEY_CACHE, KEY_FETCHED, KEY_USERNAME] } } });
}

// 캐시 읽기 — 공개 API 가 쓴다. 토큰이 없으면 빈 배열(홈 섹션이 숨겨짐).
export async function getInstagramPosts(): Promise<{ posts: IgPost[]; username: string | null; fetchedAt: string | null }> {
  const [cache, username, fetchedAt] = await Promise.all([getSetting(KEY_CACHE), getSetting(KEY_USERNAME), getSetting(KEY_FETCHED)]);
  let posts: IgPost[] = [];
  try { const p = JSON.parse(cache || '[]'); if (Array.isArray(p)) posts = p; } catch { /* 깨진 캐시는 빈 목록 */ }
  return { posts, username, fetchedAt };
}

// 인스타에서 새로 받아 캐시에 저장. 실패하면 옛 캐시를 유지한다.
export async function refreshInstagramPosts(throwOnError = false): Promise<IgPost[]> {
  const token = await getSetting(KEY_TOKEN);
  if (!token) return [];
  try {
    const data = await igFetch(`${GRAPH}/me/media?fields=${FIELDS}&limit=${MAX_POSTS}&access_token=${encodeURIComponent(token)}`);
    const posts = toPosts(data);
    await setSetting(KEY_CACHE, JSON.stringify(posts));
    await setSetting(KEY_FETCHED, new Date().toISOString());
    return posts;
  } catch (err) {
    console.error('Instagram fetch error:', err instanceof Error ? err.message : err);
    if (throwOnError) throw err;
    const { posts } = await getInstagramPosts();
    return posts;
  }
}

// 만료가 가까우면 토큰 연장 (60일짜리를 다시 60일로).
export async function refreshInstagramTokenIfNeeded(): Promise<void> {
  const [token, expires] = await Promise.all([getSetting(KEY_TOKEN), getSetting(KEY_EXPIRES)]);
  if (!token) return;
  const exp = expires ? new Date(expires).getTime() : 0;
  if (exp && exp - Date.now() > REFRESH_BEFORE_MS) return;
  try {
    const r = await igFetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`) as { access_token?: string; expires_in?: number };
    if (r?.access_token) {
      await setSetting(KEY_TOKEN, r.access_token);
      await setSetting(KEY_EXPIRES, new Date(Date.now() + (r.expires_in || 60 * 24 * 60 * 60) * 1000).toISOString());
      console.log('📸 인스타 토큰 연장 완료');
    }
  } catch (err) {
    console.error('Instagram token refresh error:', err instanceof Error ? err.message : err);
  }
}

// 관리자 화면용 상태 (토큰 값 자체는 절대 내보내지 않는다)
export async function getInstagramStatus(): Promise<{ connected: boolean; username: string | null; expiresAt: string | null; fetchedAt: string | null; count: number }> {
  const [token, username, expiresAt, fetchedAt, cache] = await Promise.all([
    getSetting(KEY_TOKEN), getSetting(KEY_USERNAME), getSetting(KEY_EXPIRES), getSetting(KEY_FETCHED), getSetting(KEY_CACHE),
  ]);
  let count = 0;
  try { const p = JSON.parse(cache || '[]'); if (Array.isArray(p)) count = p.length; } catch { /* 무시 */ }
  return { connected: !!token, username, expiresAt, fetchedAt, count };
}

export function startInstagramScheduler(): void {
  // 서버 시작 직후 1회 (토큰 없으면 즉시 반환)
  refreshInstagramPosts().catch(() => {});
  refreshInstagramTokenIfNeeded().catch(() => {});
  setInterval(() => { refreshInstagramPosts().catch(() => {}); }, 60 * 60 * 1000);        // 게시물 1시간
  setInterval(() => { refreshInstagramTokenIfNeeded().catch(() => {}); }, 24 * 60 * 60 * 1000); // 토큰 하루
  console.log('📸 인스타그램 스케줄러 시작됨');
}
