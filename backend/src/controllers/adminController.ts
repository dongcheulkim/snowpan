import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { createNotification } from './notificationController';

// 승인 대기 중인 렌탈 목록 조회 (관리자만)
export const getPendingRentals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
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
export const getPendingLessons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
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
export const approveRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
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

    await createNotification(rental.userId, 'approve', '렌탈 승인', `'${rental.name}' 렌탈이 승인되었습니다.`, '/rental');
    res.json({ ...rental, message: '렌탈이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve rental error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

// 레슨 승인 (관리자만)
export const approveLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
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

    await createNotification(lesson.userId, 'approve', '레슨 승인', `'${lesson.name}' 레슨이 승인되었습니다.`, '/lesson');
    res.json({ ...lesson, message: '레슨이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve lesson error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

// 렌탈 거부/삭제 (관리자만)
export const rejectRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    const rental = await prisma.rental.findUnique({ where: { id } });
    const rentalUserId = rental?.userId;
    const rentalName = rental?.name;
    await prisma.rental.delete({ where: { id } });

    if (rentalUserId) await createNotification(rentalUserId, 'reject', '렌탈 거부', `'${rentalName}' 렌탈이 거부되었습니다.`);
    res.json({ message: '렌탈이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject rental error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// 레슨 거부/삭제 (관리자만)
export const rejectLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({ where: { id } });
    const lessonUserId = lesson?.userId;
    const lessonName = lesson?.name;
    await prisma.lesson.delete({ where: { id } });

    if (lessonUserId) await createNotification(lessonUserId, 'reject', '레슨 거부', `'${lessonName}' 레슨이 거부되었습니다.`);
    res.json({ message: '레슨이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject lesson error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// ===== 숙소 =====
export const getPendingAccommodations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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

export const approveAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const item = await prisma.accommodation.update({ where: { id: req.params.id }, data: { approved: true } });
    await createNotification(item.userId, 'approve', '숙소 승인', `'${item.name}' 숙소가 승인되었습니다.`, '/accommodation');
    res.json({ ...item, message: '숙소가 승인되었습니다.' });
  } catch (error) {
    console.error('Approve accommodation error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

export const rejectAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const accom = await prisma.accommodation.findUnique({ where: { id: req.params.id } });
    const accomUserId = accom?.userId;
    const accomName = accom?.name;
    await prisma.accommodation.delete({ where: { id: req.params.id } });
    if (accomUserId) await createNotification(accomUserId, 'reject', '숙소 거부', `'${accomName}' 숙소가 거부되었습니다.`);
    res.json({ message: '숙소가 거부되었습니다.' });
  } catch (error) {
    console.error('Reject accommodation error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// ===== 자격증 뱃지 =====
export const getPendingBadges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
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

export const approveBadge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const item = await prisma.badgeRequest.update({ where: { id: req.params.id }, data: { status: 'approved' } });
    await createNotification(item.userId, 'badge', '자격증 승인', `자격증 인증이 승인되었습니다.`, '/mypage');
    res.json({ ...item, message: '자격증이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve badge error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

export const rejectBadge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const badge = await prisma.badgeRequest.update({ where: { id: req.params.id }, data: { status: 'rejected' } });
    await createNotification(badge.userId, 'badge', '자격증 거부', `자격증 인증이 거부되었습니다.`);
    res.json({ message: '자격증이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject badge error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};
