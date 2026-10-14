import { QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { Notification, NotificationType } from '../types/index.js';

export type NotificationInsert = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
  referenceType?: string;
};

type NotificationRow = {
  id: string; user_id: string; title: string; message: string; type: NotificationType;
  reference_id: string | null; reference_type: string | null; is_read: boolean;
  created_at: Date | string;
};

export interface NotificationQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id, user_id: row.user_id, title: row.title, message: row.message,
    type: row.type, reference_id: row.reference_id ?? undefined,
    reference_type: row.reference_type ?? undefined, is_read: row.is_read,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export class NotificationRepository {
  private readonly pool: DatabasePool;
  public constructor(pool: DatabasePool = getDatabasePool()) { this.pool = pool; }

  public async listByUser(userId: string, client: NotificationQueryClient = this.pool): Promise<Notification[]> {
    const result = await client.query<NotificationRow>(
      `SELECT id, user_id, title, message, type, reference_id, reference_type,
              is_read, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(mapNotification);
  }

  public async unreadCount(userId: string, client: NotificationQueryClient = this.pool): Promise<number> {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  public async markRead(id: string, userId: string, client: NotificationQueryClient = this.pool): Promise<Notification | undefined> {
    const result = await client.query<NotificationRow>(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, title, message, type, reference_id, reference_type, is_read, created_at`,
      [id, userId]
    );
    return result.rows[0] ? mapNotification(result.rows[0]) : undefined;
  }

  public async markAllRead(userId: string, client: NotificationQueryClient = this.pool): Promise<number> {
    const result = await client.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING id`,
      [userId]
    );
    return result.rows.length;
  }

  public async create(notification: Notification, client: NotificationQueryClient = this.pool): Promise<Notification> {
    const result = await client.query<NotificationRow>(
      `INSERT INTO notifications
       (id, user_id, title, message, type, reference_id, reference_type, is_read, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, user_id, title, message, type, reference_id, reference_type, is_read, created_at`,
      [notification.id, notification.user_id, notification.title, notification.message,
        notification.type, notification.reference_id ?? null, notification.reference_type ?? null,
        notification.is_read, notification.created_at]
    );
    return mapNotification(result.rows[0]);
  }

  public async createIfAbsent(
    write: NotificationInsert,
    client: NotificationQueryClient = this.pool
  ): Promise<Notification | undefined> {
    const result = await client.query<NotificationRow>(
      `INSERT INTO notifications
       (id, user_id, title, message, type, reference_id, reference_type, is_read, created_at)
       SELECT $1::varchar, $2::varchar, $3::varchar, $4::text, $5::varchar, $6::varchar, $7::varchar,
              FALSE, CURRENT_TIMESTAMP
       WHERE NOT EXISTS (
         SELECT 1 FROM notifications
         WHERE user_id = $2::varchar AND type = $5::varchar AND reference_id IS NOT DISTINCT FROM $6::varchar
       )
       RETURNING id, user_id, title, message, type, reference_id, reference_type, is_read, created_at`,
      [
        `notif_${uuidv4().substring(0, 8)}`,
        write.userId,
        write.title,
        write.message,
        write.type,
        write.referenceId ?? null,
        write.referenceType ?? null,
      ]
    );
    return result.rows[0] ? mapNotification(result.rows[0]) : undefined;
  }

  public async createAllIfAbsent(
    writes: NotificationInsert[],
    client: NotificationQueryClient = this.pool
  ): Promise<void> {
    for (const write of writes) {
      await this.createIfAbsent(write, client);
    }
  }
}
