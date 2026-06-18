import { Router } from 'express';
import { getProducts, getProductById, createUsedProduct, createNewProduct, updateProduct, deleteProduct, toggleWishlist, getMyWishlist, bumpProduct, getMarketStats } from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';
import { validateUUIDParam } from '../middleware/validateUUID';
import { listingCreateLimiter, listingCreateLimiterHourly } from '../middleware/rateLimit';

const router = Router();

router.get('/', getProducts);
router.get('/market-stats', getMarketStats);
router.get('/wishlist', authenticateToken, getMyWishlist);
router.get('/:id', validateUUIDParam('id'), getProductById);
router.post('/used', authenticateToken, listingCreateLimiter, listingCreateLimiterHourly, createUsedProduct);
router.post('/new', authenticateToken, listingCreateLimiter, listingCreateLimiterHourly, createNewProduct);
router.post('/:id/wishlist', authenticateToken, validateUUIDParam('id'), toggleWishlist);
router.put('/:id/bump', authenticateToken, validateUUIDParam('id'), bumpProduct);
router.put('/:id', authenticateToken, validateUUIDParam('id'), updateProduct);
router.delete('/:id', authenticateToken, validateUUIDParam('id'), deleteProduct);

export default router;
