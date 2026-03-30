import nodemailer from 'nodemailer';

// 환경변수 설정 예시 (.env):
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_USER=your-email@gmail.com
// SMTP_PASS=your-app-password
// SMTP_FROM=스노우판 <noreply@snowpan.com>

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('SMTP 환경변수 미설정 - 이메일 발송 비활성화');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log(`[이메일 미발송] To: ${to}, Subject: ${subject}`);
    return false;
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('이메일 발송 실패:', error);
    return false;
  }
}

export function verificationEmailHtml(code: string): string {
  return `
    <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
      <h2 style="color: #0ea5e9; margin: 0 0 8px;">스노우판</h2>
      <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">인증번호를 확인해주세요.</p>
      <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
        <div style="font-size: 32px; font-weight: 900; color: #1e293b; letter-spacing: 8px;">${code}</div>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0; text-align: center;">이 코드는 10분간 유효합니다.</p>
    </div>
  `;
}
