import { Router } from 'express';
import { getLessons, getLessonById, createLesson, updateLesson, deleteLesson, getMyLessons } from '../controllers/lessonController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', getLessons);
router.get('/my', authenticateToken, getMyLessons);
router.get('/:id', optionalAuth, getLessonById);
router.post('/', authenticateToken, createLesson);
router.put('/:id', authenticateToken, updateLesson);
router.delete('/:id', authenticateToken, deleteLesson);

export default router;
