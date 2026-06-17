import { Router } from 'express';
import { authenticateToken as authenticate } from '../middleware/auth';
import { submitRun, myRuns, myStats, getRun } from '../controllers/snowRunController';

const router = Router();
router.use(authenticate);

router.post('/', submitRun);
router.get('/my', myRuns);
router.get('/stats', myStats);
router.get('/:id', getRun);

export default router;
