import { Router } from 'express';
import {
  register,
  login,
  sendPhoneVerification,
  verifyPhone,
} from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/phone/send', sendPhoneVerification);
router.post('/phone/verify', verifyPhone);

export default router;
