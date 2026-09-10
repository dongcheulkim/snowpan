import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import prisma from '../config/database';
import { signAccessToken, signRefreshToken, setRefreshCookie } from '../utils/tokens';
import { normalizeEmail } from '../utils/validate';

// 소셜 로그인 (카카오/네이버). 서버사이드 OAuth authorization code flow.
// 키: KAKAO_CLIENT_ID (+옵션 KAKAO_CLIENT_SECRET), NAVER_LOGIN_CLIENT_ID/SECRET.
//   ⚠️ 네이버 로그인은 검색 API(NAVER_CLIENT_ID)와 다른 앱 키 — NAVER_LOGIN_* 사용.
// FRONTEND_URL 로 콜백 후 리다이렉트.

const FRONTEND = () => process.env.FRONTEND_URL || 'https://snowpan.kr';
const API_BASE = () => process.env.RENDER_EXTERNAL_URL || 'https://snowpan.onrender.com';
const APP_SCHEME = 'kr.snowpan.app'; // Capacitor 앱 커스텀 스킴 (딥링크로 토큰 되돌림)

// ===== OAuth state (CSRF/로그인 고정 방지) =====
// state = `${platform}.${nonce}`. nonce 를 시작 시 HttpOnly 쿠키에 저장하고
// 콜백에서 쿼리의 nonce 와 대조 → 공격자가 자기 code 로 피해자를 로그인시키는 것 차단.
const STATE_COOKIE = 'snowpan_oauth_state';
function setStateCookie(res: Response, nonce: string): void {
  // refresh 쿠키와 동일하게 cross-site 대응(None+Secure), 짧게 10분, /api/auth 스코프.
  res.cookie(STATE_COOKIE, nonce, {
    httpOnly: true, secure: true, sameSite: 'none', path: '/api/auth', maxAge: 10 * 60 * 1000,
  });
}
function makeState(req: Request, res: Response): string {
  const platform = req.query.platform === 'app' ? 'app' : 'web';
  const nonce = crypto.randomBytes(16).toString('hex');
  setStateCookie(res, nonce);
  return `${platform}.${nonce}`;
}
// 콜백 state 검증 — 쿠키 nonce 와 일치해야 통과. 검증 후 쿠키는 즉시 제거(1회용).
function verifyState(req: Request, res: Response): boolean {
  const stateParam = String(req.query.state || '');
  const cookieNonce = (req as Request & { cookies?: Record<string, string> }).cookies?.[STATE_COOKIE];
  const nonce = stateParam.includes('.') ? stateParam.slice(stateParam.indexOf('.') + 1) : '';
  res.clearCookie(STATE_COOKIE, { path: '/api/auth' });
  return Boolean(cookieNonce) && Boolean(nonce) && cookieNonce === nonce;
}

interface SocialProfile {
  provider: 'kakao' | 'naver' | 'apple';
  providerId: string;
  email?: string | null;
  emailVerified?: boolean; // 제공자가 이메일 인증됨을 보증하는가 (카카오 is_email_verified / 네이버는 true)
  name?: string | null;
  profileImage?: string | null;
}

// 소셜 프로필 → 유저 조회/생성 후 우리 토큰 발급 + 리다이렉트.
// isApp=true 면 웹(snowpan.kr) 대신 앱 커스텀 스킴(kr.snowpan.app://)으로 딥링크 리다이렉트.
// 소셜 프로필 → 유저 조회/연결/생성. 리다이렉트(카카오·네이버)와 JSON 응답(Apple 네이티브) 양쪽이 같이 쓴다.
type ResolvedUser = { user: User; isNew: boolean } | { error: string; status: number };
async function resolveUser(profile: SocialProfile): Promise<ResolvedUser> {
  // 인증된 이메일만 신뢰 — 미인증 이메일로 기존 계정에 붙는 탈취 차단. 정규화(소문자/trim)해서 이메일가입과 동일 규칙.
  const verifiedEmail = profile.emailVerified && profile.email ? normalizeEmail(profile.email) : null;

  // 1) (provider, providerId) 로 기존 소셜 유저 조회.
  let user = await prisma.user.findFirst({ where: { provider: profile.provider, providerId: profile.providerId } });

  // 2) 없으면 "인증된" 이메일로만 기존 계정 연결. 그 계정이 이미 다른 소셜에 연결돼 있으면 덮지 않음.
  if (!user && verifiedEmail) {
    const byEmail = await prisma.user.findUnique({ where: { email: verifiedEmail } });
    if (byEmail && !byEmail.provider) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { provider: profile.provider, providerId: profile.providerId, profileImage: byEmail.profileImage || profile.profileImage || null },
      });
    } else if (byEmail) {
      // 이미 다른 로그인 수단(다른 소셜/이메일)에 연결된 계정 — 자동 병합 시 계정 탈취 위험.
      // 세션 발급하지 않고 원래 로그인 방법으로 유도.
      return { error: '이미 다른 방법으로 가입된 이메일이에요. 기존 로그인 방법으로 로그인해주세요.', status: 409 };
    }
  }

  // 3) 그래도 없으면 신규 생성. 인증 이메일 없으면 placeholder (@social.local) — unique 보장.
  let isNew = false;
  if (!user) {
    const email = verifiedEmail || `${profile.provider}_${profile.providerId}@social.local`;
    user = await prisma.user.create({
      data: {
        email,
        password: null,
        name: profile.name || '스노우판 유저',
        phone: null,
        provider: profile.provider,
        providerId: profile.providerId,
        profileImage: profile.profileImage || null,
      },
    });
    isNew = true;
  }

  // 탈퇴/차단 계정은 소셜로도 재로그인 불가 — 토큰 발급 전 차단.
  if (user.role === 'deleted' || user.role === 'banned') {
    return { error: '이용이 제한된 계정입니다.', status: 403 };
  }
  return { user, isNew };
}

const minimalUser = (user: User) => ({ id: user.id, email: user.email, name: user.name, nickname: user.nickname, role: user.role, phone: user.phone, profileImage: user.profileImage, provider: user.provider });

async function completeLogin(res: Response, profile: SocialProfile, isApp: boolean): Promise<void> {
  const resolved = await resolveUser(profile);
  if ('error' in resolved) return fail(res, resolved.error, isApp);
  const { user, isNew } = resolved;

  // (포인트 시스템 제거) 가입 보너스 없음.

  // 우리 토큰 발급 + refresh 쿠키(소셜은 지속 로그인). 프론트로 토큰·유저 전달.
  const token = signAccessToken(user);
  setRefreshCookie(res, user.id, true, undefined, user.tokenVersion);
  const payload = Buffer.from(JSON.stringify(minimalUser(user))).toString('base64url');
  // isNew=1 이면 프론트가 온보딩(/welcome)으로 보냄 — 닉네임·약관 미완료 신규 소셜 유저.
  let hash = `#token=${encodeURIComponent(token)}&user=${payload}&provider=${profile.provider}&isNew=${isNew ? 1 : 0}`;
  // 앱: refresh 쿠키가 인앱 브라우저에만 심기고 웹뷰엔 없어 지속 로그인이 안 됐음 →
  // 딥링크에 refresh 토큰을 실어 앱이 저장 (rotation·도난감지는 쿠키 채널과 동일 적용).
  if (isApp) hash += `&refresh=${encodeURIComponent(signRefreshToken(user.id, undefined, true, user.tokenVersion))}`;
  // 앱: 커스텀 스킴 딥링크로 토큰 반환 → 앱이 받아 로그인. 웹: 기존 /oauth/callback.
  res.redirect(isApp ? `${APP_SCHEME}://oauth/callback${hash}` : `${FRONTEND()}/oauth/callback${hash}`);
}

function fail(res: Response, msg: string, isApp = false): void {
  const q = `social_error=${encodeURIComponent(msg)}`;
  res.redirect(isApp ? `${APP_SCHEME}://login?${q}` : `${FRONTEND()}/login?${q}`);
}

// ===== 카카오 =====
// 소셜 프로필 사진 URL 정리 — 카카오가 http 로 주는 경우가 있는데, https 사이트·앱에서 mixed-content 로 차단돼
// 프로필이 깨져 보인다(2026-09-09 사용자 신고). 저장 시점에 https 로 올려 둔다.
function httpsProfile(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith('http://') ? 'https://' + url.slice('http://'.length) : url;
}

export function kakaoConfigured() { return Boolean(process.env.KAKAO_CLIENT_ID); }

export const kakaoStart = (req: Request, res: Response): void => {
  if (!kakaoConfigured()) { res.status(503).json({ error: '카카오 로그인 준비 중입니다.' }); return; }
  const redirectUri = `${API_BASE()}/api/auth/kakao/callback`;
  // state = platform.nonce — platform 으로 앱 딥링크 판단, nonce 로 CSRF 검증.
  const state = makeState(req, res);
  const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  res.redirect(url);
};

export const kakaoCallback = async (req: Request, res: Response): Promise<void> => {
  const isApp = String(req.query.state || '').startsWith('app.');
  try {
    // CSRF: 시작 시 심은 nonce 쿠키와 state 대조. 불일치면 위조 요청.
    if (!verifyState(req, res)) return fail(res, '로그인 요청이 만료됐거나 유효하지 않아요. 다시 시도해주세요.', isApp);
    const code = String(req.query.code || '');
    if (!code) return fail(res, '인증 코드가 없습니다.', isApp);
    const redirectUri = `${API_BASE()}/api/auth/kakao/callback`;

    // 토큰 교환
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID!,
        redirect_uri: redirectUri,
        code,
        ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_code?: string; error_description?: string };
    if (!tokenData.access_token) {
      console.error('카카오 토큰 발급 실패:', tokenData);
      const detail = tokenData.error_description || tokenData.error_code || tokenData.error || '알 수 없음';
      return fail(res, `카카오 토큰 발급 실패: ${detail}`, isApp);
    }

    // 프로필 조회
    const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json() as { id?: number; msg?: string; code?: number; kakao_account?: { email?: string; is_email_verified?: boolean; profile?: { nickname?: string; profile_image_url?: string } } };
    if (!me.id) {
      console.error('카카오 프로필 조회 실패:', me);
      return fail(res, `카카오 프로필 조회 실패: ${me.msg || '알 수 없음'}`, isApp);
    }

    await completeLogin(res, {
      provider: 'kakao',
      providerId: String(me.id),
      email: me.kakao_account?.email || null,
      emailVerified: me.kakao_account?.is_email_verified === true,
      name: me.kakao_account?.profile?.nickname || null,
      profileImage: httpsProfile(me.kakao_account?.profile?.profile_image_url),
    }, isApp);
  } catch (err) {
    console.error('카카오 콜백 에러:', err);
    fail(res, '로그인 처리 중 오류가 발생했습니다.', isApp);
  }
};

// ===== 네이버 =====
export function naverLoginConfigured() { return Boolean(process.env.NAVER_LOGIN_CLIENT_ID && process.env.NAVER_LOGIN_CLIENT_SECRET); }

export const naverStart = (req: Request, res: Response): void => {
  if (!naverLoginConfigured()) { res.status(503).json({ error: '네이버 로그인 준비 중입니다.' }); return; }
  const redirectUri = `${API_BASE()}/api/auth/naver/callback`;
  // state = platform.nonce (카카오와 동일 규칙). nonce 쿠키로 CSRF 검증.
  const state = makeState(req, res);
  const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${process.env.NAVER_LOGIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  res.redirect(url);
};

export const naverCallback = async (req: Request, res: Response): Promise<void> => {
  const isApp = String(req.query.state || '').startsWith('app.');
  try {
    const state = String(req.query.state || '');
    // CSRF: nonce 쿠키 대조. (verifyState 가 쿠키를 소비하므로 토큰 교환 전에 호출)
    if (!verifyState(req, res)) return fail(res, '로그인 요청이 만료됐거나 유효하지 않아요. 다시 시도해주세요.', isApp);
    const code = String(req.query.code || '');
    if (!code) return fail(res, '인증 코드가 없습니다.', isApp);
    const redirectUri = `${API_BASE()}/api/auth/naver/callback`;

    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_LOGIN_CLIENT_ID}&client_secret=${process.env.NAVER_LOGIN_CLIENT_SECRET}&code=${code}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`);
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
    if (!tokenData.access_token) {
      console.error('네이버 토큰 발급 실패:', tokenData);
      return fail(res, `네이버 토큰 발급 실패: ${tokenData.error_description || tokenData.error || '알 수 없음'}`, isApp);
    }

    const meRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json() as { response?: { id?: string; email?: string; name?: string; nickname?: string; profile_image?: string } };
    const r = me.response;
    if (!r?.id) return fail(res, '네이버 프로필 조회 실패', isApp);

    await completeLogin(res, {
      provider: 'naver',
      providerId: r.id,
      email: r.email || null,
      emailVerified: !!r.email, // 네이버 로그인 이메일은 인증된 값
      name: r.name || r.nickname || null,
      profileImage: httpsProfile(r.profile_image),
    }, isApp);
  } catch (err) {
    console.error('네이버 콜백 에러:', err);
    fail(res, '로그인 처리 중 오류가 발생했습니다.', isApp);
  }
};

// ===== Apple (Sign in with Apple — iOS 앱 네이티브 시트) =====
// 앱이 네이티브로 받은 identityToken(JWT)을 서버가 애플 공개키로 검증한 뒤 유저를 조회·생성하고 우리 토큰을 JSON 으로 돌려준다.
// 앱스토어 심사 지침 4.8: 카카오 같은 제3자 로그인을 쓰는 앱은 Apple 로그인도 함께 제공해야 함 (2026-09-10).
// 탈퇴 시 애플 쪽 연결도 끊으려면(지침 요구) APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY(.p8, 줄바꿈은 \n) 를 설정 —
// 없으면 로그인은 되고 철회만 건너뛴다.
const APPLE_ISS = 'https://appleid.apple.com';
// iOS 번들 ID. 'kr.snowpan.app' 은 애플에 다른 팀이 이미 등록해 둔 상태라 iOS 는 kr.snowpan.ios (딥링크 스킴 APP_SCHEME 과 다름).
const APPLE_CLIENT_ID = () => process.env.APPLE_BUNDLE_ID || 'kr.snowpan.ios';
const APPLE_AUDIENCES = (): [string, ...string[]] => [APPLE_CLIENT_ID(), ...(process.env.APPLE_SERVICES_ID ? [process.env.APPLE_SERVICES_ID] : [])];
const APPLE_FETCH_TIMEOUT = 8000;

let appleKeyCache: { fetchedAt: number; keys: Array<Record<string, string>> } | null = null;
async function appleKeys(force = false): Promise<Array<Record<string, string>>> {
  if (!force && appleKeyCache && Date.now() - appleKeyCache.fetchedAt < 60 * 60 * 1000) return appleKeyCache.keys;
  const r = await fetch(`${APPLE_ISS}/auth/keys`, { signal: AbortSignal.timeout(APPLE_FETCH_TIMEOUT) });
  if (!r.ok) throw new Error(`apple keys ${r.status}`);
  const j = (await r.json()) as { keys?: Array<Record<string, string>> };
  appleKeyCache = { fetchedAt: Date.now(), keys: j.keys || [] };
  return appleKeyCache.keys;
}

// identityToken 검증: 서명(애플 JWKS, kid 로 선택) + iss + aud(번들 ID) + 만료. nonce 를 보냈으면 토큰의 nonce 와 대조.
async function verifyAppleIdentityToken(idToken: string, nonce?: string): Promise<jwt.JwtPayload> {
  const decoded = jwt.decode(idToken, { complete: true }) as { header?: { kid?: string; alg?: string } } | null;
  const kid = decoded?.header?.kid;
  if (!kid) throw new Error('no kid');
  let key = (await appleKeys()).find((k) => k.kid === kid);
  if (!key) key = (await appleKeys(true)).find((k) => k.kid === kid); // 키 회전 직후
  if (!key) throw new Error('unknown kid');
  const pem = crypto.createPublicKey({ key, format: 'jwk' }).export({ type: 'spki', format: 'pem' }) as string;
  const payload = jwt.verify(idToken, pem, { algorithms: ['RS256'], issuer: APPLE_ISS, audience: APPLE_AUDIENCES() }) as jwt.JwtPayload;
  if (nonce && typeof payload.nonce === 'string' && payload.nonce !== nonce) throw new Error('nonce mismatch');
  return payload;
}

// 애플 토큰 엔드포인트용 client_secret(ES256 JWT). 키 env 가 없으면 null → 철회 기능만 비활성.
function appleClientSecret(): string | null {
  const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = process.env;
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) return null;
  try {
    return jwt.sign({}, APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), {
      algorithm: 'ES256', keyid: APPLE_KEY_ID, issuer: APPLE_TEAM_ID, audience: APPLE_ISS, subject: APPLE_CLIENT_ID(), expiresIn: '5m',
    });
  } catch (e) {
    console.warn('apple client secret sign failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

// authorizationCode → refresh_token (탈퇴 시 철회에 씀). 키 미설정·실패 시 null.
async function appleExchangeCode(code: string): Promise<string | null> {
  const secret = appleClientSecret();
  if (!secret) return null;
  const body = new URLSearchParams({ client_id: APPLE_CLIENT_ID(), client_secret: secret, code, grant_type: 'authorization_code' });
  const r = await fetch(`${APPLE_ISS}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(APPLE_FETCH_TIMEOUT) });
  if (!r.ok) return null;
  const j = (await r.json()) as { refresh_token?: string };
  return j.refresh_token || null;
}

// 회원 탈퇴 시 애플 쪽 앱 연결 철회 (best-effort — 실패해도 탈퇴는 진행).
export async function revokeAppleToken(refreshToken: string | null | undefined): Promise<void> {
  if (!refreshToken) return;
  const secret = appleClientSecret();
  if (!secret) return;
  const body = new URLSearchParams({ client_id: APPLE_CLIENT_ID(), client_secret: secret, token: refreshToken, token_type_hint: 'refresh_token' });
  await fetch(`${APPLE_ISS}/auth/revoke`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(APPLE_FETCH_TIMEOUT) })
    .catch((e) => console.warn('apple revoke failed:', e instanceof Error ? e.message : e));
}

// POST /auth/apple { identityToken, authorizationCode?, givenName?, familyName?, nonce? }
export const appleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identityToken, authorizationCode, givenName, familyName, nonce } = (req.body || {}) as Record<string, unknown>;
    if (typeof identityToken !== 'string' || identityToken.length < 20 || identityToken.length > 8000) {
      res.status(400).json({ error: 'Apple 로그인 정보가 없어요. 다시 시도해 주세요.' });
      return;
    }
    let payload: jwt.JwtPayload;
    try {
      payload = await verifyAppleIdentityToken(identityToken, typeof nonce === 'string' && nonce.length <= 128 ? nonce : undefined);
    } catch (e) {
      console.warn('apple identity token rejected:', e instanceof Error ? e.message : e);
      res.status(401).json({ error: 'Apple 로그인 확인에 실패했어요. 다시 시도해 주세요.' });
      return;
    }
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    if (!sub) { res.status(401).json({ error: 'Apple 로그인 확인에 실패했어요. 다시 시도해 주세요.' }); return; }

    // 이름은 최초 동의 때 한 번만 옴(성+이름 순). 이메일은 비공개 릴레이(@privaterelay.appleid.com)일 수 있음 — 그대로 저장.
    const email = typeof payload.email === 'string' ? payload.email : null;
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    const nameParts = [familyName, givenName]
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((s) => s.trim().slice(0, 30));
    const profile: SocialProfile = { provider: 'apple', providerId: sub, email, emailVerified, name: nameParts.length ? nameParts.join('') : null, profileImage: null };

    const resolved = await resolveUser(profile);
    if ('error' in resolved) { res.status(resolved.status).json({ error: resolved.error }); return; }
    const { user, isNew } = resolved;

    // 탈퇴 시 철회용 refresh 토큰 — 키가 설정돼 있을 때만, 코드가 온 로그인마다 갱신.
    if (typeof authorizationCode === 'string' && authorizationCode.length > 0 && authorizationCode.length <= 2048) {
      const rt = await appleExchangeCode(authorizationCode).catch(() => null);
      if (rt) await prisma.user.update({ where: { id: user.id }, data: { appleRefreshToken: rt } }).catch(() => {});
    }

    // 앱 전용 엔드포인트 — refresh 토큰은 body 로(웹뷰엔 쿠키가 안 심김), 쿠키도 같이 내려 웹에서 써도 동작.
    const token = signAccessToken(user);
    setRefreshCookie(res, user.id, true, undefined, user.tokenVersion);
    const refreshToken = signRefreshToken(user.id, undefined, true, user.tokenVersion);
    res.json({ token, refreshToken, isNew, user: minimalUser(user) });
  } catch (e) {
    console.error('apple login error:', e);
    res.status(500).json({ error: 'Apple 로그인 처리 중 오류가 났어요. 잠시 후 다시 시도해 주세요.' });
  }
};
