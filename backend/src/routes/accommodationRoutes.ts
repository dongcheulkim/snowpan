import { Router } from 'express';
import { getAccommodations, getAccommodationById, createAccommodation } from '../controllers/accommodationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getAccommodations);
router.get('/:id', getAccommodationById);
router.post('/', authenticateToken, createAccommodation);

export default router;
