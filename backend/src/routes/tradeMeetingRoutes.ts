// 중고 거래 약속 (2026-10-09) — 결제 없음. index.ts: app.use('/api/trade-meetings', strictWriteLimiter, tradeMeetingRoutes)
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createUserLimiter } from '../middleware/rateLimit';
import { validateUUIDParam } from '../middleware/validateUUID';
import { proposeMeeting, getMeeting, getMyMeetings, acceptMeeting, declineMeeting, cancelMeeting, completeMeeting } from '../controllers/tradeMeetingController';

const router = Router();

// 제안: 유저당 1시간 20건 (상대 알림 도배 차단)
const proposeLimiter = createUserLimiter(20, 60 * 60_000);

router.post('/', authenticateToken, proposeLimiter, proposeMeeting);
router.get('/mine', authenticateToken, getMyMeetings);
router.get('/:id', authenticateToken, validateUUIDParam('id'), getMeeting);
router.put('/:id/accept', authenticateToken, validateUUIDParam('id'), acceptMeeting);
router.put('/:id/decline', authenticateToken, validateUUIDParam('id'), declineMeeting);
router.put('/:id/cancel', authenticateToken, validateUUIDParam('id'), cancelMeeting);
router.put('/:id/complete', authenticateToken, validateUUIDParam('id'), completeMeeting);

export default router;
