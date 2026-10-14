import { NextFunction, Response } from 'express';
import { store } from '../services/store.js';
import { AuthenticatedRequest } from '../types/index.js';
import { config } from '../config/env.js';
import { getDatabasePool } from '../db/pool.js';
import { NotificationRepository } from '../repositories/notificationRepository.js';

function usePostgres(): boolean { return Boolean(config.databaseUrl); }
function notificationRepository(): NotificationRepository { return new NotificationRepository(getDatabasePool()); }

export class NotificationController {
  /**
   * GET /api/notifications
   * List all notifications for authenticated user
   */
  public static async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user!.id;
    if (usePostgres()) {
      try {
        const repo = notificationRepository();
        const [items, unreadCount] = await Promise.all([repo.listByUser(userId), repo.unreadCount(userId)]);
        res.status(200).json({ success: true, data: { notifications: items, unreadCount } });
      } catch (error) { next(error); }
      return;
    }
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
  public static async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user!.id;
    if (usePostgres()) {
      try { res.status(200).json({ success: true, data: { unreadCount: await notificationRepository().unreadCount(userId) } }); }
      catch (error) { next(error); }
      return;
    }
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
  public static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;
    if (usePostgres()) {
      try {
        const repo = notificationRepository();
        const updated = await repo.markRead(id, userId);
        if (!updated) {
          res.status(404).json({ success: false, error: 'Notification not found or does not belong to you.' });
          return;
        }
        res.status(200).json({ success: true, message: 'Notification marked as read.', data: { notification: updated, unreadCount: await repo.unreadCount(userId) } });
      } catch (error) { next(error); }
      return;
    }

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
  public static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user!.id;
    if (usePostgres()) {
      try {
        const count = await notificationRepository().markAllRead(userId);
        res.status(200).json({ success: true, message: `Marked ${count} notifications as read.`, data: { unreadCount: 0 } });
      } catch (error) { next(error); }
      return;
    }
    const count = store.markAllNotificationsAsRead(userId);

    res.status(200).json({
      success: true,
      message: `Marked ${count} notifications as read.`,
      data: { unreadCount: 0 },
    });
  }
}
