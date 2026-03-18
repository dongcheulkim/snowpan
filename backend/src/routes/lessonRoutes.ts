import { Router } from 'express';
import { getLessons, getLessonById, createLesson, updateLesson, deleteLesson } from '../controllers/lessonController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getLessons);
router.get('/:id', getLessonById);
router.post('/', authenticateToken, createLesson);
router.put('/:id', authenticateToken, updateLesson);
router.delete('/:id', authenticateToken, deleteLesson);

export default router;
