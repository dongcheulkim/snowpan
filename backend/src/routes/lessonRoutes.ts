import { Router } from 'express';
import { getLessons, getLessonById, createLesson } from '../controllers/lessonController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', getLessons);
router.get('/:id', getLessonById);
router.post('/', authenticateToken, createLesson); // 레슨 등록

export default router;
