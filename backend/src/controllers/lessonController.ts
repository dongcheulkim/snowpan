import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins } from './notificationController';
import { parsePrice, isAllowedImageUrl } from '../utils/validate';
import { pickVertical } from '../utils/vertical';
import { stripPrivate, stripPrivateAll } from '../utils/publicFields';

export const getLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resortId, level, limit, offset, vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    const where: any = { approved: true, vertical: verticalSlug };
    if (resortId) where.resortId = resortId as string;
    if (level) where.level = level as string;

    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const [lessons, totalCount] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          resort: true,
          user: { select: { id: true, name: true, nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(skip !== undefined && { skip }),
      }),
      prisma.lesson.count({ where }),
    ]);

    res.json({ items: stripPrivateAll(lessons as any), totalCount });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: '레슨 조회 중 오류가 발생했습니다.' });
  }
};

// 레슨 등록 (로그인 필요, 관리자 승인 대기)
export const createLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, price, duration, level, maxStudents, description, image, resortId, instructorCert, businessLicense, vertical } = req.body;

    if (!name || !duration || !level || !maxStudents || !image || !resortId) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }
    if (!isAllowedImageUrl(image)) {
      res.status(400).json({ error: '허용되지 않은 이미지입니다.' });
      return;
    }
    const priceResult = parsePrice(price);
    if (!priceResult.ok) { res.status(400).json({ error: priceResult.error }); return; }
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    const lesson = await prisma.lesson.create({
      data: {
        name,
        price: priceResult.value,
        duration,
        level,
        maxStudents: Math.max(1, Number(maxStudents) || 1),
        description: typeof description === 'string' ? description.slice(0, 2000) : null,
        image,
        instructorCert: instructorCert || null,
        businessLicense: businessLicense || null,
        resortId,
        userId,
        approved: false, // 관리자 승인 대기
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

    await notifyAdmins('system', '새 레슨 등록', `"${name}" 레슨이 등록 신청되었습니다.`, '/admin-approval');
    res.status(201).json({
      ...lesson,
      message: '레슨 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.'
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: '레슨 등록 중 오류가 발생했습니다.' });
  }
};

export const getLessonById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        resort: true,
        user: { select: { id: true, name: true, nickname: true } },
      },
    });

    if (!lesson) {
      res.status(404).json({ error: '레슨 정보를 찾을 수 없습니다.' });
      return;
    }
    // 미승인(심사대기·재심사 중)은 소유자/관리자만 조회 — 편집용 로드 허용 + 공개 게이트 유지.
    if (!lesson.approved && lesson.userId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(404).json({ error: '레슨 정보를 찾을 수 없습니다.' });
      return;
    }

    res.json(stripPrivate(lesson as any));
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: '레슨 조회 중 오류가 발생했습니다.' });
  }
};

export const updateLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.lesson.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ error: '레슨을 찾을 수 없습니다.' }); return; }
    if (item.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { name, price, duration, level, maxStudents, image, resortId } = req.body;
    let priceUpdate: number | undefined;
    if (price !== undefined && price !== null && price !== '') {
      const r = parsePrice(price);
      if (!r.ok) { res.status(400).json({ error: r.error }); return; }
      priceUpdate = r.value;
    }
    if (image !== undefined && image !== null && image !== '' && !isAllowedImageUrl(image)) {
      res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return;
    }
    const { description } = req.body;
    const ownerEdit = req.user!.role !== 'admin';
    const updated = await prisma.lesson.update({
      where: { id },
      data: {
        ...(name && { name }), ...(priceUpdate !== undefined && { price: priceUpdate }), ...(duration && { duration }), ...(level && { level }),
        ...(maxStudents !== undefined && Number(maxStudents) > 0 && { maxStudents: Number(maxStudents) }),
        ...(description !== undefined && { description: typeof description === 'string' ? description.slice(0, 2000) : null }),
        ...(resortId && { resortId }), ...(image && { image }), ...(ownerEdit && { approved: false }),
      },
    });
    if (ownerEdit) notifyAdmins('system', '레슨 수정 재심사 필요', `${updated.name} 이(가) 수정되어 재검토가 필요합니다.`, '/admin-approval').catch(() => {});
    res.json(updated);
  } catch (error) { res.status(500).json({ error: '수정 중 오류가 발생했습니다.' }); }
};

export const deleteLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.lesson.findUnique({ where: { id } });
    if (!item) { res.status(404).json({ error: '레슨을 찾을 수 없습니다.' }); return; }
    if (item.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.lesson.delete({ where: { id } });
    res.json({ message: '레슨이 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' }); }
};

// 내 레슨 목록 (사장님 대시보드) — 승인 여부 무관 전체.
export const getMyLessons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(lessons);
  } catch (error) { res.status(500).json({ error: '내 레슨 조회 실패' }); }
};
