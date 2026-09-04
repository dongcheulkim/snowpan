import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { maskRowUser, maskRowUserAll } from '../utils/displayName';
import { notifyAdmins } from './notificationController';
import { parsePrice, isAllowedImageUrl } from '../utils/validate';
import { sanitizeImages } from '../utils/images';
import { pickVertical } from '../utils/vertical';
import { stripPrivate, stripPrivateAll } from '../utils/publicFields';

// 숙소 유형 화이트리스트 — 콤마 목록 각 항목 검증 (API 직접 호출로 임의 유형 저장 방지)
const ACCOM_TYPES = ['hotel', 'pension', 'condo', 'minbak', 'season', 'guest'];
const cleanAccomType = (v: unknown): string | null => {
  if (typeof v !== 'string' || !v.trim()) return null;
  const picked = v.split(',').map((x) => x.trim()).filter((x) => ACCOM_TYPES.includes(x));
  return picked.length ? [...new Set(picked)].join(',') : null;
};
const validGuests = (v: unknown): boolean => {
  const n = parseInt(String(v), 10);
  return Number.isInteger(n) && n >= 1 && n <= 50;
};

export const getAccommodations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resortId, type, limit, offset, vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    const where: any = { approved: true, vertical: verticalSlug };
    if (resortId && typeof resortId === 'string') {
      // 콤마 목록 지원 — 지역(대분류) 필터가 소속 리조트 id 들을 한 번에 보냄
      const ids = resortId.split(',').filter(Boolean);
      where.resortId = ids.length > 1 ? { in: ids } : ids[0];
    }
    if (type) where.type = { contains: type as string };

    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const [accommodations, totalCount] = await Promise.all([
      prisma.accommodation.findMany({
        where,
        include: {
          resort: true,
          user: { select: { id: true, name: true, nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(skip !== undefined && { skip }),
      }),
      prisma.accommodation.count({ where }),
    ]);

    res.json({ items: maskRowUserAll(stripPrivateAll(accommodations as any)), totalCount });
  } catch (error) {
    console.error('Get accommodations error:', error);
    res.status(500).json({ error: '숙소 조회 중 오류가 발생했습니다.' });
  }
};

export const getAccommodationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const accommodation = await prisma.accommodation.findUnique({
      where: { id },
      include: {
        resort: true,
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });

    if (!accommodation) {
      res.status(404).json({ error: '숙소를 찾을 수 없습니다.' });
      return;
    }
    // 미승인(심사대기·재심사 중)은 소유자/관리자만 조회 — 편집용 로드 허용 + 공개 게이트 유지.
    if (!accommodation.approved && accommodation.userId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(404).json({ error: '숙소를 찾을 수 없습니다.' });
      return;
    }

    res.json(maskRowUser(stripPrivate(accommodation as any)));
  } catch (error) {
    console.error('Get accommodation error:', error);
    res.status(500).json({ error: '숙소 조회 중 오류가 발생했습니다.' });
  }
};

export const createAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, type, price, originalPrice, guests, features, image, images, resortId, businessLicense, accommodationPermit, vertical } = req.body;

    // businessLicense 는 선택 — 개인 시즌방 등도 등록 가능 (등록자 법령 준수 책임은 약관/동의로 이전).
    // features(편의시설)도 선택 — UI에 필수 표시 없고, 편의시설 미선택 매물도 정상.
    if (!name || !type || !guests || !image || !resortId) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }
    const cleanType = cleanAccomType(type);
    if (!cleanType) { res.status(400).json({ error: '숙소 유형이 올바르지 않습니다.' }); return; }
    if (!validGuests(guests)) { res.status(400).json({ error: '최대 인원은 1~50 사이여야 합니다.' }); return; }
    if (!isAllowedImageUrl(image)) {
      res.status(400).json({ error: '허용되지 않은 이미지입니다.' });
      return;
    }
    const priceResult = parsePrice(price);
    if (!priceResult.ok) { res.status(400).json({ error: priceResult.error }); return; }
    let originalParsed = priceResult.value;
    if (originalPrice !== undefined && originalPrice !== null && originalPrice !== '') {
      const r = parsePrice(originalPrice);
      if (!r.ok) { res.status(400).json({ error: r.error }); return; }
      originalParsed = r.value;
    }
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    const accommodation = await prisma.accommodation.create({
      data: {
        name,
        type: cleanType,
        price: priceResult.value,
        originalPrice: originalParsed,
        guests,
        features: features || '',
        image,
        images: sanitizeImages(images),
        businessLicense: businessLicense || null,
        accommodationPermit: accommodationPermit || null,
        resortId,
        userId,
        approved: false,
        vertical: verticalSlug,
      },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    await notifyAdmins('system', '새 숙소 등록', `"${name}" 숙소가 등록 신청되었습니다.`, '/admin-approval');
    res.status(201).json({
      ...accommodation,
      message: '숙소 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.',
    });
  } catch (error) {
    console.error('Create accommodation error:', error);
    res.status(500).json({ error: '숙소 등록 중 오류가 발생했습니다.' });
  }
};

export const updateAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.accommodation.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ error: '숙소를 찾을 수 없습니다.' }); return; }
    if (item.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { name, type, price, originalPrice, guests, features, image, images, resortId } = req.body;
    if (type !== undefined && !cleanAccomType(type)) { res.status(400).json({ error: '숙소 유형이 올바르지 않습니다.' }); return; }
    if (guests !== undefined && !validGuests(guests)) { res.status(400).json({ error: '최대 인원은 1~50 사이여야 합니다.' }); return; }
    let priceUpdate: number | undefined;
    if (price !== undefined && price !== null && price !== '') {
      const r = parsePrice(price);
      if (!r.ok) { res.status(400).json({ error: r.error }); return; }
      priceUpdate = r.value;
    }
    let originalUpdate: number | undefined;
    if (originalPrice !== undefined && originalPrice !== null && originalPrice !== '') {
      const r = parsePrice(originalPrice);
      if (!r.ok) { res.status(400).json({ error: r.error }); return; }
      originalUpdate = r.value;
    }
    if (image !== undefined && image !== null && image !== '' && !isAllowedImageUrl(image)) {
      res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return;
    }
    const ownerEdit = req.user!.role !== 'admin';
    const updated = await prisma.accommodation.update({
      where: { id },
      data: {
        ...(name && { name }), ...(type && { type: cleanAccomType(type) }), ...(priceUpdate !== undefined && { price: priceUpdate }),
        ...(originalUpdate !== undefined && { originalPrice: originalUpdate }), ...(guests && { guests }), ...(features && { features }),
        ...(resortId && { resortId }), ...(image && { image }), ...(images !== undefined && { images: sanitizeImages(images) }),
        ...(ownerEdit && { approved: false }),
      },
    });
    if (ownerEdit) notifyAdmins('system', '숙소 수정 재심사 필요', `${updated.name} 이(가) 수정되어 재검토가 필요합니다.`, '/admin-approval').catch(() => {});
    res.json(updated);
  } catch (error) { res.status(500).json({ error: '수정 중 오류가 발생했습니다.' }); }
};

export const deleteAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.accommodation.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ error: '숙소를 찾을 수 없습니다.' }); return; }
    if (item.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.accommodation.delete({ where: { id } });
    res.json({ message: '숙소가 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' }); }
};

// 내 숙소 목록 (사장님 대시보드) — 승인 여부 무관 전체.
export const getMyAccommodations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accommodations = await prisma.accommodation.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(accommodations);
  } catch (error) { res.status(500).json({ error: '내 숙소 조회 실패' }); }
};
