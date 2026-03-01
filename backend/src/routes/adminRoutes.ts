import { Router } from 'express';
import {
  getPendingRentals,
  getPendingLessons,
  approveRental,
  approveLesson,
  rejectRental,
  rejectLesson,
} from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 모든 관리자 라우트는 인증 필요
router.use(authenticateToken);

// 승인 대기 목록 조회
router.get('/rentals/pending', getPendingRentals);
router.get('/lessons/pending', getPendingLessons);

// 승인/거부
router.put('/rentals/:id/approve', approveRental);
router.put('/lessons/:id/approve', approveLesson);
router.delete('/rentals/:id/reject', rejectRental);
router.delete('/lessons/:id/reject', rejectLesson);

export default router;
