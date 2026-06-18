import { Router } from 'express';
import { authenticateToken as authenticate } from '../middleware/auth';
import { getBalance, getHistory, checkin, getCheckinStatus } from '../controllers/pointsController';

const router = Router();
router.use(authenticate);

router.get('/balance', getBalance);
router.get('/history', getHistory);
router.get('/checkin', getCheckinStatus);
router.post('/checkin', checkin);

export default router;
