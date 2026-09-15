import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import prisma from '../config/database';
import { signAccessToken, signRefreshToken, setRefreshCookie } from '../utils/tokens';
import { normalizeEmail } from '../utils/validate';
import { socialLockedUntil, emailLockedUntil, reregisterBlockedMessage } from '../utils/reregisterLock';
import { recordLogin } from '../utils/loginLog';

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
const LINK_COOKIE = 'snowpan_oauth_link';
// 로그인된 계정에 소셜을 "연결"하는 흐름 — 프론트가 /auth/link-ticket 으로 받은 10분짜리 티켓을 ?link= 로 넘기면
// 쿠키에 담아 두고 콜백에서 그 계정에 붙인다 (리다이렉트 흐름엔 Authorization 헤더가 없어서).
function makeState(req: Request, res: Response): string {
  const platform = req.query.platform === 'app' ? 'app' : 'web';
  const nonce = crypto.randomBytes(16).toString('hex');
  setStateCookie(res, nonce);
  const link = typeof req.query.link === 'string' ? req.query.link : '';
  if (link && verifyLinkTicket(link)) res.cookie(LINK_COOKIE, link, { httpOnly: true, secure: true, sameSite: 'none', path: '/api/auth', maxAge: 10 * 60 * 1000 });
  return `${platform}.${nonce}`;
}
function takeLinkUserId(req: Request, res: Response): string | null {
  const t = (req as Request & { cookies?: Record<string, string> }).cookies?.[LINK_COOKIE];
  res.clearCookie(LINK_COOKIE, { path: '/api/auth' });
  return t ? verifyLinkTicket(t) : null;
}
export function signLinkTicket(userId: string): string {
  return jwt.sign({ userId, purpose: 'link' }, process.env.JWT_SECRET!, { expiresIn: '10m' });
}
function verifyLinkTicket(t: string): string | null {
  try { const p = jwt.verify(t, process.env.JWT_SECRET!) as jwt.JwtPayload; return p.purpose === 'link' && typeof p.userId === 'string' ? p.userId : null; } catch { return null; }
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
// 한 계정에 로그인 방법 여러 개(user_logins). 검증된 이메일이 같으면 기존 계정에 자동으로 붙인다 (사용자 결정 2026-09-10 "애플이랑 카카오 합치기").
type ResolvedUser = { user: User; isNew: boolean } | { error: string; status: number };
const restricted = (u: User) => u.role === 'deleted' || u.role === 'banned';
async function resolveUser(profile: SocialProfile): Promise<ResolvedUser> {
  const verifiedEmail = profile.emailVerified && profile.email ? normalizeEmail(profile.email) : null;
  const key = { provider_providerId: { provider: profile.provider, providerId: profile.providerId } };

  // 1) 연결 테이블에서 조회
  const login = await prisma.userLogin.findUnique({ where: key, include: { user: true } });
  if (login) return restricted(login.user) ? { error: '이용이 제한된 계정입니다.', status: 403 } : { user: login.user, isNew: false };

  // 2) 옛 필드(users.provider/providerId)만 있는 계정 — 찾으면 연결 테이블에도 채워 둔다
  const legacy = await prisma.user.findFirst({ where: { provider: profile.provider, providerId: profile.providerId } });
  if (legacy) {
    await prisma.userLogin.create({ data: { userId: legacy.id, provider: profile.provider, providerId: profile.providerId, email: profile.email || null } }).catch(() => {});
    return restricted(legacy) ? { error: '이용이 제한된 계정입니다.', status: 403 } : { user: legacy, isNew: false };
  }

  // 3) 검증된 이메일이 같은 기존 계정이 있으면 자동 연결 (이메일 가입·다른 소셜 모두). 제공자가 인증한 이메일만 믿는다.
  if (verifiedEmail) {
    const byEmail = await prisma.user.findUnique({ where: { email: verifiedEmail } });
    if (byEmail) {
      if (restricted(byEmail)) return { error: '이용이 제한된 계정입니다.', status: 403 };
      const user = await linkProfileToUser(byEmail, profile);
      return { user, isNew: false };
    }
  }

  // 4) 신규 — 탈퇴 후 재가입 제한 확인 뒤 생성
  const lockedUntil = (await socialLockedUntil(profile.provider, profile.providerId)) || (verifiedEmail ? await emailLockedUntil(verifiedEmail) : null);
  if (lockedUntil) return { error: reregisterBlockedMessage(lockedUntil), status: 403 };
  const email = verifiedEmail || `${profile.provider}_${profile.providerId}@social.local`;
  const user = await prisma.user.create({
    data: {
      email, password: null, name: profile.name || '스노우판 유저', phone: null,
      provider: profile.provider, providerId: profile.providerId, profileImage: profile.profileImage || null,
      logins: { create: { provider: profile.provider, providerId: profile.providerId, email: profile.email || null } },
    },
  });
  return { user, isNew: true };
}

// 기존 계정에 소셜 로그인 하나를 붙인다. 이미 다른 계정에 붙어 있으면 거절.
async function linkProfileToUser(user: User, profile: SocialProfile): Promise<User> {
  const existing = await prisma.userLogin.findUnique({ where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } } });
  if (existing && existing.userId !== user.id) throw Object.assign(new Error('이미 다른 계정에 연결된 로그인이에요. 그 계정으로 로그인한 뒤 연결을 해제해 주세요.'), { status: 409 });
  if (!existing) await prisma.userLogin.create({ data: { userId: user.id, provider: profile.provider, providerId: profile.providerId, email: profile.email || null } });
  // 표시용 첫 소셜·프로필 사진이 비어 있으면 채운다
  const data: Record<string, unknown> = {};
  if (!user.provider) { data.provider = profile.provider; data.providerId = profile.providerId; }
  if (!user.profileImage && profile.profileImage) data.profileImage = profile.profileImage;
  return Object.keys(data).length ? prisma.user.update({ where: { id: user.id }, data }) : user;
}

export type LoginMethod = { provider: string; createdAt: Date; email: string | null };
export async function listLoginMethods(userId: string): Promise<LoginMethod[]> {
  const rows = await prisma.userLogin.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { provider: true, createdAt: true, email: true } });
  return rows;
}

const minimalUser = (user: User) => ({ id: user.id, email: user.email, name: user.name, nickname: user.nickname, role: user.role, phone: user.phone, profileImage: user.profileImage, provider: user.provider });

async function completeLogin(req: Request, res: Response, profile: SocialProfile, isApp: boolean): Promise<void> {
  // 연결 모드 — 로그인된 계정(티켓)에 이 소셜을 붙이고 마이페이지로 돌려보낸다 (토큰 발급 없음)
  const linkUserId = takeLinkUserId(req, res);
  if (linkUserId) {
    const dest = (q: string) => (isApp ? `${APP_SCHEME}://mypage?${q}` : `${FRONTEND()}/mypage?${q}`);
    try {
      const me = await prisma.user.findUnique({ where: { id: linkUserId } });
      if (!me || restricted(me)) return res.redirect(dest('link_error=' + encodeURIComponent('계정을 확인할 수 없어요.')));
      await linkProfileToUser(me, profile);
      recordLogin(req, me.id, profile.provider);
      return res.redirect(dest(`linked=${profile.provider}`));
    } catch (e) {
      return res.redirect(dest('link_error=' + encodeURIComponent(e instanceof Error ? e.message : '연결에 실패했어요.')));
    }
  }
  let resolved: ResolvedUser;
  try { resolved = await resolveUser(profile); } catch (e) { return fail(res, e instanceof Error ? e.message : '로그인 처리 중 오류', isApp); }
  if ('error' in resolved) return fail(res, resolved.error, isApp);
  const { user, isNew } = resolved;
  recordLogin(req, user.id, profile.provider);

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

    await completeLogin(req, res, {
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

    await completeLogin(req, res, {
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
// .p8 내용을 어떻게 붙여넣었든(한 줄, 따옴표, 리터럴 \n) PEM 으로 정리 — Render env 편집창에서 줄바꿈이 사라지는 경우 대비.
function normalizePem(raw: string): string {
  let k = raw.trim().replace(/\\n/g, '\n');
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1).trim();
  if (k.includes('\n')) return k;
  const m = k.match(/^-----BEGIN ([A-Z ]+)-----(.*)-----END \1-----$/s);
  if (!m) return k;
  const body = m[2].replace(/\s+/g, '');
  return `-----BEGIN ${m[1]}-----\n${(body.match(/.{1,64}/g) || []).join('\n')}\n-----END ${m[1]}-----`;
}
// 관리자 설정 상태 확인용 — 어떤 env 가 빠졌는지·키가 실제로 서명되는지 (값은 절대 안 나감).
export function appleRevokeStatus(): { configured: boolean; missing: string[]; keyParse: 'ok' | 'failed' | 'n/a' } {
  const missing = ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'].filter((k) => !process.env[k]);
  if (missing.length) return { configured: false, missing, keyParse: 'n/a' };
  const ok = appleClientSecret() !== null;
  return { configured: ok, missing, keyParse: ok ? 'ok' : 'failed' };
}
function appleClientSecret(): string | null {
  const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = process.env;
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) return null;
  try {
    return jwt.sign({}, normalizePem(APPLE_PRIVATE_KEY), {
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

    let resolved: ResolvedUser;
    try { resolved = await resolveUser(profile); } catch (e) { res.status((e as { status?: number }).status || 500).json({ error: e instanceof Error ? e.message : '로그인 처리 중 오류' }); return; }
    if ('error' in resolved) { res.status(resolved.status).json({ error: resolved.error }); return; }
    const { user, isNew } = resolved;
    recordLogin(req, user.id, 'apple');

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

// ===== 로그인 방법 연결/해제 (마이페이지) =====
type AuthReq = Request & { user?: { id: string; role: string } };

// 카카오·네이버 연결 시작용 티켓 (10분). 프론트는 /auth/kakao?link=<ticket> 으로 이동.
export const issueLinkTicket = (req: AuthReq, res: Response): void => {
  res.json({ ticket: signLinkTicket(req.user!.id) });
};

export const getLoginMethods = async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { password: true, email: true } });
    const logins = await listLoginMethods(req.user!.id);
    res.json({ hasPassword: !!me?.password && !me.email.endsWith('@social.local'), logins });
  } catch (e) { console.error('login methods error:', e); res.status(500).json({ error: '로그인 방법을 불러오지 못했어요.' }); }
};

// 연결 해제 — 마지막 남은 로그인 방법(비밀번호도 없음)은 해제 불가(잠기니까)
export const unlinkLoginMethod = async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const provider = String(req.params.provider || '');
    if (!['kakao', 'naver', 'apple'].includes(provider)) { res.status(400).json({ error: '알 수 없는 로그인 방법이에요.' }); return; }
    const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!me) { res.status(404).json({ error: '계정을 찾을 수 없어요.' }); return; }
    const logins = await prisma.userLogin.findMany({ where: { userId: me.id } });
    const target = logins.find((l) => l.provider === provider);
    if (!target) { res.status(404).json({ error: '연결돼 있지 않은 로그인 방법이에요.' }); return; }
    const hasPassword = !!me.password && !me.email.endsWith('@social.local');
    if (logins.length <= 1 && !hasPassword) { res.status(400).json({ error: '마지막 로그인 방법은 해제할 수 없어요. 다른 방법을 먼저 연결해 주세요.' }); return; }
    await prisma.userLogin.delete({ where: { id: target.id } });
    if (provider === 'apple') await revokeAppleToken(me.appleRefreshToken).catch(() => {});
    // 표시용 첫 소셜이 이거였으면 남은 것 중 하나로 교체
    if (me.provider === provider) {
      const next = logins.find((l) => l.provider !== provider);
      await prisma.user.update({ where: { id: me.id }, data: { provider: next?.provider || null, providerId: next?.providerId || null, ...(provider === 'apple' ? { appleRefreshToken: null } : {}) } });
    }
    res.json({ logins: await listLoginMethods(me.id) });
  } catch (e) { console.error('unlink error:', e); res.status(500).json({ error: '연결 해제에 실패했어요.' }); }
};

// Apple 연결 (iOS 앱 네이티브 시트로 받은 identityToken 을 로그인된 계정에 붙임)
export const appleLink = async (req: AuthReq, res: Response): Promise<void> => {
  try {
    const { identityToken, authorizationCode, nonce } = (req.body || {}) as Record<string, unknown>;
    if (typeof identityToken !== 'string' || identityToken.length < 20 || identityToken.length > 8000) { res.status(400).json({ error: 'Apple 로그인 정보가 없어요. 다시 시도해 주세요.' }); return; }
    let payload: jwt.JwtPayload;
    try { payload = await verifyAppleIdentityToken(identityToken, typeof nonce === 'string' && nonce.length <= 128 ? nonce : undefined); }
    catch { res.status(401).json({ error: 'Apple 로그인 확인에 실패했어요. 다시 시도해 주세요.' }); return; }
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    if (!sub) { res.status(401).json({ error: 'Apple 로그인 확인에 실패했어요.' }); return; }
    const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!me || restricted(me)) { res.status(403).json({ error: '이용이 제한된 계정입니다.' }); return; }
    const email = typeof payload.email === 'string' ? payload.email : null;
    try { await linkProfileToUser(me, { provider: 'apple', providerId: sub, email, emailVerified: false, name: null, profileImage: null }); }
    catch (e) { res.status((e as { status?: number }).status || 500).json({ error: e instanceof Error ? e.message : '연결 실패' }); return; }
    if (typeof authorizationCode === 'string' && authorizationCode.length > 0 && authorizationCode.length <= 2048) {
      const rt = await appleExchangeCode(authorizationCode).catch(() => null);
      if (rt) await prisma.user.update({ where: { id: me.id }, data: { appleRefreshToken: rt } }).catch(() => {});
    }
    recordLogin(req, me.id, 'apple');
    res.json({ logins: await listLoginMethods(me.id) });
  } catch (e) { console.error('apple link error:', e); res.status(500).json({ error: 'Apple 연결 중 오류가 났어요.' }); }
};
