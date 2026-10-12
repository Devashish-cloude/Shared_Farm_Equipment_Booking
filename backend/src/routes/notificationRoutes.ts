import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/notifications', authenticate, NotificationController.getNotifications);
router.get('/notifications/unread-count', authenticate, NotificationController.getUnreadCount);
router.patch('/notifications/mark-all-read', authenticate, NotificationController.markAllAsRead);
router.patch('/notifications/:id/read', authenticate, NotificationController.markAsRead);

export default router;
