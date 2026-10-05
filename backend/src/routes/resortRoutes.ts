import { Router } from 'express';
import { getResorts, getResortById, getResortLanding, getResortSeason, updateResortSeason, getOpenAlert, subscribeOpenAlert, unsubscribeOpenAlert } from '../controllers/resortController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getResorts);
router.get('/season', getResortSeason); // /:id 보다 먼저 — 'season' 이 id 로 잡히지 않게
router.get('/landing/:name', getResortLanding); // /:id 보다 먼저 — 'landing' 이 id 로 잡히지 않게
router.put('/:id/season', authenticateToken, requireAdmin, updateResortSeason); // 관리자 — 개장·폐장일·메모
router.get('/:id/open-alert', authenticateToken, getOpenAlert); // 개장 알림 신청 상태 (2026-10-05)
router.post('/:id/open-alert', authenticateToken, subscribeOpenAlert);
router.delete('/:id/open-alert', authenticateToken, unsubscribeOpenAlert);
router.get('/:id', getResortById);

export default router;
