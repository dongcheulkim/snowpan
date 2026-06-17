import { Router } from 'express';
import { authenticateToken as authenticate } from '../middleware/auth';
import {
  listCoupons,
  getCoupon,
  purchaseCoupon,
  myCoupons,
  useCoupon,
} from '../controllers/couponController';

const router = Router();

// 공개 — 비로그인도 쿠폰샵 둘러보기 가능 (가입 유도).
router.get('/', listCoupons);
router.get('/my', authenticate, myCoupons);
router.get('/:id', getCoupon);
router.post('/:id/purchase', authenticate, purchaseCoupon);
router.post('/my/:id/use', authenticate, useCoupon);

export default router;
