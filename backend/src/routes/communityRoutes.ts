import { Router } from 'express';
import { getPosts, getPopularPosts, getPostById, createPost, likePost, createComment, deleteComment, updatePost, deletePost } from '../controllers/communityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getPosts);
router.get('/popular', getPopularPosts);
router.get('/:id', getPostById);
router.post('/', authenticateToken, createPost);
router.put('/:id', authenticateToken, updatePost);
router.delete('/:id', authenticateToken, deletePost);
router.put('/:id/like', authenticateToken, likePost);
router.post('/:id/comments', authenticateToken, createComment);
router.delete('/comments/:id', authenticateToken, deleteComment);

export default router;
