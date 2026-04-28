const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const stored = getToken();
    if (stored) headers['Authorization'] = `Bearer ${stored}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('인터넷 연결이 끊어졌습니다. 네트워크를 확인해주세요.');
    }
    throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }

  let data: any;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    if (res.status === 401 && getToken() && !window.location.pathname.includes('/login')) {
      logout();
      setTimeout(() => { window.location.href = '/login'; }, 0);
    }
    if (res.status === 429) {
      const retry = res.headers.get('Retry-After');
      throw new Error(data.error || `요청이 너무 많습니다. ${retry ? retry + '초 후 ' : '잠시 후 '}다시 시도해주세요.`);
    }
    if (res.status >= 500) {
      throw new Error(data.error || '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
    if (res.status === 403) throw new Error(data.error || '권한이 없습니다.');
    if (res.status === 404) throw new Error(data.error || '요청한 정보를 찾을 수 없습니다.');
    throw new Error(data.error || `요청에 실패했습니다. (${res.status})`);
  }
  return data as T;
}

// 저장 위치: autoLogin=true 이면 localStorage (브라우저 닫아도 유지),
// 아니면 sessionStorage (탭 닫으면 사라짐).
function authStore(): Storage {
  return localStorage.getItem('snowpan.persistent') === '1' ? localStorage : sessionStorage;
}

export function setAuth(token: string, user: unknown, persistent: boolean) {
  // 기존 저장소 정리 후 새 위치에 기록
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  if (persistent) {
    localStorage.setItem('snowpan.persistent', '1');
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('snowpan.persistent');
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
  }
}

export function setUser(user: unknown) {
  // 기존 저장 위치를 유지하며 user 정보만 갱신
  authStore().setItem('user', JSON.stringify(user));
}

export function getUser() {
  const raw = authStore().getItem('user') ?? sessionStorage.getItem('user') ?? localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getToken() {
  return authStore().getItem('token') ?? sessionStorage.getItem('token') ?? localStorage.getItem('token');
}

export function isPersistentLogin() {
  return localStorage.getItem('snowpan.persistent') === '1';
}

export function logout() {
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('snowpan.persistent');
}

export const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

// Cloudinary 자동 최적화: f_auto (WebP/AVIF 자동), q_auto (적응형 품질), 옵셔널 width 리사이즈.
// res.cloudinary.com/<cloud>/image/upload/... 형태에서만 삽입. 다른 CDN / picsum 은 원본 그대로.
function transformCloudinary(url: string, width?: number): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  // 이미 변환이 들어있으면 그대로 반환
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
  if (src.startsWith('http')) return transformCloudinary(src, width);
  if (src.startsWith('/')) {
    if (src.startsWith('/icons/') || src.startsWith('/uploads/')) return src;
    return `${SERVER_URL}${src}`;
  }
  return src;
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip compression for videos
    if (file.type.startsWith('video/')) {
      resolve(file);
      return;
    }
    // Skip if smaller than 1MB
    if (file.size <= 1024 * 1024) {
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

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], file.name, { type: outputType, lastModified: Date.now() });
          resolve(compressed);
        },
        outputType,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 압축 실패'));
    };
    img.src = url;
  });
}

export async function uploadImages(files: File[]): Promise<string[]> {
  // Compress images before uploading (max 1200px width, 0.8 quality for JPEG)
  const compressed = await Promise.all(
    files.map((f) => compressImage(f, 1200, 0.8))
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
