import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../config/env.js';
import { getDatabasePool, shutdownDatabasePool } from '../db/pool.js';
import { EquipmentRepository } from '../repositories/equipmentRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { TrackingService } from '../services/trackingService.js';
import { User } from '../types/index.js';

const value = process.env.DATABASE_URL;
const target = (() => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'postgresql:' && url.hostname === 'localhost' &&
      url.port === '55432' && url.pathname === '/shared_farm_validation';
  } catch {
    return false;
  }
})();
const describeIfTarget = target ? describe : describe.skip;

describeIfTarget('PostgreSQL rental session and tracking integration', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let owner: User;
  let renter: User;
  let equipmentId: string;
  let bookingId: string;

  async function createUser(label: string): Promise<User> {
    const id = `phase2b6_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const user: User = {
      id,
      email: `${id}@example.test`,
      password_hash: await bcrypt.hash('password123', 4),
      full_name: `Tracking ${label}`,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      id: `eq_phase2b6_${Date.now()}`,
      owner_id: owner.id,
      title: 'Tracking Test Tractor',
      hourly_rate: 900,
      location_name: 'Validation Farm',
      approx_lat: 20.1,
      approx_lng: 74.1,
      status: 'active',
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    equipmentId = equipment.id;
    const booking = await pool.query(
      `INSERT INTO bookings
       (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
        base_price, platform_fee, total_price, status, created_at, updated_at)
       VALUES ($1,$2,$3,'2031-01-01T10:00:00Z','2031-01-01T12:00:00Z',2,900,1800,90,1890,'confirmed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id`,
      [`book_phase2b6_${Date.now()}`, renter.id, equipmentId]
    );
    bookingId = booking.rows[0].id;
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query('DELETE FROM equipment_tracking WHERE booking_id = $1', [bookingId]);
    await pool.query('DELETE FROM rental_sessions WHERE booking_id = $1', [bookingId]);
    await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    await pool.query('DELETE FROM equipment WHERE id = $1', [equipmentId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::varchar[])', [[owner.id, renter.id]]);
    await shutdownDatabasePool();
  });

  it('serializes concurrent starts and preserves session/booking consistency', async () => {
    const service = new TrackingService(pool);
    const results = await Promise.allSettled([
      service.start(bookingId, renter.id, false),
      service.start(bookingId, owner.id, false),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const sessionCount = await pool.query(
      `SELECT COUNT(*)::int AS count FROM rental_sessions
       WHERE booking_id = $1 AND session_status = 'active'`,
      [bookingId]
    );
    expect(sessionCount.rows[0].count).toBe(1);
    const point = await service.ingest(bookingId, renter.id, false, {
      latitude: 20.2,
      longitude: 74.2,
      source: 'simulated_gps',
    });
    expect(point.booking_id).toBe(bookingId);
    expect(point.source).toBe('simulated_gps');
  });

  it('blocks unauthorized history access and completes atomically', async () => {
    const service = new TrackingService(pool);
    await expect(service.history(bookingId, 'outsider', false))
      .rejects.toMatchObject({ status: 403 });
    const ended = await service.end(bookingId, owner.id, false, 'done');
    expect(ended.bookingStatus).toBe('completed');
    const rows = await pool.query(
      `SELECT b.status, s.session_status FROM bookings b
       JOIN rental_sessions s ON s.booking_id = b.id WHERE b.id = $1`,
      [bookingId]
    );
    expect(rows.rows[0]).toEqual({ status: 'completed', session_status: 'completed' });
  });
});
