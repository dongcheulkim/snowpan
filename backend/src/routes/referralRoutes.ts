// 리퍼럴 시스템 — 본인 추천 코드 + 추천 통계.
// 코드는 lazy 생성 (첫 조회 시 발급). 가입 시 ?ref=CODE 받으면 referredById 저장.

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// 6글자 영숫자 (대문자) — base32 변형, 혼동 글자 (0/O, 1/I/L) 제외.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  const buf = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

async function ensureCode(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (u?.referralCode) return u.referralCode;
  // 충돌 가능성 매우 낮지만 5번 시도
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch { /* unique 충돌 — 재시도 */ }
  }
  throw new Error('리퍼럴 코드 생성에 실패했습니다.');
}

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const code = await ensureCode(userId);
    const referredCount = await prisma.user.count({ where: { referredById: userId } });
    res.json({ code, referredCount });
  } catch (error) {
    console.error('Referral me error:', error);
    res.status(500).json({ error: '추천 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 가입 시 호출 — 추천인 코드 검증 후 ID 반환 (회원가입 controller 가 referredById 로 저장)
router.get('/lookup/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      res.status(400).json({ error: '코드 형식이 올바르지 않습니다.' });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, name: true, nickname: true, displayName: true },
    });
    if (!user) {
      res.status(404).json({ error: '존재하지 않는 추천 코드입니다.' });
      return;
    }
    const displayName = user.displayName === 'nickname' && user.nickname ? user.nickname : user.name;
    res.json({ referrerId: user.id, referrerName: displayName });
  } catch (error) {
    console.error('Referral lookup error:', error);
    res.status(500).json({ error: '코드 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
