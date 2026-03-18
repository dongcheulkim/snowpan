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
    const stored = localStorage.getItem('token');
    if (stored) headers['Authorization'] = `Bearer ${stored}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '요청에 실패했습니다.');
  return data as T;
}

export function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function getToken() {
  return localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

export const SERVER_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '');

export function imageUrl(src: string): string {
  if (!src || src.startsWith('http')) return src;
  if (src.startsWith('/')) return `${SERVER_URL}${src}`;
  return src;
}

export async function uploadImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '업로드 실패');
  const baseUrl = API_BASE.replace('/api', '');
  return (data.urls as string[]).map(u => `${baseUrl}${u}`);
}
