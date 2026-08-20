import { Request, Response } from 'express';
import prisma from '../config/database';
import { signAccessToken, setRefreshCookie } from '../utils/tokens';
import { awardPoints } from '../utils/points';

// 소셜 로그인 (카카오/네이버). 서버사이드 OAuth authorization code flow.
// 키: KAKAO_CLIENT_ID (+옵션 KAKAO_CLIENT_SECRET), NAVER_LOGIN_CLIENT_ID/SECRET.
//   ⚠️ 네이버 로그인은 검색 API(NAVER_CLIENT_ID)와 다른 앱 키 — NAVER_LOGIN_* 사용.
// FRONTEND_URL 로 콜백 후 리다이렉트.

const FRONTEND = () => process.env.FRONTEND_URL || 'https://snowpan.kr';
const API_BASE = () => process.env.RENDER_EXTERNAL_URL || 'https://snowpan.onrender.com';
const SIGNUP_BONUS = 1000;

interface SocialProfile {
  provider: 'kakao' | 'naver';
  providerId: string;
  email?: string | null;
  name?: string | null;
  profileImage?: string | null;
}

// 소셜 프로필 → 유저 조회/생성 후 우리 토큰 발급 + 리다이렉트.
async function completeLogin(res: Response, profile: SocialProfile): Promise<void> {
  // 1) (provider, providerId) 로 기존 소셜 유저 조회.
  let user = await prisma.user.findFirst({ where: { provider: profile.provider, providerId: profile.providerId } });

  // 2) 없으면 이메일로 기존 계정 연결 (소셜 이메일은 인증된 값).
  if (!user && profile.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { provider: profile.provider, providerId: profile.providerId, profileImage: byEmail.profileImage || profile.profileImage || null },
      });
    }
  }

  // 3) 그래도 없으면 신규 생성. 이메일 없으면 placeholder (@<provider>.local) — unique 보장.
  let isNew = false;
  if (!user) {
    const email = profile.email || `${profile.provider}_${profile.providerId}@social.local`;
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

  if (isNew) {
    await awardPoints(prisma, { userId: user.id, amount: SIGNUP_BONUS, source: 'signup_bonus', description: '회원가입 축하 보너스' }).catch(() => {});
  }

  // 우리 토큰 발급 + refresh 쿠키(소셜은 지속 로그인). 프론트로 토큰·유저 전달.
  const token = signAccessToken(user);
  setRefreshCookie(res, user.id, true);
  const minimal = { id: user.id, email: user.email, name: user.name, nickname: user.nickname, role: user.role, phone: user.phone, profileImage: user.profileImage, provider: user.provider };
  const payload = Buffer.from(JSON.stringify(minimal)).toString('base64url');
  res.redirect(`${FRONTEND()}/oauth/callback#token=${encodeURIComponent(token)}&user=${payload}&provider=${profile.provider}`);
}

function fail(res: Response, msg: string): void {
  res.redirect(`${FRONTEND()}/login?social_error=${encodeURIComponent(msg)}`);
}

// ===== 카카오 =====
export function kakaoConfigured() { return Boolean(process.env.KAKAO_CLIENT_ID); }

export const kakaoStart = (_req: Request, res: Response): void => {
  if (!kakaoConfigured()) { res.status(503).json({ error: '카카오 로그인 준비 중입니다.' }); return; }
  const redirectUri = `${API_BASE()}/api/auth/kakao/callback`;
  const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(url);
};

export const kakaoCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = String(req.query.code || '');
    if (!code) return fail(res, '인증 코드가 없습니다.');
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
    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) return fail(res, '카카오 토큰 발급 실패');

    // 프로필 조회
    const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json() as { id?: number; kakao_account?: { email?: string; profile?: { nickname?: string; profile_image_url?: string } } };
    if (!me.id) return fail(res, '카카오 프로필 조회 실패');

    await completeLogin(res, {
      provider: 'kakao',
      providerId: String(me.id),
      email: me.kakao_account?.email || null,
      name: me.kakao_account?.profile?.nickname || null,
      profileImage: me.kakao_account?.profile?.profile_image_url || null,
    });
  } catch (err) {
    console.error('카카오 콜백 에러:', err);
    fail(res, '로그인 처리 중 오류가 발생했습니다.');
  }
};

// ===== 네이버 =====
export function naverLoginConfigured() { return Boolean(process.env.NAVER_LOGIN_CLIENT_ID && process.env.NAVER_LOGIN_CLIENT_SECRET); }

export const naverStart = (_req: Request, res: Response): void => {
  if (!naverLoginConfigured()) { res.status(503).json({ error: '네이버 로그인 준비 중입니다.' }); return; }
  const redirectUri = `${API_BASE()}/api/auth/naver/callback`;
  const state = Math.random().toString(36).slice(2); // CSRF 방어용 (콜백에서 검증은 생략 — 쿠키 저장 필요 시 추후)
  const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${process.env.NAVER_LOGIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  res.redirect(url);
};

export const naverCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code) return fail(res, '인증 코드가 없습니다.');
    const redirectUri = `${API_BASE()}/api/auth/naver/callback`;

    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_LOGIN_CLIENT_ID}&client_secret=${process.env.NAVER_LOGIN_CLIENT_SECRET}&code=${code}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`);
    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) return fail(res, '네이버 토큰 발급 실패');

    const meRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json() as { response?: { id?: string; email?: string; name?: string; nickname?: string; profile_image?: string } };
    const r = me.response;
    if (!r?.id) return fail(res, '네이버 프로필 조회 실패');

    await completeLogin(res, {
      provider: 'naver',
      providerId: r.id,
      email: r.email || null,
      name: r.name || r.nickname || null,
      profileImage: r.profile_image || null,
    });
  } catch (err) {
    console.error('네이버 콜백 에러:', err);
    fail(res, '로그인 처리 중 오류가 발생했습니다.');
  }
};
