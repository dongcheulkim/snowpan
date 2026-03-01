import { Router } from 'express';
import { getProducts, getProductById, createUsedProduct, createNewProduct } from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/used', authenticateToken, createUsedProduct); // 중고 장비 등록
router.post('/new', authenticateToken, createNewProduct); // 새 장비 등록 (관리자만)

export default router;
