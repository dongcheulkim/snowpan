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
// jti = unique token ID, fam = token family (rotation 추적용).
export interface RefreshPayload { userId: string; type: 'refresh'; jti: string; fam: string; }

export function signAccessToken(user: { id: string; email: string; role: string }): string {
  const { access } = getSecrets();
  return jwt.sign({ userId: user.id, email: user.email, role: user.role, type: 'access' }, access, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(userId: string, family?: string): string {
  const { refresh } = getSecrets();
  const jti = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fam = family || `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return jwt.sign({ userId, type: 'refresh', jti, fam }, refresh, { expiresIn: REFRESH_TTL });
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const { refresh } = getSecrets();
  const decoded = jwt.verify(token, refresh, {
    algorithms: ['HS256'],
    ignoreExpiration: false,
  }) as RefreshPayload;
  if (decoded.type !== 'refresh') throw new Error('잘못된 토큰 타입');
  if (!decoded.jti || !decoded.fam) throw new Error('레거시 토큰');
  return decoded;
}

// 사용된 jti 추적 — rotation 시 옛 jti 가 재사용되면 도난 의심 → family 통째로 무효화.
// 메모리 캐시 (재시작 시 초기화 OK — 재시작이 곧 강제 rotation).
const usedJtis = new Map<string, number>(); // jti → timestamp
const revokedFamilies = new Map<string, number>(); // family → timestamp
const TOKEN_DEDUP_MS = 14 * 24 * 60 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of usedJtis) if (now - ts > TOKEN_DEDUP_MS) usedJtis.delete(k);
  for (const [k, ts] of revokedFamilies) if (now - ts > TOKEN_DEDUP_MS) revokedFamilies.delete(k);
}, 60 * 60_000);

export function isFamilyRevoked(fam: string): boolean {
  return revokedFamilies.has(fam);
}

export function revokeFamily(fam: string): void {
  revokedFamilies.set(fam, Date.now());
}

// jti 가 처음 사용되면 등록하고 OK 반환. 이미 사용된 적이 있으면 false (replay).
export function consumeJti(jti: string): boolean {
  if (usedJtis.has(jti)) return false;
  usedJtis.set(jti, Date.now());
  return true;
}

// 사용자 단위 토큰 무효화 — 비밀번호 변경/탈퇴/정지 시 호출.
// userId → 무효화 시각 (초). 이 시각 이후 발급된 토큰만 유효 (iat 비교).
// JWT 자체는 stateless 라 비번 바꿔도 옛 토큰 살아있는 문제 → 메모리 마커 로 차단.
const userInvalidatedAt = new Map<string, number>(); // userId → unix seconds

setInterval(() => {
  const cutoff = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60; // 14일 지난 항목 정리
  for (const [k, ts] of userInvalidatedAt) {
    if (ts < cutoff) userInvalidatedAt.delete(k);
  }
}, 60 * 60_000);

export function invalidateUserTokens(userId: string): void {
  userInvalidatedAt.set(userId, Math.floor(Date.now() / 1000));
}

// 토큰 iat 가 사용자 무효화 시각보다 이전이면 → 무효.
// auth middleware / refresh 에서 호출.
export function isTokenIatStale(userId: string, iat: number | undefined): boolean {
  if (!iat) return false;
  const cutoff = userInvalidatedAt.get(userId);
  if (!cutoff) return false;
  return iat < cutoff;
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

// 로그인/등록 시 쿠키 설정 헬퍼. family 미지정 → 새 family 생성 (새 로그인).
// rotation 시는 같은 family 유지 → 도난 감지 가능.
export function setRefreshCookie(res: Response, userId: string, remember: boolean, family?: string): void {
  const token = signRefreshToken(userId, family);
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(remember));
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}
