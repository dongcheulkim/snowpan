import { Router, Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { notifyAdmins } from '../controllers/notificationController';
import { sendEmail } from '../utils/email';

const router = Router();

// 문의 접수 (로그인 없이도 가능)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, category, content } = req.body;

    if (!name || !email || !content) {
      res.status(400).json({ error: '이름, 이메일, 내용은 필수입니다.' });
      return;
    }

    const categoryLabel: Record<string, string> = {
      general: '일반 문의',
      trade: '거래 관련',
      ad: '광고 문의',
      bug: '오류 신고',
      partnership: '제휴/협력',
      other: '기타',
    };

    const label = categoryLabel[category] || '일반 문의';

    // 관리자에게 알림
    await notifyAdmins('system', `새 문의: ${label}`, `${name} (${email}): ${content.slice(0, 50)}...`, '/admin');

    // 관리자 이메일로 전송
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      await sendEmail(
        adminEmail,
        `[스노우판 문의] ${label} - ${name}`,
        `
          <div style="font-family: sans-serif; max-width: 500px;">
            <h2 style="color: #0ea5e9;">스노우판 문의</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; color: #666; width: 80px;">분류</td><td style="padding: 8px; font-weight: bold;">${label}</td></tr>
              <tr><td style="padding: 8px; color: #666;">이름</td><td style="padding: 8px;">${name}</td></tr>
              <tr><td style="padding: 8px; color: #666;">이메일</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
            </table>
            <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px;">
              <p style="margin: 0; white-space: pre-wrap;">${content}</p>
            </div>
          </div>
        `
      );
    }

    res.json({ message: '문의가 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다.' });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ error: '문의 접수 중 오류가 발생했습니다.' });
  }
});

// 관리자 ID 조회 (1:1 채팅용)
router.get('/admin-id', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { default: prisma } = await import('../config/database');
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true, name: true, nickname: true },
    });
    if (!admin) { res.status(404).json({ error: '관리자를 찾을 수 없습니다.' }); return; }
    res.json({ id: admin.id, name: admin.nickname || admin.name });
  } catch (error) {
    res.status(500).json({ error: '조회 실패' });
  }
});

export default router;
