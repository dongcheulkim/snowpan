import { Router } from 'express';
import { getRentals, getRentalById, createRental } from '../controllers/rentalController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getRentals);
router.get('/:id', getRentalById);
router.post('/', authenticateToken, createRental); // 렌탈 등록

export default router;
