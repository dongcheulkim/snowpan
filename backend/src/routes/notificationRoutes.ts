import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.put('/read-all', authenticateToken, markAllAsRead);
router.delete('/all', authenticateToken, deleteAllNotifications);
router.put('/:id/read', authenticateToken, markAsRead);
router.delete('/:id', authenticateToken, deleteNotification);

export default router;
