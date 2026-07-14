import { Router } from 'express';
import { getResorts, getResortById, getResortLanding } from '../controllers/resortController';

const router = Router();

router.get('/', getResorts);
router.get('/landing/:name', getResortLanding); // /:id 보다 먼저 — 'landing' 이 id 로 잡히지 않게
router.get('/:id', getResortById);

export default router;
