import { Request, Response } from 'express';
import prisma from '../config/database';
import { stripPrivateAll } from '../utils/publicFields';

export const getResorts = async (req: Request, res: Response): Promise<void> => {
  try {
    const resorts = await prisma.skiResort.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(resorts);
  } catch (error) {
    console.error('Get resorts error:', error);
    res.status(500).json({ error: '스키장 조회 중 오류가 발생했습니다.' });
  }
};

// 리조트 이름 정규화 — '용평리조트'/'용평' 등 접미사·표기 차이 흡수해서 매칭.
function normalizeResort(s: string): string {
  return s.replace(/리조트|파크|스키장|\s/g, '').toLowerCase();
}

// 리조트별 랜딩 집계 — 그 리조트 근처 스키샵·정비샵·렌탈·레슨·숙소를 한 번에.
// name 은 free-text (예: '용평리조트'). SkiResort 테이블과 이름이 달라도 정규화로 매칭.
export const getResortLanding = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = decodeURIComponent(req.params.name || '').trim();
    if (!name) { res.status(400).json({ error: '리조트 이름이 필요합니다.' }); return; }
    const norm = normalizeResort(name);

    // SkiResort 테이블에서 정규화 매칭 (rental/lesson/accommodation FK 용).
    const allResorts = await prisma.skiResort.findMany({ select: { id: true, name: true, location: true, image: true } });
    const matched = allResorts.find(r => {
      const rn = normalizeResort(r.name);
      return rn === norm || rn.includes(norm) || norm.includes(rn);
    });

    let skiShops: any[] = [], rentals: any[] = [], lessons: any[] = [], accommodations: any[] = [], repairShops: any[] = [];
    if (matched) {
      // 스키샵·정비샵도 렌탈과 같은 리조트 FK 기준 (예전엔 텍스트 매칭·지역 근사치)
      [skiShops, repairShops, rentals, lessons, accommodations] = await Promise.all([
        prisma.skiShop.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, area: true, address: true, image: true, phone: true, isPremium: true }, orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }], take: 20 }),
        prisma.repairShop.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, area: true, address: true, image: true }, take: 20 }),
        prisma.rental.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, price: true, image: true }, take: 20 }),
        prisma.lesson.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, price: true, image: true }, take: 20 }).catch(() => []),
        prisma.accommodation.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, price: true, image: true }, take: 20 }).catch(() => []),
      ]);
    }

    res.json({
      name,
      resort: matched || null,
      skiShops, repairShops, rentals, lessons, accommodations,
    });
  } catch (error) {
    console.error('Get resort landing error:', error);
    res.status(500).json({ error: '리조트 정보 조회 중 오류가 발생했습니다.' });
  }
};

export const getResortById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const resort = await prisma.skiResort.findUnique({
      where: { id },
      include: {
        // 승인된 것만 — 심사 대기 매물이 공개되던 것 차단
        rentals: { where: { approved: true } },
        lessons: { where: { approved: true } },
      },
    });

    if (!resort) {
      res.status(404).json({ error: '스키장을 찾을 수 없습니다.' });
      return;
    }

    // 사업자등록증·자격증 등 심사용 서류 URL 제거 (개인정보 — 공개 금지)
    res.json({
      ...resort,
      rentals: stripPrivateAll(resort.rentals as unknown as Record<string, unknown>[]),
      lessons: stripPrivateAll(resort.lessons as unknown as Record<string, unknown>[]),
    });
  } catch (error) {
    console.error('Get resort error:', error);
    res.status(500).json({ error: '스키장 조회 중 오류가 발생했습니다.' });
  }
};
