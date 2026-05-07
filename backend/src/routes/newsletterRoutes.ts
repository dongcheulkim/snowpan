// 위클리 다이제스트 구독 — 비회원도 이메일만으로 구독 가능.
// 실제 발송은 별도 cron (TBD); 지금은 수집·해지만.

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { normalizeEmail } from '../utils/validate';

const router = Router();
const prisma = new PrismaClient();

// 단순 이메일 형식 검증 — 너무 엄격하면 정상 메일 거절. RFC 핵심만.
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
    const source = typeof req.body?.source === 'string' ? req.body.source.slice(0, 64) : null;
    const email = normalizeEmail(rawEmail);
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: '이메일 형식이 올바르지 않습니다.' });
      return;
    }

    // upsert — 이미 등록된 이메일이면 active 만 true 로 복원
    const sub = await prisma.newsletterSubscription.upsert({
      where: { email },
      create: { email, source, active: true },
      update: { active: true, source: source ?? undefined },
      select: { id: true, email: true, createdAt: true },
    });
    res.status(201).json(sub);
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({ error: '구독 처리 중 오류가 발생했습니다.' });
  }
});

// 1-click unsubscribe — token 으로 즉시 해제 (이메일 푸터 링크용)
router.get('/unsubscribe/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const sub = await prisma.newsletterSubscription.findUnique({ where: { unsubToken: token } });
    if (!sub) {
      res.status(404).send('구독 정보를 찾을 수 없습니다.');
      return;
    }
    await prisma.newsletterSubscription.update({ where: { id: sub.id }, data: { active: false } });
    res.send('구독이 해지되었습니다. 이용해주셔서 감사합니다.');
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).send('해지 처리 중 오류가 발생했습니다.');
  }
});

export default router;
