// 보상형 광고 시청 기록 — 클라이언트가 광고 끝까지 본 시점에 호출.
// 5분 안에 미사용 시청 기록이 있어야 쿠폰 구매 통과.

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

const VALID_SOURCES = new Set(['admob', 'web_inhouse', 'test']);
const VALID_PLATFORMS = new Set(['ios', 'android', 'web']);
const VALID_PURPOSES = new Set(['coupon_purchase']);

export const recordAdView = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { source, platform, purpose } = req.body as { source?: string; platform?: string; purpose?: string };

    if (!VALID_SOURCES.has(String(source))) {
      res.status(400).json({ error: 'source 가 올바르지 않습니다.' });
      return;
    }
    if (!VALID_PLATFORMS.has(String(platform))) {
      res.status(400).json({ error: 'platform 이 올바르지 않습니다.' });
      return;
    }
    const purp = purpose && VALID_PURPOSES.has(purpose) ? purpose : 'coupon_purchase';

    const view = await prisma.adView.create({
      data: { userId, source: source as string, platform: platform as string, purpose: purp },
      select: { id: true, viewedAt: true },
    });

    res.status(201).json(view);
  } catch (err) {
    console.error('recordAdView error:', err);
    res.status(500).json({ error: '광고 시청 기록 중 오류가 발생했습니다.' });
  }
};
