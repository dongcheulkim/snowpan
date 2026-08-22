import { Router } from 'express';
import { getRentals, getRentalById, createRental, updateRental, deleteRental, getMyRentals } from '../controllers/rentalController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', getRentals);
router.get('/my', authenticateToken, getMyRentals);
router.get('/:id', optionalAuth, getRentalById);
router.post('/', authenticateToken, createRental);
router.put('/:id', authenticateToken, updateRental);
router.delete('/:id', authenticateToken, deleteRental); // 렌탈 등록

export default router;
