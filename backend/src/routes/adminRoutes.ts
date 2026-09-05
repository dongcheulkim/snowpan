import { Router } from 'express';
import {
  getPendingRentals,
  getPendingLessons,
  getPendingAccommodations,
  getPendingBadges,
  approveRental,
  approveLesson,
  approveAccommodation,
  approveBadge,
  rejectRental,
  rejectLesson,
  rejectAccommodation,
  rejectBadge,
  getReports,
  resolveReport,
  getStats,
  getUsers,
  banUser,
  adminDeleteUser,
  getBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  getAdRequests,
  approveAdRequest,
  rejectAdRequest,
} from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { isFcmConfigured, sendPushToUser } from '../utils/push';
import prisma from '../config/database';

const router = Router();

// 모든 관리자 라우트: 인증 + admin 권한 한번에. 각 컨트롤러 인라인 체크는 중복이라 제거 가능.
router.use(authenticateToken, requireAdmin);

// 푸시 셀프 테스트 — FCM 서버 키·기기 토큰 상태 확인 + 본인 기기로 테스트 알림 발송.
router.post('/push-test', async (req: any, res) => {
  try {
    const configured = await isFcmConfigured();
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fcmToken: true } });
    const hasToken = !!me?.fcmToken;
    let sent = false; let detail = '';
    if (configured && hasToken) {
      const r = await sendPushToUser(req.user.id, '푸시 테스트', '스노우판 푸시가 정상 작동합니다.', '/admin');
      sent = r.ok; detail = r.detail; // 실패 시 FCM 에러코드 그대로 노출 — 원인 즉시 파악용
    }
    res.json({ fcmConfigured: configured, hasToken, sent, detail });
  } catch (e) {
    console.error('Push test error:', e);
    res.status(500).json({ error: '푸시 테스트 실패' });
  }
});

// 승인 대기 목록 조회
router.get('/rentals/pending', getPendingRentals);
router.get('/lessons/pending', getPendingLessons);
router.get('/accommodations/pending', getPendingAccommodations);
router.get('/badges/pending', getPendingBadges);

// 승인
router.put('/rentals/:id/approve', approveRental);
router.put('/lessons/:id/approve', approveLesson);
router.put('/accommodations/:id/approve', approveAccommodation);
router.put('/badges/:id/approve', approveBadge);

// 거부
router.delete('/rentals/:id/reject', rejectRental);
router.delete('/lessons/:id/reject', rejectLesson);
router.delete('/accommodations/:id/reject', rejectAccommodation);
router.delete('/badges/:id/reject', rejectBadge);

// 신고 관리
router.get('/reports', getReports);
router.put('/reports/:id', resolveReport);

// 통계
router.get('/stats', getStats);

// 유저 관리
router.get('/users', getUsers);
router.put('/users/:id/ban', banUser);
router.delete('/users/:id', adminDeleteUser);

// 배너 관리 (관리자)
router.get('/banners', getBannersAdmin);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// 광고 신청 관리
router.get('/ad-requests', getAdRequests);
router.put('/ad-requests/:id/approve', approveAdRequest);
router.put('/ad-requests/:id/reject', rejectAdRequest);

export default router;
