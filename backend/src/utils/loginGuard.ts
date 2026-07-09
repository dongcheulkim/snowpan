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

// email 단독 카운터 — IP 회전(cf-connecting-ip 스푸핑)으로 (email,IP) 잠금을
// 우회하는 무차별 대입을 방어. IP 무관 email 당 임계값을 더 높게 (분산 공격 흡수).
const EMAIL_MAX_ATTEMPTS = 30;

function checkOne(k: string): { locked: boolean; retryAfter?: number } {
  const a = failures.get(k);
  if (!a) return { locked: false };
  const now = Date.now();
  if (a.lockedUntil > now && a.count >= MAX_ATTEMPTS) {
    return { locked: true, retryAfter: Math.ceil((a.lockedUntil - now) / 1000) };
  }
  return { locked: false };
}

export function isLocked(email: string, ip: string): { locked: boolean; retryAfter?: number } {
  const byPair = checkOne(key(email, ip));
  if (byPair.locked) return byPair;
  // email 단독 잠금 (IP 회전 방어).
  const emailKey = `${email.toLowerCase()}::*`;
  const a = failures.get(emailKey);
  if (a && a.lockedUntil > Date.now() && a.count >= EMAIL_MAX_ATTEMPTS) {
    return { locked: true, retryAfter: Math.ceil((a.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false };
}

function bump(k: string, maxAttempts: number): void {
  const now = Date.now();
  const existing = failures.get(k);
  if (!existing || now > existing.lockedUntil) {
    failures.set(k, { count: 1, lockedUntil: now + WINDOW_MS });
    return;
  }
  existing.count++;
  if (existing.count >= maxAttempts) {
    existing.lockedUntil = now + LOCK_MS;
  }
}

export function recordFailure(email: string, ip: string): void {
  bump(key(email, ip), MAX_ATTEMPTS);
  bump(`${email.toLowerCase()}::*`, EMAIL_MAX_ATTEMPTS); // IP 무관 email 카운터
}

export function recordSuccess(email: string, ip: string): void {
  failures.delete(key(email, ip));
  failures.delete(`${email.toLowerCase()}::*`);
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

// 비밀번호 재설정 코드 확인 시도 제한 — email 당 15분 내 5회.
// 6자리 코드 무차별 대입 (IP 회전으로 IP rate limit 우회 시) 방어.
const resetAttempts = new Map<string, { count: number; resetAt: number }>();
const RESET_MAX = 5;
const RESET_WINDOW_MS = 15 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of resetAttempts) {
    if (v.resetAt < now) resetAttempts.delete(k);
  }
}, 5 * 60_000);

export function recordResetAttempt(email: string): { ok: boolean } {
  const now = Date.now();
  const k = email.toLowerCase();
  const entry = resetAttempts.get(k);
  if (!entry || now > entry.resetAt) {
    resetAttempts.set(k, { count: 1, resetAt: now + RESET_WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= RESET_MAX) return { ok: false };
  entry.count++;
  return { ok: true };
}

export function clearResetAttempts(email: string): void {
  resetAttempts.delete(email.toLowerCase());
}

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
