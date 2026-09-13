// 탈퇴 후 재가입 제한 (기본 90일, env REREGISTER_BLOCK_DAYS 로 조정).
// 탈퇴 시 식별자를 원문 없이 HMAC 해시로만 저장 → 가입·휴대폰 인증·소셜 첫 로그인에서 대조.
import crypto from 'crypto';
import prisma from '../config/database';
import { normalizeEmail } from './validate';

export const REREGISTER_DAYS = Math.max(1, Number(process.env.REREGISTER_BLOCK_DAYS) || 90);

type Kind = 'phone' | 'email' | 'social';

function hashKey(kind: Kind, value: string): string {
  const secret = process.env.JWT_SECRET || 'snowpan';
  return crypto.createHmac('sha256', secret).update(`${kind}:${value}`).digest('hex');
}

const normPhone = (p: string) => p.replace(/[^0-9]/g, '');
const socialKey = (provider: string, providerId: string) => `${provider}:${providerId}`;

export function fmtKst(d: Date): string {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
}

export const reregisterBlockedMessage = (until: Date) =>
  `탈퇴한 계정 정보예요. 사기·분쟁 예방을 위해 탈퇴 후 ${REREGISTER_DAYS}일 동안은 같은 정보로 다시 가입할 수 없어요. ${fmtKst(until)}부터 가능해요.`;

// 탈퇴 시 호출 — 있는 식별자만 잠근다. 익명값(deleted_…, @social.local)은 제외.
export async function lockAfterDeletion(u: { phone?: string | null; email?: string | null; provider?: string | null; providerId?: string | null; logins?: { provider: string; providerId: string }[] }): Promise<Date> {
  const until = new Date(Date.now() + REREGISTER_DAYS * 24 * 60 * 60 * 1000);
  const keys: { kind: Kind; value: string }[] = [];
  if (u.phone && !u.phone.startsWith('deleted_')) keys.push({ kind: 'phone', value: normPhone(u.phone) });
  const email = u.email ? normalizeEmail(u.email) : null;
  if (email && !email.endsWith('@social.local') && !email.endsWith('@snowpan.local')) keys.push({ kind: 'email', value: email });
  if (u.provider && u.providerId) keys.push({ kind: 'social', value: socialKey(u.provider, u.providerId) });
  for (const l of u.logins || []) keys.push({ kind: 'social', value: socialKey(l.provider, l.providerId) });
  // 만료된 잠금은 이 기회에 정리 (별도 스케줄러 없이)
  await prisma.reregisterLock.deleteMany({ where: { until: { lt: new Date() } } }).catch(() => {});
  for (const k of keys) {
    const keyHash = hashKey(k.kind, k.value);
    await prisma.reregisterLock.upsert({ where: { keyHash }, create: { keyHash, kind: k.kind, until }, update: { until } });
  }
  return until;
}

// 잠겨 있으면 해제 시각, 아니면 null
async function activeUntil(kind: Kind, value: string): Promise<Date | null> {
  const row = await prisma.reregisterLock.findUnique({ where: { keyHash: hashKey(kind, value) }, select: { until: true } });
  return row && row.until > new Date() ? row.until : null;
}

export const phoneLockedUntil = (phone: string) => activeUntil('phone', normPhone(phone));
export const emailLockedUntil = (email: string) => { const e = normalizeEmail(email); return e ? activeUntil('email', e) : Promise.resolve(null); };
export const socialLockedUntil = (provider: string, providerId: string) => activeUntil('social', socialKey(provider, providerId));
