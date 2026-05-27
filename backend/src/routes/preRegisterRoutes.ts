import { Router, Request, Response } from 'express';
import prisma from '../config/database';

// 미출시 5종목 사전 가입 (bike/run/surf/golf/camp Coming Soon 페이지에서 호출).
// 인증 없이 접수, rate limit 은 라우터 등록 시 strictWriteLimiter 적용.

const router = Router();

const VALID_SPORTS = new Set(['bike', 'run', 'surf', 'golf', 'camp']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, sport, interestedFeatures } = req.body ?? {};

    // 타입·존재 검증
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
      return;
    }
    if (typeof sport !== 'string' || !VALID_SPORTS.has(sport)) {
      res.status(400).json({ error: '유효하지 않은 종목입니다.' });
      return;
    }
    if (name !== undefined && (typeof name !== 'string' || name.length > 60)) {
      res.status(400).json({ error: '이름은 60자 이하의 문자열이어야 합니다.' });
      return;
    }

    // 관심 기능 — 문자열 배열만 허용, 최대 10개, 라벨당 80자
    let features: string[] = [];
    if (Array.isArray(interestedFeatures)) {
      if (interestedFeatures.length > 10) {
        res.status(400).json({ error: '관심 기능은 10개까지 선택할 수 있어요.' });
        return;
      }
      features = interestedFeatures
        .filter((x): x is string => typeof x === 'string' && x.length <= 80)
        .map(s => s.trim())
        .filter(Boolean);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;
    const userAgent = (req.headers['user-agent'] as string)?.slice(0, 200) || null;

    // upsert — 같은 이메일+종목 재신청이면 관심 기능만 업데이트 (사용자 입장에서 친절한 응답)
    const existing = await prisma.preRegister.findUnique({
      where: { email_sport: { email: normalizedEmail, sport } },
    });

    if (existing) {
      await prisma.preRegister.update({
        where: { id: existing.id },
        data: {
          interestedFeatures: features as unknown as object,
          name: name?.trim() || existing.name,
        },
      });
      res.status(200).json({ message: '이미 신청하셨어요. 출시 시 알려드릴게요!' });
      return;
    }

    await prisma.preRegister.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        sport,
        interestedFeatures: features as unknown as object,
        ip,
        userAgent,
      },
    });

    res.status(201).json({ message: '신청 완료. 출시 시 가장 먼저 알려드릴게요!' });
  } catch (error) {
    console.error('PreRegister error:', error);
    res.status(500).json({ error: '신청 중 오류가 발생했습니다.' });
  }
});

export default router;
