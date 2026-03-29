import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resortId, level, limit, offset } = req.query;

    const where: any = { approved: true };
    if (resortId) where.resortId = resortId as string;
    if (level) where.level = level as string;

    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const [lessons, totalCount] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          resort: true,
          user: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(skip !== undefined && { skip }),
      }),
      prisma.lesson.count({ where }),
    ]);

    res.json({ items: lessons, totalCount });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: '레슨 조회 중 오류가 발생했습니다.' });
  }
};

// 레슨 등록 (로그인 필요, 관리자 승인 대기)
export const createLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, price, duration, level, maxStudents, image, resortId, instructorCert, businessLicense } = req.body;

    if (!name || !price || !duration || !level || !maxStudents || !image || !resortId) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }

    const lesson = await prisma.lesson.create({
      data: {
        name,
        price: Number(price) || 0,
        duration,
        level,
        maxStudents: Number(maxStudents) || 1,
        image,
        instructorCert: instructorCert || null,
        businessLicense: businessLicense || null,
        resortId,
        userId,
        approved: false, // 관리자 승인 대기
      },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json({
      ...lesson,
      message: '레슨 등록이 완료되었습니다. 관리자 승인 후 게시됩니다.'
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: '레슨 등록 중 오류가 발생했습니다.' });
  }
};

export const getLessonById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        resort: true,
        user: { select: { name: true, phone: true } },
      },
    });

    if (!lesson) {
      res.status(404).json({ error: '레슨 정보를 찾을 수 없습니다.' });
      return;
    }

    res.json(lesson);
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

    const { name, price, duration, level, maxStudents, image } = req.body;
    const updated = await prisma.lesson.update({
      where: { id },
      data: { ...(name && { name }), ...(price && !isNaN(Number(price)) && { price: Number(price) }), ...(duration && { duration }), ...(level && { level }), ...(maxStudents && !isNaN(Number(maxStudents)) && { maxStudents: Number(maxStudents) }), ...(image && { image }) },
    });
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
