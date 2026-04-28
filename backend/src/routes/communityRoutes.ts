import { Router } from 'express';
import { getPosts, getPopularPosts, getPostById, createPost, likePost, createComment, deleteComment, updatePost, deletePost } from '../controllers/communityController';
import { authenticateToken } from '../middleware/auth';
import { postCreateLimiter, postCreateLimiterHourly, commentCreateLimiter, commentCreateLimiterHourly } from '../middleware/rateLimit';

const router = Router();

router.get('/', getPosts);
router.get('/popular', getPopularPosts);
router.get('/:id', getPostById);
// 글 작성: 분당 3건 + 시간당 20건 (사용자 단위) + 기존 strictWriteLimiter (IP 단위 분당 10건).
// 3중 throttle 로 봇 도배 차단.
router.post('/', authenticateToken, postCreateLimiter, postCreateLimiterHourly, createPost);
router.put('/:id', authenticateToken, updatePost);
router.delete('/:id', authenticateToken, deletePost);
router.put('/:id/like', authenticateToken, likePost);
// 댓글: 분당 5건 + 시간당 60건.
router.post('/:id/comments', authenticateToken, commentCreateLimiter, commentCreateLimiterHourly, createComment);
router.delete('/comments/:id', authenticateToken, deleteComment);

export default router;
