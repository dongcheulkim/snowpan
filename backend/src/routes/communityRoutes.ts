import { Router } from 'express';
import { getPosts, getPostById, createPost, likePost, createComment } from '../controllers/communityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/', authenticateToken, createPost);
router.put('/:id/like', likePost);
router.post('/:id/comments', authenticateToken, createComment);

export default router;
