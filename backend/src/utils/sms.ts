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
