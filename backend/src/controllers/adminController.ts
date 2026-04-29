import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { createNotification } from './notificationController';
import { cacheGet, cacheSet, cacheDel } from '../utils/cache';

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
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }

    // 1) 누적 카운트
    const [users, products, posts, chatRooms] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.post.count(),
      prisma.chatRoom.count(),
    ]);

    // 2) 동시접속자 (Socket.IO connection 수). 미들웨어에서 io 를 app.locals 에 셋팅했음.
    const io = req.app.get('io');
    let concurrent = 0;
    let concurrentUsers = 0;
    try {
      // engine.clientsCount = 활성 socket 연결 수 (인증 안 된 연결 포함 가능)
      concurrent = io?.engine?.clientsCount ?? 0;
      // 로그인 유저 룸 (`user:<id>`) 의 distinct 카운트
      const rooms = io?.sockets?.adapter?.rooms;
      if (rooms) {
        let n = 0;
        for (const key of rooms.keys()) {
          if (typeof key === 'string' && key.startsWith('user:')) n++;
        }
        concurrentUsers = n;
      }
    } catch { /* ignore */ }

    // 3) DAU/방문 통계 — 최근 14일
    const days = 14;
    const today = todayKST();
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));
    const sinceStr = (() => { const d = new Date(since.getTime() + 9 * 60 * 60 * 1000); return d.toISOString().slice(0, 10); })();

    const [newUsers, newProducts, visits] = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.product.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.dailyVisit.findMany({
        where: { date: { gte: sinceStr } },
        select: { date: true, ip: true, count: true },
      }),
    ]);

    // 일별 버킷 — KST 기준
    const buckets: { date: string; users: number; products: number; visitors: number; pageviews: number }[] = [];
    const dateList: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dateList.push(kstDate);
      buckets.push({ date: kstDate.slice(5), users: 0, products: 0, visitors: 0, pageviews: 0 });
    }

    const kstKeyOfDate = (d: Date) => new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).slice(5);
    for (const u of newUsers) {
      const b = buckets.find(x => x.date === kstKeyOfDate(new Date(u.createdAt)));
      if (b) b.users++;
    }
    for (const p of newProducts) {
      const b = buckets.find(x => x.date === kstKeyOfDate(new Date(p.createdAt)));
      if (b) b.products++;
    }
    // visits — date 가 이미 'YYYY-MM-DD' KST. distinct ip 카운트 + pageview 합계
    const visitorsByDate = new Map<string, Set<string>>();
    const pageviewsByDate = new Map<string, number>();
    for (const v of visits) {
      const set = visitorsByDate.get(v.date) || new Set();
      set.add(v.ip);
      visitorsByDate.set(v.date, set);
      pageviewsByDate.set(v.date, (pageviewsByDate.get(v.date) || 0) + v.count);
    }
    for (const b of buckets) {
      const fullDate = dateList.find(d => d.slice(5) === b.date);
      if (fullDate) {
        b.visitors = visitorsByDate.get(fullDate)?.size || 0;
        b.pageviews = pageviewsByDate.get(fullDate) || 0;
      }
    }

    // 4) 핵심 지표 요약
    const todayBucket = buckets.find(b => b.date === today.slice(5)) || { visitors: 0, pageviews: 0 };
    const last7 = buckets.slice(-7);
    const wau = new Set<string>();
    for (const v of visits) {
      const dayIndex = dateList.indexOf(v.date);
      if (dayIndex >= dateList.length - 7) wau.add(v.ip);
    }

    res.json({
      // 누적
      users, products, posts, chatRooms,
      // 실시간
      live: { concurrent, concurrentUsers },
      // 오늘
      today: { visitors: todayBucket.visitors, pageviews: todayBucket.pageviews },
      // 최근 7일
      week: { uniqueVisitors: wau.size, pageviews: last7.reduce((s, b) => s + b.pageviews, 0) },
      // 14일 차트 데이터
      daily: buckets,
    });
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
      select: { id: true, name: true, nickname: true, email: true, role: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    // 전화번호 마스킹 — 가운데 4자리 가림 (010-1234-5678 → 010-****-5678).
    // admin 권한이라도 list 화면에선 평문 노출 X. 신고 처리 등 필요 시 별도 단건 조회로.
    const masked = users.map((u) => ({
      ...u,
      phone: u.phone ? u.phone.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1****$3') : u.phone,
    }));
    res.json(masked);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '유저 목록 조회 중 오류가 발생했습니다.' });
  }
};

export const banUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }
    const newRole = target.role === 'banned' ? 'user' : 'banned';
    const user = await prisma.user.update({ where: { id }, data: { role: newRole } });
    const msg = newRole === 'banned' ? '계정이 정지되었습니다.' : '계정 정지가 해제되었습니다.';
    await createNotification(id, 'system', newRole === 'banned' ? '계정 정지' : '정지 해제', msg);
    res.json({ id: user.id, name: user.name, role: user.role, message: msg });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: '유저 정지 중 오류가 발생했습니다.' });
  }
};

// 관리자: 사용자 강제 탈퇴 — 사용자 본인 탈퇴와 동일하게 PII 익명화 처리.
// 거래·후기·게시글은 전자상거래법 5년 보관 의무로 유지.
export const adminDeleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    if (id === req.user!.id) { res.status(400).json({ error: '본인 계정은 사용자 화면에서 탈퇴해주세요.' }); return; }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }
    if (target.role === 'deleted') { res.status(400).json({ error: '이미 탈퇴 처리된 계정입니다.' }); return; }

    const stamp = Date.now();
    const anonEmail = `deleted_${id}@snowpan.local`;
    const anonPhone = `deleted_${stamp}_${id.slice(0, 8)}`;
    const lockedHash = `__admin_deleted_${stamp}__${Math.random().toString(36).slice(2)}`;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          email: anonEmail,
          phone: anonPhone,
          name: '탈퇴한 회원',
          nickname: null,
          profileImage: null,
          fcmToken: null,
          activeBadge: null,
          phoneVerified: false,
          password: lockedHash,
          role: 'deleted',
        },
      });
      await tx.product.updateMany({ where: { userId: id, status: 'selling' }, data: { status: 'sold' } });
    });

    res.json({ success: true, message: '계정이 익명화 처리되었습니다.' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: '사용자 삭제 중 오류가 발생했습니다.' });
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
    const cacheKey = 'banners:public';
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const banners = await prisma.banner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      take: 5,
    });
    const cleaned = banners.map(b => ({ ...b, tag: b.tag.startsWith('ad:') ? 'AD' : b.tag }));
    cacheSet(cacheKey, cleaned, 30);
    res.json(cleaned);
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
    const { badgeType } = req.body || {};
    const data: any = { status: 'approved' };
    if (badgeType) data.badgeType = badgeType;
    const item = await prisma.badgeRequest.update({ where: { id: req.params.id }, data });
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

// ===== 광고 신청 관리 (Admin) =====
export const getAdRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const items = await prisma.adRequest.findMany({
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Get ad requests error:', error);
    res.status(500).json({ error: '광고 신청 목록 조회 중 오류가 발생했습니다.' });
  }
};

export const approveAdRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const item = await prisma.adRequest.update({ where: { id: req.params.id }, data: { status: 'approved', adminNote: null } });

    // 승인된 광고를 배너에 자동 추가
    const maxOrder = await prisma.banner.aggregate({ _max: { order: true } });
    await prisma.banner.create({
      data: {
        title: item.title,
        description: item.description,
        tag: 'AD',
        url: item.url,
        image: item.image,
        order: (maxOrder._max.order || 0) + 1,
        active: true,
      },
    });
    cacheDel('banners:public'); // 배너 캐시 초기화

    await createNotification(item.userId, 'approve', '광고 신청 승인', `'${item.title}' 광고 신청이 승인되었습니다.`, '/mypage');
    res.json({ ...item, message: '광고 신청이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve ad request error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

export const rejectAdRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { adminNote } = req.body as { adminNote?: string };
    const item = await prisma.adRequest.update({ where: { id: req.params.id }, data: { status: 'rejected', adminNote: adminNote || null } });
    await createNotification(item.userId, 'reject', '광고 신청 거부', `'${item.title}' 광고 신청이 거부되었습니다.`);
    res.json({ ...item, message: '광고 신청이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject ad request error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};
