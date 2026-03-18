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
  setProductPremium,
  getBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 모든 관리자 라우트는 인증 필요
router.use(authenticateToken);

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

// 프리미엄 관리
router.put('/products/:id/premium', setProductPremium);

// 배너 관리 (관리자)
router.get('/banners', getBannersAdmin);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

export default router;
