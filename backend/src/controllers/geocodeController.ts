// 관리자: 좌표가 없는 매장 일괄 지오코딩. 한 번에 limit 개(기본 150) — 반복 호출로 전체 처리.
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { geocodeAddress, geocodeConfigured } from '../utils/geocode';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const geocodeBackfill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!geocodeConfigured()) { res.json({ configured: false, processed: 0, found: 0, remaining: 0 }); return; }
    const limit = Math.min(Math.max(parseInt(String(req.body?.limit ?? '150'), 10) || 150, 1), 500);
    // 스키샵·정비샵은 주소 필수(non-null), 렌탈은 주소 선택 — where 를 나눔
    const whereShop = { lat: null } as const;
    const whereRental = { lat: null, address: { not: null } } as const;
    const sel = { id: true, address: true } as const;
    const [ski, rep, ren] = await Promise.all([
      prisma.skiShop.findMany({ where: whereShop, select: sel, take: limit }),
      prisma.repairShop.findMany({ where: whereShop, select: sel, take: limit }),
      prisma.rental.findMany({ where: whereRental, select: sel, take: limit }),
    ]);
    const targets = [
      ...ski.map((s) => ({ kind: 'skishop' as const, ...s })),
      ...rep.map((s) => ({ kind: 'repair' as const, ...s })),
      ...ren.map((s) => ({ kind: 'rental' as const, ...s })),
    ].slice(0, limit);
    let found = 0;
    const missed: string[] = [];
    for (const t of targets) {
      const c = await geocodeAddress(t.address || '');
      if (c) {
        const data = { lat: c.lat, lng: c.lng };
        if (t.kind === 'skishop') await prisma.skiShop.update({ where: { id: t.id }, data });
        else if (t.kind === 'repair') await prisma.repairShop.update({ where: { id: t.id }, data });
        else await prisma.rental.update({ where: { id: t.id }, data });
        found++;
      } else {
        // 못 찾은 건 다음 호출에서 또 시도하지 않도록 0,0 대신 그대로 두되, 응답에 남김
        missed.push(`${t.kind}:${t.id}`);
      }
      await sleep(60);
    }
    const [r1, r2, r3] = await Promise.all([
      prisma.skiShop.count({ where: whereShop }), prisma.repairShop.count({ where: whereShop }), prisma.rental.count({ where: whereRental }),
    ]);
    res.json({ configured: true, processed: targets.length, found, missed, remaining: r1 + r2 + r3 });
  } catch (error) {
    console.error('Geocode backfill error:', error);
    res.status(500).json({ error: '좌표 변환 중 오류가 발생했습니다.' });
  }
};
