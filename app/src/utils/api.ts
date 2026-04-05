import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://snowpan.onrender.com/api';
export const SERVER_URL = 'https://snowpan.onrender.com';

interface ApiOptions {
  method?: string;
  body?: unknown;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const token = await SecureStore.getItemAsync('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    if (res.status === 401 && token) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    }
    throw new Error(data.error || '요청에 실패했습니다.');
  }
  return data as T;
}

export async function getUser() {
  const raw = await SecureStore.getItemAsync('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function getToken() {
  return await SecureStore.getItemAsync('token');
}

export async function saveAuth(token: string, user: object) {
  await SecureStore.setItemAsync('token', token);
  await SecureStore.setItemAsync('user', JSON.stringify(user));
}

export async function logout() {
  await SecureStore.deleteItemAsync('token');
  await SecureStore.deleteItemAsync('user');
}
