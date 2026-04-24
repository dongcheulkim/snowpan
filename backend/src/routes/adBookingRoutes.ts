import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  getSlotPricings,
  getAvailability,
  createBooking,

  getMyBookings,
  deleteBooking,
  cancelBooking,
  getActiveAds,
  adminGetBookings,
  adminGetRevenue,
  adminGetPricings,
  adminUpsertPricing,
  adminUpdatePricing,
  adminCancelBooking,
  adminApproveBooking,
  adminFreeApprove,
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
router.delete('/:id', authenticateToken, deleteBooking);

// 관리자 API (인증 + admin role)
const adminGuard = [authenticateToken, requireAdmin];
router.get('/admin/bookings', adminGuard, adminGetBookings);
router.get('/admin/revenue', adminGuard, adminGetRevenue);
router.get('/admin/pricings', adminGuard, adminGetPricings);
router.post('/admin/pricings', adminGuard, adminUpsertPricing);
router.put('/admin/pricings/:id', adminGuard, adminUpdatePricing);
router.post('/admin/bookings/:id/approve', adminGuard, adminApproveBooking);
router.post('/admin/bookings/:id/free', adminGuard, adminFreeApprove);
router.post('/admin/bookings/:id/cancel', adminGuard, adminCancelBooking);

export default router;
