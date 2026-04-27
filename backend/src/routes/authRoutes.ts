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
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { sensitiveAuthLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', sensitiveAuthLimiter, register);
router.post('/login', sensitiveAuthLimiter, login);
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

// 카카오 소셜 로그인 (스텁)
router.get('/kakao', (_req: Request, res: Response) => {
  res.json({
    message: '카카오 로그인을 사용하려면 KAKAO_CLIENT_ID와 KAKAO_REDIRECT_URI 환경변수를 설정해주세요.',
    instructions: '1. https://developers.kakao.com 에서 앱을 생성하세요. 2. REST API 키를 KAKAO_CLIENT_ID에 설정하세요. 3. Redirect URI를 등록하세요.',
  });
});

router.get('/kakao/callback', (_req: Request, res: Response) => {
  res.json({ message: '카카오 로그인 콜백 - API 키 설정 후 구현됩니다.' });
});

// 네이버 소셜 로그인 (스텁)
router.get('/naver', (_req: Request, res: Response) => {
  res.json({
    message: '네이버 로그인을 사용하려면 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 환경변수를 설정해주세요.',
    instructions: '1. https://developers.naver.com 에서 앱을 등록하세요. 2. Client ID/Secret을 환경변수에 설정하세요. 3. Callback URL을 등록하세요.',
  });
});

router.get('/naver/callback', (_req: Request, res: Response) => {
  res.json({ message: '네이버 로그인 콜백 - API 키 설정 후 구현됩니다.' });
});

export default router;
