import { Request, Response } from 'express';
import prisma from '../config/database';

// 승인 대기 중인 렌탈 목록 조회 (관리자만)
export const getPendingRentals = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const rentals = await prisma.rental.findMany({
      where: { approved: false },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rentals);
  } catch (error) {
    console.error('Get pending rentals error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
};

// 승인 대기 중인 레슨 목록 조회 (관리자만)
export const getPendingLessons = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const lessons = await prisma.lesson.findMany({
      where: { approved: false },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(lessons);
  } catch (error) {
    console.error('Get pending lessons error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
};

// 렌탈 승인 (관리자만)
export const approveRental = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    const rental = await prisma.rental.update({
      where: { id },
      data: { approved: true },
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

    res.json({ ...rental, message: '렌탈이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve rental error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

// 레슨 승인 (관리자만)
export const approveLesson = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    const lesson = await prisma.lesson.update({
      where: { id },
      data: { approved: true },
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

    res.json({ ...lesson, message: '레슨이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve lesson error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

// 렌탈 거부/삭제 (관리자만)
export const rejectRental = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    await prisma.rental.delete({
      where: { id },
    });

    res.json({ message: '렌탈이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject rental error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// 레슨 거부/삭제 (관리자만)
export const rejectLesson = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    await prisma.lesson.delete({
      where: { id },
    });

    res.json({ message: '레슨이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject lesson error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// ===== 숙소 =====
export const getPendingAccommodations = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const items = await prisma.accommodation.findMany({
      where: { approved: false },
      include: { resort: true, user: { select: { name: true, phone: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Get pending accommodations error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
};

export const approveAccommodation = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const item = await prisma.accommodation.update({ where: { id: req.params.id }, data: { approved: true } });
    res.json({ ...item, message: '숙소가 승인되었습니다.' });
  } catch (error) {
    console.error('Approve accommodation error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

export const rejectAccommodation = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    await prisma.accommodation.delete({ where: { id: req.params.id } });
    res.json({ message: '숙소가 거부되었습니다.' });
  } catch (error) {
    console.error('Reject accommodation error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// ===== 자격증 뱃지 =====
export const getPendingBadges = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const items = await prisma.badgeRequest.findMany({
      where: { status: 'pending' },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Get pending badges error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
};

export const approveBadge = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const item = await prisma.badgeRequest.update({ where: { id: req.params.id }, data: { status: 'approved' } });
    res.json({ ...item, message: '자격증이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve badge error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

export const rejectBadge = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    await prisma.badgeRequest.update({ where: { id: req.params.id }, data: { status: 'rejected' } });
    res.json({ message: '자격증이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject badge error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};
