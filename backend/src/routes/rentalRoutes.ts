import { Router } from 'express';
import { getRentals, getRentalById, createRental, updateRental, deleteRental } from '../controllers/rentalController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getRentals);
router.get('/:id', getRentalById);
router.post('/', authenticateToken, createRental);
router.put('/:id', authenticateToken, updateRental);
router.delete('/:id', authenticateToken, deleteRental); // 렌탈 등록

export default router;
