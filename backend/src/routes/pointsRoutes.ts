import { Router } from 'express';
import { authenticateToken as authenticate } from '../middleware/auth';
import { getBalance, getHistory } from '../controllers/pointsController';

const router = Router();
router.use(authenticate);

router.get('/balance', getBalance);
router.get('/history', getHistory);

export default router;
