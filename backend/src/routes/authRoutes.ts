import { Router } from 'express';
import {
  register,
  login,
  sendPhoneVerification,
  verifyPhone,
  getMyBadges,
  requestBadge,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/phone/send', sendPhoneVerification);
router.post('/phone/verify', verifyPhone);
router.get('/my-badges', authenticateToken, getMyBadges);
router.post('/badge-request', authenticateToken, requestBadge);

export default router;
