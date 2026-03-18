import { Request, Response } from 'express';
import prisma from '../config/database';

export const getLessons = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resortId, level } = req.query;

    const where: any = { approved: true }; // 승인된 레슨만 조회
    if (resortId) where.resortId = resortId as string;
    if (level) where.level = level as string;

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(lessons);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: '레슨 조회 중 오류가 발생했습니다.' });
  }
};

// 레슨 등록 (로그인 필요, 관리자 승인 대기)
export const createLesson = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { name, price, duration, level, maxStudents, image, resortId } = req.body;

    const lesson = await prisma.lesson.create({
      data: {
        name,
        price: parseInt(price),
        duration,
        level,
        maxStudents: parseInt(maxStudents),
        image,
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
