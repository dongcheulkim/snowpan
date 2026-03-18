import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { createNotification } from './notificationController';

// ===== 신고 관리 =====
export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const reports = await prisma.report.findMany({
      include: { reporter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: '신고 조회 중 오류가 발생했습니다.' });
  }
};

export const resolveReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    const report = await prisma.report.update({ where: { id }, data: { status: 'resolved' } });
    res.json({ ...report, message: '신고가 처리되었습니다.' });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: '신고 처리 중 오류가 발생했습니다.' });
  }
};

// ===== 통계 =====
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const [users, products, posts, chatRooms] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.post.count(),
      prisma.chatRoom.count(),
    ]);
    res.json({ users, products, posts, chatRooms });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
};

// ===== 유저 관리 =====
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '유저 목록 조회 중 오류가 발생했습니다.' });
  }
};

export const banUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    const user = await prisma.user.update({ where: { id }, data: { role: 'banned' } });
    await createNotification(id, 'system', '계정 정지', '관리자에 의해 계정이 정지되었습니다.');
    res.json({ id: user.id, name: user.name, role: user.role, message: '유저가 정지되었습니다.' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: '유저 정지 중 오류가 발생했습니다.' });
  }
};

// ===== 프리미엄 관리 =====
export const setProductPremium = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    const { isPremium, premiumUntil } = req.body as { isPremium: boolean; premiumUntil?: string };
    const product = await prisma.product.update({
      where: { id },
      data: {
        isPremium,
        premiumUntil: premiumUntil ? new Date(premiumUntil) : null,
      },
    });
    res.json({ ...product, message: isPremium ? '프리미엄이 설정되었습니다.' : '프리미엄이 해제되었습니다.' });
  } catch (error) {
    console.error('Set product premium error:', error);
    res.status(500).json({ error: '프리미엄 설정 중 오류가 발생했습니다.' });
  }
};

// ===== 배너 관리 (Admin CRUD) =====
export const getBannersAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const banners = await prisma.banner.findMany({ orderBy: { order: 'asc' } });
    res.json(banners);
  } catch (error) {
    console.error('Get banners admin error:', error);
    res.status(500).json({ error: '배너 조회 중 오류가 발생했습니다.' });
  }
};

export const createBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { title, description, tag, url, image, order, active } = req.body as {
      title: string; description: string; tag: string; url: string; image?: string; order?: number; active?: boolean;
    };
    const banner = await prisma.banner.create({
      data: { title, description, tag, url, image: image || null, order: order ?? 0, active: active ?? true },
    });
    res.status(201).json(banner);
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({ error: '배너 생성 중 오류가 발생했습니다.' });
  }
};

export const updateBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    const { title, description, tag, url, image, order, active } = req.body as {
      title?: string; description?: string; tag?: string; url?: string; image?: string; order?: number; active?: boolean;
    };
    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(tag !== undefined && { tag }),
        ...(url !== undefined && { url }),
        ...(image !== undefined && { image }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active }),
      },
    });
    res.json(banner);
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({ error: '배너 수정 중 오류가 발생했습니다.' });
  }
};

export const deleteBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    await prisma.banner.delete({ where: { id } });
    res.json({ message: '배너가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({ error: '배너 삭제 중 오류가 발생했습니다.' });
  }
};

// ===== 공개 배너 API =====
export const getPublicBanners = async (_req: Request, res: Response): Promise<void> => {
  try {
    const banners = await prisma.banner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    res.json(banners);
  } catch (error) {
    console.error('Get public banners error:', error);
    res.status(500).json({ error: '배너 조회 중 오류가 발생했습니다.' });
  }
};

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
