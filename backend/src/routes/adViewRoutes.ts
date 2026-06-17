import { Router } from 'express';
import { authenticateToken as authenticate } from '../middleware/auth';
import { recordAdView } from '../controllers/adViewController';

const router = Router();
router.use(authenticate);

router.post('/view', recordAdView);

export default router;
