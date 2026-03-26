import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getSlotPricings,
  getAvailability,
  createBooking,

  getMyBookings,
  cancelBooking,
  getActiveAds,
  adminGetBookings,
  adminGetRevenue,
  adminGetPricings,
  adminUpsertPricing,
  adminUpdatePricing,
  adminCancelBooking,
  adminApproveBooking,
} from '../controllers/adBookingController';

const router = Router();

// 공개 API
router.get('/slots', getSlotPricings);
router.get('/availability', getAvailability);
router.get('/active', getActiveAds);

// 사용자 API (인증 필요)
router.post('/create', authenticateToken, createBooking);

router.get('/my-bookings', authenticateToken, getMyBookings);
router.post('/:id/cancel', authenticateToken, cancelBooking);

// 관리자 API (인증 필요)
router.get('/admin/bookings', authenticateToken, adminGetBookings);
router.get('/admin/revenue', authenticateToken, adminGetRevenue);
router.get('/admin/pricings', authenticateToken, adminGetPricings);
router.post('/admin/pricings', authenticateToken, adminUpsertPricing);
router.put('/admin/pricings/:id', authenticateToken, adminUpdatePricing);
router.post('/admin/bookings/:id/approve', authenticateToken, adminApproveBooking);
router.post('/admin/bookings/:id/cancel', authenticateToken, adminCancelBooking);

export default router;
