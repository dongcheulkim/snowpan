import { Router } from 'express';
import { getProducts, getProductById, createUsedProduct, createNewProduct, updateProduct, deleteProduct, toggleWishlist, getMyWishlist, bumpProduct, getMarketStats } from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/market-stats', getMarketStats);
router.get('/wishlist', authenticateToken, getMyWishlist);
router.get('/:id', getProductById);
router.post('/used', authenticateToken, createUsedProduct);
router.post('/new', authenticateToken, createNewProduct);
router.post('/:id/wishlist', authenticateToken, toggleWishlist);
router.put('/:id/bump', authenticateToken, bumpProduct);
router.put('/:id', authenticateToken, updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

export default router;
