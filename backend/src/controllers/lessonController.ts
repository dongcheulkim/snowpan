import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { notifyAdmins } from './notificationController';
import { parsePrice, isAllowedImageUrl } from '../utils/validate';
import { pickVertical } from '../utils/vertical';
import { stripPrivate, stripPrivateAll } from '../utils/publicFields';
import { sanitizeText } from '../utils/sanitize';
import { sanitizeImages } from '../utils/images';

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
// 레슨 등록 (포스터형) — 레슨명·스키장·종류·상세설명·사진들. 나머지(가격/난이도/시간/인원)는 선택.
export const createLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const b = req.body;
    const verticalSlug = pickVertical(b.vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    if (!b.name || !b.resortId || !b.description) {
      res.status(400).json({ error: '레슨명, 스키장, 상세설명은 필수입니다.' });
      return;
    }
    if (b.image && !isAllowedImageUrl(b.image)) { res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return; }
    const images = sanitizeImages(b.images);
    // 가격은 선택 — 있으면 검증.
    let price: number | null = null;
    if (b.price !== undefined && b.price !== null && b.price !== '') {
      const r = parsePrice(b.price);
      if (!r.ok) { res.status(400).json({ error: r.error }); return; }
      price = r.value;
    }

    const lesson = await prisma.lesson.create({
      data: {
        name: sanitizeText(b.name, 100) || b.name,
        type: sanitizeText(b.type, 30) || null,
        description: sanitizeText(b.description, 4000) || b.description,
        images,
        image: b.image || (images ? images.split(',')[0] : null), // 대표 = 첫 사진
        price,
        duration: sanitizeText(b.duration, 60) || null,
        level: sanitizeText(b.level, 30) || null,
        maxStudents: b.maxStudents ? Math.max(1, Number(b.maxStudents) || 1) : null,
        instructorCert: b.instructorCert || null,
        businessLicense: b.businessLicense || null,
        resortId: b.resortId,
        userId,
        approved: false,
        vertical: verticalSlug,
      },
      include: { resort: true, user: { select: { name: true } } },
    });

    await notifyAdmins('system', '새 레슨 등록', `"${lesson.name}" 레슨이 등록 신청되었습니다.`, '/admin-approval');
    res.status(201).json({ ...lesson, message: '레슨 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.' });
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

    const b = req.body;
    if (b.image !== undefined && b.image !== null && b.image !== '' && !isAllowedImageUrl(b.image)) {
      res.status(400).json({ error: '허용되지 않은 이미지입니다.' }); return;
    }
    const ownerEdit = req.user!.role !== 'admin';
    const data: Record<string, unknown> = {};
    if (b.name !== undefined) data.name = sanitizeText(b.name, 100) || b.name;
    if (b.type !== undefined) data.type = b.type ? (sanitizeText(b.type, 30) || b.type) : null;
    if (b.description !== undefined) data.description = b.description ? (sanitizeText(b.description, 4000) || b.description) : null;
    if (b.images !== undefined) data.images = sanitizeImages(b.images);
    if (b.image !== undefined) data.image = b.image || null;
    if (b.price !== undefined) {
      if (b.price === null || b.price === '') data.price = null;
      else { const r = parsePrice(b.price); if (!r.ok) { res.status(400).json({ error: r.error }); return; } data.price = r.value; }
    }
    if (b.duration !== undefined) data.duration = b.duration ? (sanitizeText(b.duration, 60) || b.duration) : null;
    if (b.level !== undefined) data.level = b.level ? (sanitizeText(b.level, 30) || b.level) : null;
    if (b.maxStudents !== undefined) data.maxStudents = b.maxStudents ? Math.max(1, Number(b.maxStudents) || 1) : null;
    if (b.resortId !== undefined && b.resortId) data.resortId = b.resortId;
    if (ownerEdit) data.approved = false;
    const updated = await prisma.lesson.update({ where: { id }, data });
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
