import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../config/env.js';
import { getDatabasePool, shutdownDatabasePool } from '../db/pool.js';
import { EquipmentRepository } from '../repositories/equipmentRepository.js';
import { NotificationRepository } from '../repositories/notificationRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { ReviewService } from '../services/reviewService.js';
import { User } from '../types/index.js';

const value = process.env.DATABASE_URL;
const target = (() => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'postgresql:' && url.hostname === 'localhost' &&
      url.port === '55432' && url.pathname === '/shared_farm_validation';
  } catch { return false; }
})();
const describeIfTarget = target ? describe : describe.skip;

describeIfTarget('PostgreSQL review and notification integration', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let owner: User;
  let renter: User;
  let equipmentId: string;
  let bookingId: string;

  async function createUser(label: string): Promise<User> {
    const id = `phase2b7_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const user: User = {
      id, email: `${id}@example.test`, password_hash: await bcrypt.hash('password123', 4),
      full_name: `Review ${label}`, is_admin: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    await new UserRepository(pool).createUser(user);
    return user;
  }

  beforeAll(async () => {
    expect(config.databaseUrl).toBe(value);
    pool = getDatabasePool();
    owner = await createUser('owner');
    renter = await createUser('renter');
    const equipment = await new EquipmentRepository(pool).create({
      id: `eq_phase2b7_${Date.now()}`, owner_id: owner.id, title: 'Review Tractor',
      hourly_rate: 500, location_name: 'Validation Farm', status: 'active',
      rating_avg: 0, rating_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    equipmentId = equipment.id;
    const booking = await pool.query(
      `INSERT INTO bookings
       (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
        base_price, platform_fee, total_price, status, created_at, updated_at)
       VALUES ($1,$2,$3,'2031-02-01T10:00:00Z','2031-02-01T12:00:00Z',2,500,1000,50,1050,'completed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id`,
      [`book_phase2b7_${Date.now()}`, renter.id, equipmentId]
    );
    bookingId = booking.rows[0].id;
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query('DELETE FROM notifications WHERE user_id = ANY($1::varchar[])', [[owner.id, renter.id]]);
    await pool.query('DELETE FROM reviews WHERE booking_id = $1', [bookingId]);
    await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    await pool.query('DELETE FROM equipment WHERE id = $1', [equipmentId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::varchar[])', [[owner.id, renter.id]]);
    await shutdownDatabasePool();
  });

  it('allows one concurrent review and updates the aggregate transactionally', async () => {
    const service = new ReviewService(pool);
    const results = await Promise.allSettled([
      service.create(bookingId, renter.id, false, 5, 'Excellent equipment'),
      service.create(bookingId, owner.id, false, 4, 'Very good equipment'),
    ]);
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(2);
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(0);
    const aggregate = await pool.query(
      'SELECT rating_avg, rating_count FROM equipment WHERE id = $1', [equipmentId]
    );
    expect(Number(aggregate.rows[0].rating_avg)).toBe(4.5);
    expect(Number(aggregate.rows[0].rating_count)).toBe(2);
  });

  it('persists notification read state and rejects cross-user reads', async () => {
    const repo = new NotificationRepository(pool);
    const notification = await repo.create({
      id: `notif_phase2b7_${Date.now()}`, user_id: renter.id, title: 'Review reminder',
      message: 'Please review', type: 'rental_completed', is_read: false,
      reference_id: bookingId, reference_type: 'booking', created_at: new Date().toISOString(),
    });
    expect(await repo.markRead(notification.id, owner.id)).toBeUndefined();
    const updated = await repo.markRead(notification.id, renter.id);
    expect(updated?.is_read).toBe(true);
    expect(await repo.unreadCount(renter.id)).toBe(0);
    await pool.query('DELETE FROM notifications WHERE id = $1', [notification.id]);
  });
});
