import { Request, Response } from 'express';
import prisma from '../config/database';
import { stripPrivateAll } from '../utils/publicFields';
import { kstDayStart, parseKstDate } from '../utils/kst';
import { sanitizeText } from '../utils/sanitize';

const DAY_MS = 24 * 60 * 60 * 1000;

// 리조트 목록 — 개장·폐장일(openDate/closeDate)·시즌 메모(seasonNote) 포함 (select 없이 전체 컬럼).
// /api/resorts 는 index.ts 의 publicCache 로 1시간 공개 캐시 — 시즌 정보는 자주 안 바뀌어 괜찮다.
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

// 시즌 요약 (공개) — 홈 "시즌 오픈 카운트다운" 용.
// - 목록: openDate 오름차순 (없는 리조트는 뒤로)
// - next: 오늘(KST) 이후 가장 빠른 개장일 + D-day (없으면 null)
// - openNow: 오늘이 openDate ~ closeDate 사이(폐장일 없으면 개장 이후)인 리조트 수
export const getResortSeason = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.skiResort.findMany({
      select: { id: true, name: true, openDate: true, closeDate: true, seasonNote: true },
    });
    const today = kstDayStart().getTime();

    const sorted = [...rows].sort((a, b) => {
      const ao = a.openDate ? a.openDate.getTime() : Number.POSITIVE_INFINITY;
      const bo = b.openDate ? b.openDate.getTime() : Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name, 'ko');
    });

    let next: { id: string; name: string; openDate: Date; daysLeft: number } | null = null;
    let openNow = 0;
    for (const r of sorted) {
      const open = r.openDate ? kstDayStart(r.openDate).getTime() : null;
      const close = r.closeDate ? kstDayStart(r.closeDate).getTime() : null;
      if (open !== null && open >= today && next === null) {
        next = { id: r.id, name: r.name, openDate: r.openDate as Date, daysLeft: Math.round((open - today) / DAY_MS) };
      }
      if (open !== null && open <= today && (close === null || close >= today)) openNow += 1;
    }

    res.json({
      resorts: sorted,
      next,
      openNow,
    });
  } catch (error) {
    console.error('Get resort season error:', error);
    res.status(500).json({ error: '시즌 정보 조회 중 오류가 발생했습니다.' });
  }
};

// 시즌 정보 수정 (관리자) — { openDate?: 'YYYY-MM-DD'|null, closeDate?, seasonNote? ≤ 100 }
// 날짜는 KST 자정으로 저장 (parseKstDate). 키가 없으면 그대로, null 이면 비움. closeDate 는 openDate 이후여야 한다.
export const updateResortSeason = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const resort = await prisma.skiResort.findUnique({
      where: { id },
      select: { id: true, name: true, openDate: true, closeDate: true, seasonNote: true },
    });
    if (!resort) {
      res.status(404).json({ error: '스키장을 찾을 수 없습니다.' });
      return;
    }

    // undefined = 변경 없음, null = 비움, Date = 새 값
    const readDate = (key: 'openDate' | 'closeDate'): Date | null | undefined | 'invalid' => {
      if (!(key in body)) return undefined;
      const v = body[key];
      if (v === null || v === '') return null;
      const parsed = parseKstDate(v);
      if (!parsed) return 'invalid';
      return kstDayStart(parsed);
    };

    const openDate = readDate('openDate');
    const closeDate = readDate('closeDate');
    if (openDate === 'invalid') {
      res.status(400).json({ error: '개장일 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
      return;
    }
    if (closeDate === 'invalid') {
      res.status(400).json({ error: '폐장일 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
      return;
    }

    let seasonNote: string | null | undefined = undefined;
    if ('seasonNote' in body) {
      const v = body.seasonNote;
      if (v === null || v === '') seasonNote = null;
      else if (typeof v !== 'string') {
        res.status(400).json({ error: '시즌 메모 형식이 올바르지 않습니다.' });
        return;
      } else {
        if (v.length > 100) {
          res.status(400).json({ error: '시즌 메모는 100자까지 입력할 수 있어요.' });
          return;
        }
        const clean = sanitizeText(v, 100) || '';
        seasonNote = clean.length > 0 ? clean : null;
      }
    }

    const effOpen = openDate === undefined ? resort.openDate : openDate;
    const effClose = closeDate === undefined ? resort.closeDate : closeDate;
    if (effOpen && effClose && effClose.getTime() < effOpen.getTime()) {
      res.status(400).json({ error: '폐장일은 개장일보다 빠를 수 없어요.' });
      return;
    }

    const data: { openDate?: Date | null; closeDate?: Date | null; seasonNote?: string | null } = {};
    if (openDate !== undefined) data.openDate = openDate;
    if (closeDate !== undefined) data.closeDate = closeDate;
    if (seasonNote !== undefined) data.seasonNote = seasonNote;

    const updated = await prisma.skiResort.update({
      where: { id },
      data,
      select: { id: true, name: true, openDate: true, closeDate: true, seasonNote: true },
    });
    // 리조트 목록은 서버 메모리 캐시를 쓰지 않는다 (HTTP 공개 캐시만) — 무효화할 키 없음.
    res.json(updated);
  } catch (error) {
    console.error('Update resort season error:', error);
    res.status(500).json({ error: '시즌 정보 저장 중 오류가 발생했습니다.' });
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
    const allResorts = await prisma.skiResort.findMany({
      select: { id: true, name: true, location: true, image: true, openDate: true, closeDate: true, seasonNote: true },
    });
    const matchedRow = allResorts.find(r => {
      const rn = normalizeResort(r.name);
      return rn === norm || rn.includes(norm) || norm.includes(rn);
    });
    const matched = matchedRow ? { id: matchedRow.id, name: matchedRow.name, location: matchedRow.location, image: matchedRow.image } : null;

    let skiShops: any[] = [], rentals: any[] = [], lessons: any[] = [], accommodations: any[] = [], repairShops: any[] = [];
    let reviews = { avg: 0, count: 0 };
    if (matched) {
      // 스키샵·정비샵도 렌탈과 같은 리조트 FK 기준 (예전엔 텍스트 매칭·지역 근사치)
      let agg: { _avg: { rating: number | null }; _count: number };
      [skiShops, repairShops, rentals, lessons, accommodations, agg] = await Promise.all([
        prisma.skiShop.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, area: true, address: true, image: true, phone: true, isPremium: true }, orderBy: [{ isPremium: 'desc' }, { claimable: 'asc' }, { createdAt: 'desc' }], take: 100 }),
        prisma.repairShop.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, area: true, address: true, image: true }, orderBy: [{ isPremium: 'desc' }, { claimable: 'asc' }, { createdAt: 'desc' }], take: 100 }),
        prisma.rental.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, price: true, image: true }, orderBy: [{ isPremium: 'desc' }, { claimable: 'asc' }, { createdAt: 'desc' }], take: 100 }),
        prisma.lesson.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, price: true, image: true }, take: 100 }).catch(() => []),
        prisma.accommodation.findMany({ where: { resortId: matched.id, approved: true }, select: { id: true, name: true, price: true, image: true }, take: 100 }).catch(() => []),
        prisma.resortReview.aggregate({ where: { resortId: matched.id }, _avg: { rating: true }, _count: true }),
      ]);
      reviews = { avg: Math.round((agg._avg.rating || 0) * 10) / 10, count: agg._count };
    }

    res.json({
      name,
      resort: matched,
      season: matchedRow
        ? { openDate: matchedRow.openDate, closeDate: matchedRow.closeDate, seasonNote: matchedRow.seasonNote }
        : null,
      reviews,
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
