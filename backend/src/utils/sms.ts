// SMS 발송 유틸리티
// 지원: Naver Cloud SENS, Twilio, 또는 커스텀 HTTP API
//
// 환경변수 설정 예시 (.env):
// SMS_PROVIDER=naver  (또는 twilio)
//
// Naver SENS:
// NAVER_SMS_SERVICE_ID=ncp:sms:kr:xxx:snowpan
// NAVER_SMS_ACCESS_KEY=your-access-key
// NAVER_SMS_SECRET_KEY=your-secret-key
// NAVER_SMS_FROM=01012345678
//
// Twilio:
// TWILIO_ACCOUNT_SID=ACxxx
// TWILIO_AUTH_TOKEN=xxx
// TWILIO_FROM=+1234567890

import crypto from 'crypto';

async function sendNaverSens(to: string, content: string): Promise<boolean> {
  const serviceId = process.env.NAVER_SMS_SERVICE_ID;
  const accessKey = process.env.NAVER_SMS_ACCESS_KEY;
  const secretKey = process.env.NAVER_SMS_SECRET_KEY;
  const from = process.env.NAVER_SMS_FROM;

  if (!serviceId || !accessKey || !secretKey || !from) return false;

  const timestamp = Date.now().toString();
  const url = `/sms/v2/services/${serviceId}/messages`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(`POST ${url}\n${timestamp}\n${accessKey}`)
    .digest('base64');

  const res = await fetch(`https://sens.apigw.ntruss.com${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ncp-apigw-timestamp': timestamp,
      'x-ncp-iam-access-key': accessKey,
      'x-ncp-apigw-signature-v2': signature,
    },
    body: JSON.stringify({
      type: 'SMS',
      from,
      content,
      messages: [{ to: to.replace(/-/g, '') }],
    }),
  });

  return res.ok;
}

async function sendTwilio(to: string, content: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !token || !from) return false;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: content }),
  });

  return res.ok;
}

export async function sendSMS(to: string, content: string): Promise<boolean> {
  const provider = process.env.SMS_PROVIDER;

  if (provider === 'solapi') return (await sendSms(to, content)).ok;
  if (!provider) {
    console.log(`[SMS 미발송] To: ${to}, Content: ${content}`);
    return false;
  }

  try {
    if (provider === 'naver') return await sendNaverSens(to, content);
    if (provider === 'twilio') return await sendTwilio(to, content);

    console.warn(`알 수 없는 SMS_PROVIDER: ${provider}`);
    return false;
  } catch (error) {
    console.error('SMS 발송 실패:', error);
    return false;
  }
}

// ── 솔라피(Solapi) — 사장님 알림(예약 요청·새 문의·승인 결과)용 (2026-09-21). env: SOLAPI_API_KEY, SOLAPI_API_SECRET, SMS_FROM.
// ALERT_DRY_RUN=1 이면 실제 호출 없이 성공(dry)으로 돌려준다(E2E). SMS_PROVIDER=solapi 로 두면 위 sendSMS(인증번호)도 이걸 쓴다.
export function smsConfigured(): boolean {
  return Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SMS_FROM);
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/[^0-9+]/g, '');
  if (d.startsWith('+82')) d = '0' + d.slice(3);
  d = d.replace(/\D/g, '');
  if (!/^0\d{8,10}$/.test(d)) return null; // 휴대폰·유선·070·050x
  return d;
}

export async function sendSms(to: string, text: string): Promise<{ ok: boolean; detail?: string }> {
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, detail: 'invalid_phone' };
  if (process.env.ALERT_DRY_RUN === '1') return { ok: true, detail: 'dry' };
  if (!smsConfigured()) return { ok: false, detail: 'not_configured' };
  const apiKey = process.env.SOLAPI_API_KEY!; const apiSecret = process.env.SOLAPI_API_SECRET!; const from = normalizePhone(process.env.SMS_FROM!) || process.env.SMS_FROM!;
  const date = new Date().toISOString(); const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  try {
    const r = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}` },
      body: JSON.stringify({ message: { to: phone, from, text } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) { const body = await r.text().catch(() => ''); return { ok: false, detail: `http_${r.status} ${body.slice(0, 120)}` }; }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message.slice(0, 120) : 'error' };
  }
}
