// 방문 예약 (2026-09-17) — 결제 없음. index.ts: app.use('/api/reservations', strictWriteLimiter, reservationRoutes)
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createUserLimiter } from '../middleware/rateLimit';
import { validateUUIDParam } from '../middleware/validateUUID';
import {
  createReservation,
  getMyReservations,
  getShopReservations,
  getReservation,
  confirmReservation,
  declineReservation,
  cancelReservation,
} from '../controllers/reservationController';

const router = Router();

// 예약 요청: 유저당 1시간 10건 (사장님 알림 도배 차단)
const reservationCreateLimiter = createUserLimiter(10, 60 * 60_000);

router.post('/', authenticateToken, reservationCreateLimiter, createReservation);
router.get('/mine', authenticateToken, getMyReservations);
router.get('/shop', authenticateToken, getShopReservations);
router.get('/:id', authenticateToken, validateUUIDParam('id'), getReservation);
router.put('/:id/confirm', authenticateToken, validateUUIDParam('id'), confirmReservation);
router.put('/:id/decline', authenticateToken, validateUUIDParam('id'), declineReservation);
router.put('/:id/cancel', authenticateToken, validateUUIDParam('id'), cancelReservation);

export default router;
