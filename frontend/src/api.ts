const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
  // 내부용: refresh 후 재시도 시 무한 루프 방지.
  _retried?: boolean;
  // 내부용: GET 일시 실패(네트워크/429/5xx) 백오프 재시도 횟수.
  _attempt?: number;
}

// access 토큰이 1h 로 짧아져서 자주 만료됨.
// 401 발생 → /auth/refresh (HttpOnly 쿠키 자동 전송) → 새 access 토큰 → 원 요청 재시도.
// refresh 도 실패면 진짜 만료 → /login 리다이렉트.
let refreshPromise: Promise<string | null> | null = null;
async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.token) return null;
      // user 정보도 함께 갱신 (role 변경 등 반영).
      try {
        if (data.user) authStore().setItem('user', JSON.stringify(data.user));
      } catch {}
      authStore().setItem('token', data.token);
      return data.token as string;
    } catch {
      return null;
    } finally {
      // 다음 호출은 새로 시도.
      setTimeout(() => { refreshPromise = null; }, 0);
    }
  })();
  return refreshPromise;
}

// URL 의 첫 segment 가 known vertical 이면 vertical 자동 주입.
// GET 은 query param, POST/PUT 은 body 에 추가. 컴포넌트가 명시 안 해도 올바른 vertical 적용.
const VERTICAL_SLUGS = ['bike', 'run', 'surf', 'golf', 'camp'];
function currentVerticalFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const first = window.location.pathname.split('/')[1] || '';
  return VERTICAL_SLUGS.includes(first) ? first : null;
}
function injectVerticalToPath(path: string): string {
  if (path.includes('vertical=')) return path;
  const slug = currentVerticalFromUrl();
  if (!slug) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}vertical=${slug}`;
}
function injectVerticalToBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  if ((body as Record<string, unknown>).vertical) return body; // 명시적으로 지정됐으면 그대로
  const slug = currentVerticalFromUrl();
  if (!slug) return body;
  return { ...(body as Record<string, unknown>), vertical: slug };
}

// GET(idempotent) 한정 일시 실패 백오프 재시도. 짧은 Cloudflare 엣지 스로틀/순간 5xx 를
// 사용자에게 에러로 노출하지 않고 흡수. 쓰기(POST/PUT/DELETE)는 중복 위험으로 재시도 안 함.
const MAX_GET_RETRIES = 2;
const RETRY_BACKOFF_MS = [300, 800];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token, _retried, _attempt = 0 } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const stored = getToken();
    if (stored) headers['Authorization'] = `Bearer ${stored}`;
  }

  const finalPath = method === 'GET' ? injectVerticalToPath(path) : path;
  const finalBody = method !== 'GET' ? injectVerticalToBody(body) : body;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${finalPath}`, {
      method,
      headers,
      body: finalBody ? JSON.stringify(finalBody) : undefined,
      // refresh 쿠키 cross-domain 전송에 필요.
      credentials: 'include',
    });
  } catch {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('인터넷 연결이 끊어졌습니다. 네트워크를 확인해주세요.');
    }
    // GET 은 idempotent → 일시적 네트워크/엣지(Cloudflare) 차단 시 백오프 후 재시도.
    if (method === 'GET' && _attempt < MAX_GET_RETRIES) {
      await sleep(RETRY_BACKOFF_MS[_attempt]);
      return api<T>(path, { ...options, _attempt: _attempt + 1 });
    }
    throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }

  let data: any;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    // 401 → access 토큰 만료 가능성 → 쿠키 기반 refresh 시도, 성공하면 한 번 재시도.
    // refresh/login/register/logout 자체는 재귀 방지.
    if (res.status === 401 && !_retried && !path.startsWith('/auth/refresh') && !path.startsWith('/auth/login') && !path.startsWith('/auth/register') && !path.startsWith('/auth/logout')) {
      const newToken = await tryRefreshAccessToken();
      if (newToken) {
        return api<T>(path, { ...options, _retried: true });
      }
      if (getToken() && !window.location.pathname.includes('/login')) {
        logout();
        setTimeout(() => { window.location.href = '/login'; }, 0);
      }
    }
    // refresh 후 재시도했는데도 401 이면 (새 토큰도 거부됨) 로그아웃 유도.
    // 이전엔 이 경로가 generic 에러만 던져 사용자가 로그인 화면으로 못 가던 버그.
    if (res.status === 401 && _retried && getToken() && !window.location.pathname.includes('/login')) {
      logout();
      setTimeout(() => { window.location.href = '/login'; }, 0);
    }
    if (res.status === 429) {
      const retry = res.headers.get('Retry-After');
      // GET 한정: Retry-After(최대 3s) 또는 백오프만큼 대기 후 재시도.
      if (method === 'GET' && _attempt < MAX_GET_RETRIES) {
        const waitMs = retry ? Math.min(Number(retry) * 1000, 3000) : RETRY_BACKOFF_MS[_attempt];
        await sleep(waitMs);
        return api<T>(path, { ...options, _attempt: _attempt + 1 });
      }
      throw new Error(data.error || `요청이 너무 많습니다. ${retry ? retry + '초 후 ' : '잠시 후 '}다시 시도해주세요.`);
    }
    if (res.status >= 500) {
      if (method === 'GET' && _attempt < MAX_GET_RETRIES) {
        await sleep(RETRY_BACKOFF_MS[_attempt]);
        return api<T>(path, { ...options, _attempt: _attempt + 1 });
      }
      throw new Error(data.error || '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
    if (res.status === 403) throw new Error(data.error || '권한이 없습니다.');
    if (res.status === 404) throw new Error(data.error || '요청한 정보를 찾을 수 없습니다.');
    throw new Error(data.error || `요청에 실패했습니다. (${res.status})`);
  }
  return data as T;
}

// 토큰 저장 정책 — XSS 노출 최소화:
// - access 토큰: 항상 sessionStorage (탭 닫으면 사라짐, 1시간 만료).
// - 자동 로그인 (persistent): 토큰 저장 X, refresh 쿠키 (HttpOnly) 가 14일 보존.
//   탭 새로 열거나 토큰 만료 시 /auth/refresh 로 자동 재발급.
// - user 정보 (UI 상태) 만 persistent 면 localStorage 에 저장.
function authStore(): Storage {
  // 토큰은 항상 sessionStorage. user 정보 위치만 분기.
  return sessionStorage;
}

function userStore(): Storage {
  return localStorage.getItem('snowpan.persistent') === '1' ? localStorage : sessionStorage;
}

export function setAuth(token: string, user: unknown, persistent: boolean) {
  // 기존 저장소 모두 정리 (구버전 잔재 포함).
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  if (persistent) {
    localStorage.setItem('snowpan.persistent', '1');
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('snowpan.persistent');
    sessionStorage.setItem('user', JSON.stringify(user));
  }
  // 토큰은 항상 sessionStorage — XSS 시 영향 1시간 + 탭 닫으면 사라짐.
  sessionStorage.setItem('token', token);
}

export function setUser(user: unknown) {
  userStore().setItem('user', JSON.stringify(user));
}

export function getUser() {
  const raw = userStore().getItem('user') ?? sessionStorage.getItem('user') ?? localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getToken() {
  // 토큰은 sessionStorage 만. localStorage 의 옛 토큰은 무시 (안전).
  return sessionStorage.getItem('token');
}

export function isPersistentLogin() {
  return localStorage.getItem('snowpan.persistent') === '1';
}

// 앱 시작 시 호출 — sessionStorage 에 토큰 없지만 user 정보가 있으면 (새 탭 등)
// refresh 쿠키로 access 토큰 자동 복원. persistent 사용자가 새 탭 열어도 로그인 유지.
export async function restoreSession(): Promise<void> {
  if (sessionStorage.getItem('token')) return;
  if (!getUser()) return;
  await tryRefreshAccessToken();
}

export function logout() {
  // 백엔드에 refresh 쿠키 제거 요청 (실패해도 진행).
  fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('snowpan.persistent');
}

export const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

// Bunny CDN Optimizer — URL 뒤 ?width= 로 자동 리사이즈 + WebP/AVIF 변환.
// (Bunny 대시보드에서 Optimizer 켜져 있어야 동작; 안 켜도 원본은 정상 서빙)
function transformBunny(url: string, width?: number): string {
  if (!url.includes('.b-cdn.net')) return url;
  if (url.includes('?')) return url; // 이미 파라미터 있으면 그대로
  return width ? `${url}?width=${width}` : url;
}

// Cloudinary 자동 최적화 (옛 이미지 호환) — f_auto/q_auto + 옵셔널 width.
function transformCloudinary(url: string, width?: number): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  if (/\/image\/upload\/[^/]*(f_auto|q_auto|w_\d+)/.test(url)) return url;
  const params = ['f_auto', 'q_auto'];
  if (width) params.push(`w_${width}`, 'c_limit');
  return url.replace('/image/upload/', `/image/upload/${params.join(',')}/`);
}

// 외부 placeholder (picsum.photos) 가 차단되거나 느릴 때 로컬 SVG 로 폴백.
// 기존 DB row 들이 가진 picsum URL 도 자동 교체.
const LOCAL_PLACEHOLDER = '/icons/placeholder-card.svg';

export function imageUrl(src: string, width?: number): string {
  if (!src) return src;
  if (src.includes('picsum.photos')) return LOCAL_PLACEHOLDER;
  if (src.includes('.b-cdn.net')) return transformBunny(src, width);
  if (src.startsWith('http')) return transformCloudinary(src, width);
  if (src.startsWith('/')) {
    if (src.startsWith('/icons/') || src.startsWith('/uploads/')) return src;
    return `${SERVER_URL}${src}`;
  }
  return src;
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    // Skip compression for videos
    if (file.type.startsWith('video/')) {
      resolve(file);
      return;
    }
    // 300KB 미만은 스킵 (기존 1MB 였음 — 당근/번개 패턴 참고해 임계값 낮춤).
    if (file.size <= 300 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // WebP 우선 (Safari 14+, Chrome/Firefox 지원 광범위). PNG 는 알파채널 보존 위해 유지.
      // Cloudinary 가 서빙 시 다시 AVIF 로 재변환할 수도 있지만 업로드 시점 대역폭은 이걸로 이미 절감.
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
      const ext = outputType === 'image/png' ? '.png' : '.webp';
      // 확장자 교체 — .jpg/.jpeg → .webp
      const nameBase = file.name.replace(/\.(jpe?g|png|webp|avif|heic|heif)$/i, '');
      const finalName = `${nameBase}${ext}`;
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], finalName, { type: outputType, lastModified: Date.now() });
          resolve(compressed);
        },
        outputType,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // 브라우저가 디코드 못 하는 포맷 (예: 안드로이드 크롬의 HEIC) 은 압축 스킵하고
      // 원본 그대로 업로드 — reject 하면 Promise.all 이 배치 전체를 실패시킴.
      resolve(file);
    };
    img.src = url;
  });
}

export async function uploadImages(files: File[]): Promise<string[]> {
  // Compress images before uploading (max 1200px width, 0.8 quality for JPEG)
  const compressed = await Promise.all(
    // 1000px 이상 넘길 이유 없음 (모바일 폰 폭 448, 상세 페이지에서도 x2 retina = 896px).
    // WebP 0.82 는 육안 무손실에 가까우면서 JPEG 대비 30% 작음.
    files.map((f) => compressImage(f, 1000, 0.82))
  );

  const formData = new FormData();
  compressed.forEach(f => formData.append('images', f));

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '업로드 실패');
  return data.urls as string[];
}
