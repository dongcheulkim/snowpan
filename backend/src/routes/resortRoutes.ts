import { Router } from 'express';
import { getResorts, getResortById } from '../controllers/resortController';

const router = Router();

router.get('/', getResorts);
router.get('/:id', getResortById);

export default router;
