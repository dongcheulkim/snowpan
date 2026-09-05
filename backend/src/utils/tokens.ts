// Access + Refresh 듀얼 토큰 시스템.
// - access: 1시간 짧게, JS 가 읽음 (sessionStorage). XSS 탈취 시 영향 1h 로 제한.
// - refresh: 14일, HttpOnly Secure 쿠키 — JS 접근 불가, XSS 무력.
//   별도 시크릿 (JWT_REFRESH_SECRET) 으로 서명 → access 시크릿 유출돼도 refresh 안 풀림.

import jwt from 'jsonwebtoken';
import type { Response, CookieOptions } from 'express';
import prisma from '../config/database';

const ACCESS_TTL = '1h';
const REFRESH_TTL = '14d';
const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;
// "이 브라우저에서 자동 로그인" 미선택 시 — 세션 쿠키 (브라우저 닫으면 만료).
const SESSION_TTL_MS = undefined;

// 두 secret 분리 — access 누출돼도 refresh 위조 불가.
// JWT_REFRESH_SECRET 미설정 시 access 시크릿에서 파생 (보안 약화). 프로덕션 env
// 에 별도 시크릿 설정 권장 — 운영자가 Render env 에 추가하면 자동으로 분리됨.
function getSecrets(): { access: string; refresh: string } {
  const access = process.env.JWT_SECRET;
  if (!access) throw new Error('JWT_SECRET 미설정');
  const refresh = process.env.JWT_REFRESH_SECRET || `${access}::refresh`;
  return { access, refresh };
}

export interface AccessPayload { userId: string; email: string; role: string; type: 'access'; tv?: number; }
// jti = unique token ID, fam = token family (rotation 추적용). rem = 자동로그인 선택 여부.
export interface RefreshPayload { userId: string; type: 'refresh'; jti: string; fam: string; rem?: boolean; tv?: number; }

export function signAccessToken(user: { id: string; email: string; role: string; tokenVersion?: number }): string {
  const { access } = getSecrets();
  // tv = 세션 세대. 무효화(비번변경 등) 시 User.tokenVersion 이 +1 되고 기존 토큰은 전부 불일치로 거절.
  return jwt.sign({ userId: user.id, email: user.email, role: user.role, type: 'access', tv: user.tokenVersion ?? 0 }, access, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(userId: string, family?: string, remember = true, tokenVersion = 0): string {
  const { refresh } = getSecrets();
  const jti = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fam = family || `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return jwt.sign({ userId, type: 'refresh', jti, fam, rem: remember, tv: tokenVersion }, refresh, { expiresIn: REFRESH_TTL });
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

// jti 소비 결과: 'ok'(첫 사용) | 'grace'(짧은 시간 내 재사용 = 멀티탭 동시 갱신, 도난 아님) | 'replay'(도난 의심).
// 여러 탭이 같은 refresh 쿠키로 동시에 갱신하면 같은 jti 를 거의 동시에 쓰는데, 이를 도난으로 오판해
// 양쪽 다 강제 로그아웃하던 문제를 유예창(10초)으로 방지.
const JTI_GRACE_MS = 10_000;
export function consumeJti(jti: string): 'ok' | 'grace' | 'replay' {
  const now = Date.now();
  const prev = usedJtis.get(jti);
  if (prev === undefined) { usedJtis.set(jti, now); return 'ok'; }
  if (now - prev < JTI_GRACE_MS) return 'grace';
  return 'replay';
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
  // tokenVersion +1 이 1차 (즉시·영속·같은-초 경계 없음) — 이후 발급 토큰만 새 tv 를 가짐.
  // sessionInvalidBefore 는 tv 클레임 없는 전환기 구토큰 차단용으로 병행 유지.
  prisma.user.update({ where: { id: userId }, data: { sessionInvalidBefore: new Date(), tokenVersion: { increment: 1 } } }).catch(() => {});
}

// 토큰 iat 가 사용자 무효화 시각보다 이전이면 → 무효 (인메모리 캐시 기준, 빠른 경로).
// auth middleware / refresh 에서 호출.
export function isTokenIatStale(userId: string, iat: number | undefined): boolean {
  if (!iat) return false;
  const cutoff = userInvalidatedAt.get(userId);
  if (!cutoff) return false;
  // strict < : 무효화 직후 같은 초에 재로그인한 '정상' 토큰(iat==cutoff)은 통과시켜야 함.
  // (<= 로 하면 비번변경 직후 재로그인 세션까지 튕겨내 실사용을 깨뜨림 — E2E 로 확인)
  // 같은 초에 발급된 '탈취' 토큰만 통과하는 극히 드문 창은 tokenVersion 도입으로 후속 해결.
  return iat < cutoff;
}

// tv(토큰 세대) 불일치 판정 — tv 없는 구토큰은 0 으로 간주 (User.tokenVersion 기본 0 과 일치해
// 무효화 이력 없는 유저의 기존 세션은 그대로 유효, 한 번이라도 무효화된 유저의 구토큰은 거절).
export function isTokenVersionStale(tokenTv: number | undefined, userTokenVersion: number): boolean {
  return (tokenTv ?? 0) !== userTokenVersion;
}

// DB 의 sessionInvalidBefore 기준 판정 (재시작 후에도 유효한 영속 경로).
// 이미 조회한 user 레코드의 값을 넘겨 추가 쿼리 없이 검사. 초 단위 strict 비교(인메모리와 동일 의미).
export function isIatBeforeInvalidation(iat: number | undefined, sessionInvalidBefore: Date | null | undefined): boolean {
  if (!iat || !sessionInvalidBefore) return false;
  return iat < Math.floor(sessionInvalidBefore.getTime() / 1000);
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
export function setRefreshCookie(res: Response, userId: string, remember: boolean, family?: string, tokenVersion = 0): void {
  const token = signRefreshToken(userId, family, remember, tokenVersion);
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(remember));
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}
