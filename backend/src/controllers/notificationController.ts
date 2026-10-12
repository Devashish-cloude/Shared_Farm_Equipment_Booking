import { Response } from 'express';
import { store } from '../services/store.js';
import { AuthenticatedRequest } from '../types/index.js';

export class NotificationController {
  /**
   * GET /api/notifications
   * List all notifications for authenticated user
   */
  public static getNotifications(req: AuthenticatedRequest, res: Response): void {
    const userId = req.user!.id;
    const notifications = store.getNotificationsByUserId(userId);
    const unreadCount = store.getUnreadNotificationCount(userId);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  }

  /**
   * GET /api/notifications/unread-count
   * Return number of unread notifications
   */
  public static getUnreadCount(req: AuthenticatedRequest, res: Response): void {
    const userId = req.user!.id;
    const unreadCount = store.getUnreadNotificationCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a specific notification as read
   */
  public static markAsRead(req: AuthenticatedRequest, res: Response): void {
    const { id } = req.params;
    const userId = req.user!.id;

    const updated = store.markNotificationAsRead(id, userId);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Notification not found or does not belong to you.',
      });
      return;
    }

    const unreadCount = store.getUnreadNotificationCount(userId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: {
        notification: updated,
        unreadCount,
      },
    });
  }

  /**
   * PATCH /api/notifications/mark-all-read
   * Mark all notifications for the user as read
   */
  public static markAllAsRead(req: AuthenticatedRequest, res: Response): void {
    const userId = req.user!.id;
    const count = store.markAllNotificationsAsRead(userId);

    res.status(200).json({
      success: true,
      message: `Marked ${count} notifications as read.`,
      data: { unreadCount: 0 },
    });
  }
}
