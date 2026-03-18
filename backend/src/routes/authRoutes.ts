import { Router } from 'express';
import {
  register,
  login,
  sendPhoneVerification,
  verifyPhone,
  getMyBadges,
  requestBadge,
  updateProfile,
  getProfile,
  getSellerProfile,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/phone/send', sendPhoneVerification);
router.post('/phone/verify', verifyPhone);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/my-badges', authenticateToken, getMyBadges);
router.post('/badge-request', authenticateToken, requestBadge);
router.get('/seller/:id', getSellerProfile);

export default router;
