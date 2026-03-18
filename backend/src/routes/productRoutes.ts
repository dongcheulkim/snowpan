import { Router } from 'express';
import { getProducts, getProductById, createUsedProduct, createNewProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/used', authenticateToken, createUsedProduct);
router.post('/new', authenticateToken, createNewProduct);
router.put('/:id', authenticateToken, updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

export default router;
