import { Router } from 'express';
import { getAccommodations, getAccommodationById, createAccommodation, updateAccommodation, deleteAccommodation } from '../controllers/accommodationController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', getAccommodations);
router.get('/:id', optionalAuth, getAccommodationById);
router.post('/', authenticateToken, createAccommodation);
router.put('/:id', authenticateToken, updateAccommodation);
router.delete('/:id', authenticateToken, deleteAccommodation);

export default router;
