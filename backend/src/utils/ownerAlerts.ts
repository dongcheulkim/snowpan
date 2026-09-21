// 사장님·손님 알림 채널 통합 (2026-09-21, 사용자 "사장님들이 알림을 받아야 좋을 것 같아").
// 앱 푸시(FCM)는 기존대로 각 컨트롤러가 보내고, 여기서는 그 위에 **문자(SMS)** 와 **메일** 을 얹는다.
// - 문자: user.alertPhone → (매장 전화, 호출 쪽이 넘김) → user.phone 순. smsAlerts=false 면 안 보냄.
// - 메일: 실제 이메일(카카오 임시 주소 *@social.local 제외)만, emailAlerts=false 면 안 보냄, SMTP 미설정이면 건너뜀.
// - 같은 사람·같은 종류·같은 키(채팅방 등)는 throttleMs 안에 한 번만 (문자 요금·스팸 방지). 결과는 alert_logs 에 남긴다.
import prisma from '../config/database';
import { sendSms, smsConfigured, normalizePhone } from './sms';
import { sendEmail } from './email';

export type AlertKind = 'reservation_request' | 'reservation_result' | 'chat' | 'approval';
const SITE = process.env.FRONTEND_URL || 'https://snowpan.kr';
const THROTTLE_MS: Record<AlertKind, number> = { reservation_request: 0, reservation_result: 0, chat: 3 * 60 * 60 * 1000, approval: 0 };
const recent = new Map<string, number>(); // `${userId}:${kind}:${key}` → 마지막 발송 시각

function smtpConfigured(): boolean { return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS); }
const isRealEmail = (e: string | null | undefined) => !!e && /@/.test(e) && !/@social\.local$/i.test(e);

async function log(userId: string | null, channel: 'sms' | 'email', kind: AlertKind, to: string, text: string, status: string, detail?: string): Promise<void> {
  try { await prisma.alertLog.create({ data: { userId, channel, kind, to, text: text.slice(0, 500), status, detail: detail?.slice(0, 200) || null } }); } catch { /* 기록 실패는 무시 */ }
}

export interface AlertInput {
  kind: AlertKind;
  key?: string;          // 스로틀 키 (채팅은 roomId)
  title: string;         // 메일 제목·문자 첫 줄
  text: string;          // 본문 (문자는 title + text 를 합쳐 90자 안팎으로)
  link?: string;         // 사이트 경로 (/chat/xxx) — 문자·메일에 절대주소로
  fallbackPhone?: string | null; // 매장 전화 (alertPhone 없을 때)
}

// 대상 유저에게 문자·메일 알림. 실패해도 던지지 않는다(호출 쪽 흐름에 영향 없게).
export async function alertUser(userId: string, a: AlertInput): Promise<void> {
  try {
    const key = `${userId}:${a.kind}:${a.key || ''}`;
    const win = THROTTLE_MS[a.kind];
    const last = recent.get(key);
    if (win > 0 && last && Date.now() - last < win) return;
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true, alertPhone: true, smsAlerts: true, emailAlerts: true, role: true } });
    if (!u) return;
    recent.set(key, Date.now());
    if (recent.size > 5000) { const cutoff = Date.now() - 24 * 60 * 60 * 1000; for (const [k, t] of recent) if (t < cutoff) recent.delete(k); }
    const url = a.link ? `${SITE}${a.link}` : SITE;
    const smsText = `[스노우판] ${a.title}\n${a.text}\n${url}`;
    // 문자
    if (u.smsAlerts) {
      const to = normalizePhone(u.alertPhone) || normalizePhone(a.fallbackPhone) || normalizePhone(u.phone);
      if (!to) await log(userId, 'sms', a.kind, '', smsText, 'skipped', 'no_phone');
      else if (!smsConfigured() && process.env.ALERT_DRY_RUN !== '1') await log(userId, 'sms', a.kind, to, smsText, 'skipped', 'not_configured');
      else { const r = await sendSms(to, smsText); await log(userId, 'sms', a.kind, to, smsText, r.ok ? (r.detail === 'dry' ? 'dry' : 'sent') : 'failed', r.detail); }
    }
    // 메일
    if (u.emailAlerts) {
      if (!isRealEmail(u.email)) await log(userId, 'email', a.kind, u.email || '', smsText, 'skipped', 'no_real_email');
      else if (process.env.ALERT_DRY_RUN === '1') await log(userId, 'email', a.kind, u.email, smsText, 'dry');
      else if (!smtpConfigured()) await log(userId, 'email', a.kind, u.email, smsText, 'skipped', 'not_configured');
      else {
        const html = `<div style="font-family:-apple-system,'Noto Sans KR',sans-serif;max-width:480px;margin:0 auto;padding:24px"><h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(a.title)}</h2><p style="white-space:pre-wrap;line-height:1.6;color:#334155">${escapeHtml(a.text)}</p><p style="margin-top:20px"><a href="${url}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">스노우판에서 보기</a></p><p style="margin-top:24px;font-size:12px;color:#94a3b8">알림을 끄려면 스노우판 → 마이 → 사장님 대시보드 → 알림 받기에서 바꿀 수 있어요.</p></div>`;
        const ok = await sendEmail(u.email, `[스노우판] ${a.title}`, html);
        await log(userId, 'email', a.kind, u.email, smsText, ok ? 'sent' : 'failed');
      }
    }
  } catch (e) { console.error('alertUser error:', e); }
}

function escapeHtml(s: string): string { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)); }
