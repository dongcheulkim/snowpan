// Access + Refresh 듀얼 토큰 시스템.
// - access: 1시간 짧게, JS 가 읽음 (sessionStorage). XSS 탈취 시 영향 1h 로 제한.
// - refresh: 14일, HttpOnly Secure 쿠키 — JS 접근 불가, XSS 무력.
//   별도 시크릿 (JWT_REFRESH_SECRET) 으로 서명 → access 시크릿 유출돼도 refresh 안 풀림.

import jwt from 'jsonwebtoken';
import type { Response, CookieOptions } from 'express';

const ACCESS_TTL = '1h';
const REFRESH_TTL = '14d';
const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;
// "이 브라우저에서 자동 로그인" 미선택 시 — 세션 쿠키 (브라우저 닫으면 만료).
const SESSION_TTL_MS = undefined;

// 두 secret 분리 — access 누출돼도 refresh 위조 불가.
function getSecrets(): { access: string; refresh: string } {
  const access = process.env.JWT_SECRET;
  if (!access) throw new Error('JWT_SECRET 미설정');
  // refresh secret 별도 — env 있으면 사용, 없으면 access secret 의 변형.
  const refresh = process.env.JWT_REFRESH_SECRET || `${access}::refresh`;
  return { access, refresh };
}

export interface AccessPayload { userId: string; email: string; role: string; type: 'access'; }
export interface RefreshPayload { userId: string; type: 'refresh'; }

export function signAccessToken(user: { id: string; email: string; role: string }): string {
  const { access } = getSecrets();
  return jwt.sign({ userId: user.id, email: user.email, role: user.role, type: 'access' }, access, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(userId: string): string {
  const { refresh } = getSecrets();
  return jwt.sign({ userId, type: 'refresh' }, refresh, { expiresIn: REFRESH_TTL });
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const { refresh } = getSecrets();
  const decoded = jwt.verify(token, refresh) as RefreshPayload;
  if (decoded.type !== 'refresh') throw new Error('잘못된 토큰 타입');
  return decoded;
}

// 쿠키 옵션 — cross-domain (vercel ↔ render) 대응.
// SameSite=None + Secure 필수, HttpOnly 로 JS 접근 차단.
// remember=true 면 14일 만료, false 면 세션 쿠키.
export function refreshCookieOptions(remember: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/api/auth',
    maxAge: remember ? REFRESH_TTL_MS : SESSION_TTL_MS,
  };
}

export const REFRESH_COOKIE_NAME = 'snowpan_rt';

// 로그인/등록 시 쿠키 설정 헬퍼.
export function setRefreshCookie(res: Response, userId: string, remember: boolean): void {
  const token = signRefreshToken(userId);
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(remember));
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}
