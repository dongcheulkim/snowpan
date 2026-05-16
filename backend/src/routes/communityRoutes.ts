import { Router } from 'express';
import { getPosts, getPopularPosts, getPostById, createPost, likePost, createComment, deleteComment, updatePost, deletePost } from '../controllers/communityController';
import { authenticateToken } from '../middleware/auth';
import { postCreateLimiter, postCreateLimiterHourly, commentCreateLimiter, commentCreateLimiterHourly } from '../middleware/rateLimit';
import { validateUUIDParam } from '../middleware/validateUUID';

const router = Router();

router.get('/', getPosts);
router.get('/popular', getPopularPosts);
router.get('/:id', validateUUIDParam('id'), getPostById);
// 글 작성: 분당 3건 + 시간당 20건 (사용자 단위) + 기존 strictWriteLimiter (IP 단위 분당 10건).
// 3중 throttle 로 봇 도배 차단.
router.post('/', authenticateToken, postCreateLimiter, postCreateLimiterHourly, createPost);
router.put('/:id', authenticateToken, validateUUIDParam('id'), updatePost);
router.delete('/:id', authenticateToken, validateUUIDParam('id'), deletePost);
router.put('/:id/like', authenticateToken, validateUUIDParam('id'), likePost);
// 댓글: 분당 5건 + 시간당 60건.
router.post('/:id/comments', authenticateToken, validateUUIDParam('id'), commentCreateLimiter, commentCreateLimiterHourly, createComment);
router.delete('/comments/:id', authenticateToken, validateUUIDParam('id'), deleteComment);

export default router;
