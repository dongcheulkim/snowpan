import { Router, Request, Response } from 'express';
import {
  register,
  login,
  sendPhoneVerification,
  verifyPhone,
  getMyBadges,
  requestBadge,
  updateProfile,
  changePassword,
  getProfile,
  getSellerProfile,
  saveFcmToken,
  resetPasswordRequest,
  resetPassword,
  createAdRequest,
  getMyAdRequests,
  deleteAccount,
  refreshAccessToken,
  logout,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { sensitiveAuthLimiter } from '../middleware/rateLimit';
import { kakaoStart, kakaoCallback, naverStart, naverCallback } from '../controllers/socialAuthController';

const router = Router();

router.post('/register', sensitiveAuthLimiter, register);
router.post('/login', sensitiveAuthLimiter, login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.post('/phone/send', sensitiveAuthLimiter, sendPhoneVerification);
router.post('/phone/verify', sensitiveAuthLimiter, verifyPhone);
router.post('/reset-password-request', sensitiveAuthLimiter, resetPasswordRequest);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.delete('/account', authenticateToken, sensitiveAuthLimiter, deleteAccount);
router.get('/my-badges', authenticateToken, getMyBadges);
router.post('/badge-request', authenticateToken, requestBadge);
router.get('/seller/:id', getSellerProfile);
router.post('/fcm-token', authenticateToken, saveFcmToken);
router.post('/reset-password', sensitiveAuthLimiter, resetPassword);
router.post('/ad-request', authenticateToken, createAdRequest);
router.get('/my-ad-requests', authenticateToken, getMyAdRequests);

// 소셜 로그인 (카카오/네이버) — OAuth authorization code flow.
router.get('/kakao', kakaoStart);
router.get('/kakao/callback', kakaoCallback);
router.get('/naver', naverStart);
router.get('/naver/callback', naverCallback);

export default router;
