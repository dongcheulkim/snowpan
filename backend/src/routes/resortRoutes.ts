import { Router } from 'express';
import { getResorts, getResortById, getResortLanding, getResortSeason, updateResortSeason } from '../controllers/resortController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getResorts);
router.get('/season', getResortSeason); // /:id 보다 먼저 — 'season' 이 id 로 잡히지 않게
router.get('/landing/:name', getResortLanding); // /:id 보다 먼저 — 'landing' 이 id 로 잡히지 않게
router.put('/:id/season', authenticateToken, requireAdmin, updateResortSeason); // 관리자 — 개장·폐장일·메모
router.get('/:id', getResortById);

export default router;
