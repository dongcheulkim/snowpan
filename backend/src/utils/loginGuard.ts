// 로그인 실패 추적 — brute force 차단 + timing attack 방어 보조.
// (email, IP) 쌍 단위로 카운트. 10회 실패 시 30분 잠금.

interface Attempt {
  count: number;
  lockedUntil: number; // ms timestamp
}

const failures = new Map<string, Attempt>();
const MAX_ATTEMPTS = 10;
const LOCK_MS = 30 * 60_000;
const WINDOW_MS = 15 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, a] of failures) {
    if (a.lockedUntil < now && a.count < MAX_ATTEMPTS) failures.delete(k);
    else if (a.lockedUntil + LOCK_MS < now) failures.delete(k);
  }
}, 5 * 60_000);

function key(email: string, ip: string): string {
  return `${email.toLowerCase()}::${ip}`;
}

export function isLocked(email: string, ip: string): { locked: boolean; retryAfter?: number } {
  const a = failures.get(key(email, ip));
  if (!a) return { locked: false };
  const now = Date.now();
  if (a.lockedUntil > now) {
    return { locked: true, retryAfter: Math.ceil((a.lockedUntil - now) / 1000) };
  }
  return { locked: false };
}

export function recordFailure(email: string, ip: string): void {
  const k = key(email, ip);
  const now = Date.now();
  const existing = failures.get(k);
  if (!existing || now > existing.lockedUntil) {
    failures.set(k, { count: 1, lockedUntil: now + WINDOW_MS });
    return;
  }
  existing.count++;
  if (existing.count >= MAX_ATTEMPTS) {
    existing.lockedUntil = now + LOCK_MS;
  }
}

export function recordSuccess(email: string, ip: string): void {
  failures.delete(key(email, ip));
}

// timing attack 방어용 dummy hash — 실제 bcrypt 처리 시간과 일치시키기 위해
// 미리 만들어둔 valid hash. user 가 없을 때 이걸로 compare → 항상 같은 시간 소요.
// 'never-matches-anything' 의 bcrypt(round=10) 결과.
export const DUMMY_BCRYPT_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// 이메일 발송 횟수 제한 — 같은 이메일에 24시간 내 5회 초과 발송 차단.
// 비밀번호 재설정/이메일 인증 등 SMTP 트래픽 폭격 방지.
const emailSendCount = new Map<string, { count: number; resetAt: number }>();
const EMAIL_LIMIT = 5;
const EMAIL_WINDOW_MS = 24 * 60 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of emailSendCount) {
    if (v.resetAt < now) emailSendCount.delete(k);
  }
}, 60 * 60_000);

export function canSendEmail(email: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = emailSendCount.get(email.toLowerCase());
  if (!entry || now > entry.resetAt) {
    emailSendCount.set(email.toLowerCase(), { count: 1, resetAt: now + EMAIL_WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= EMAIL_LIMIT) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { ok: true };
}
