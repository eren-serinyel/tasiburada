import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const notificationController = new NotificationController();

router.use(authenticateToken);
router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markRead);
router.put('/read-all', notificationController.markAllRead);
router.get('/unread-count', notificationController.getUnreadCount);

export default router;
