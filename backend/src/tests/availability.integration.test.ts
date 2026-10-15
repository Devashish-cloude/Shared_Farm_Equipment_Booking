import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { getDatabasePool, shutdownDatabasePool } from '../db/pool.js';
import { EquipmentRepository } from '../repositories/equipmentRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { User } from '../types/index.js';

const databaseUrl = process.env.DATABASE_URL;
const validationDatabaseUrl = 'postgresql://postgres:validation_only@localhost:55432/shared_farm_validation';
const isValidationDatabase = (() => {
  if (databaseUrl !== validationDatabaseUrl) {
    return false;
  }
  try {
    const url = new URL(databaseUrl);
    return url.protocol === 'postgresql:' &&
      url.hostname === 'localhost' &&
      url.port === '55432' &&
      url.pathname === '/shared_farm_validation';
  } catch {
    return false;
  }
})();
const describeIfValidationDatabase = isValidationDatabase ? describe : describe.skip;

describeIfValidationDatabase('PostgreSQL equipment availability integration', () => {
  const app = createApp();
  let pool: ReturnType<typeof getDatabasePool> | undefined;
  let owner: User | undefined;
  let renterOne: User | undefined;
  let renterTwo: User | undefined;
  let outsider: User | undefined;
  let admin: User | undefined;
  const equipmentIds = new Set<string>();
  const bookingIds = new Set<string>();

  function token(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_admin: user.is_admin,
      },
      config.jwtSecret
    );
  }

  function authorization(user: User): string {
    return `Bearer ${token(user)}`;
  }

  async function createUser(label: string, isAdmin = false): Promise<User> {
    if (!pool) {
      throw new Error('Integration database pool is not initialized.');
    }
    const suffix = `availability_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user: User = {
      id: suffix,
      email: `${suffix}@example.test`,
      password_hash: await bcrypt.hash('password123', 4),
      full_name: `Availability ${label}`,
      phone: undefined,
      is_admin: isAdmin,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await new UserRepository(pool).createUser(user);
    return user;
  }

  async function createEquipment(label: string, locationName = 'Availability Validation Farm'): Promise<string> {
    if (!pool || !owner) {
      throw new Error('Integration fixtures are not initialized.');
    }
    const equipment = await new EquipmentRepository(pool).create({
      id: `eq_availability_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      owner_id: owner.id,
      title: `Availability ${label}`,
      description: 'Disposable availability integration fixture',
      hourly_rate: 900,
      daily_rate: 6500,
      location_name: locationName,
      approx_lat: 20.1,
      approx_lng: 74.1,
      status: 'active',
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    equipmentIds.add(equipment.id);
    return equipment.id;
  }

  async function createBooking(
    equipmentId: string,
    renter: User,
    startDate: string,
    endDate: string
  ): Promise<string> {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', authorization(renter))
      .send({
        equipment_id: equipmentId,
        start_date: startDate,
        end_date: endDate,
      });
    const bookingId = response.body?.data?.booking?.id;
    if (typeof bookingId === 'string') {
      bookingIds.add(bookingId);
    }
    expect(response.status).toBe(201);
    expect(typeof bookingId).toBe('string');
    return bookingId as string;
  }

  async function acceptBooking(bookingId: string, actor: User = owner!): Promise<number> {
    const response = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', authorization(actor))
      .send({ status: 'accepted' });
    return response.status;
  }

  async function expectPendingWithoutAcceptanceNotification(bookingId: string): Promise<void> {
    if (!pool) {
      throw new Error('Integration database pool is not initialized.');
    }
    const booking = await pool.query<{ status: string }>(
      'SELECT status FROM bookings WHERE id = $1',
      [bookingId]
    );
    const notifications = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM notifications
       WHERE reference_id = $1 AND type = 'booking_accepted'`,
      [bookingId]
    );
    expect(booking.rows[0]?.status).toBe('pending');
    expect(Number(notifications.rows[0]?.count)).toBe(0);
  }

  beforeAll(async () => {
    expect(config.databaseUrl).toBe(validationDatabaseUrl);
    pool = getDatabasePool();
    owner = await createUser('owner');
    renterOne = await createUser('renter_one');
    renterTwo = await createUser('renter_two');
    outsider = await createUser('outsider');
    admin = await createUser('admin', true);
  });

  afterAll(async () => {
    if (!pool) {
      return;
    }
    try {
      const equipmentIdValues = [...equipmentIds];
      const bookingIdValues = [...bookingIds];
      if (bookingIdValues.length > 0) {
        await pool.query(
          'DELETE FROM notifications WHERE reference_id = ANY($1::varchar[])',
          [bookingIdValues]
        );
        await pool.query(
          'DELETE FROM bookings WHERE id = ANY($1::varchar[])',
          [bookingIdValues]
        );
      }
      if (equipmentIdValues.length > 0) {
        await pool.query(
          'DELETE FROM equipment_availability_windows WHERE equipment_id = ANY($1::varchar[])',
          [equipmentIdValues]
        );
        await pool.query(
          'DELETE FROM equipment_blocked_periods WHERE equipment_id = ANY($1::varchar[])',
          [equipmentIdValues]
        );
        await pool.query(
          'DELETE FROM equipment WHERE id = ANY($1::varchar[])',
          [equipmentIdValues]
        );
      }
      const userIds = [owner, renterOne, renterTwo, outsider, admin]
        .filter((user): user is User => Boolean(user))
        .map((user) => user.id);
      if (userIds.length > 0) {
        await pool.query('DELETE FROM users WHERE id = ANY($1::varchar[])', [userIds]);
      }
    } finally {
      await shutdownDatabasePool();
    }
  });

  it('creates, lists, and deletes availability windows and blocked periods', async () => {
    const equipmentId = await createEquipment('crud');
    const window = await request(app)
      .post(`/api/equipment/${equipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-01T10:00:00.000Z',
        end_date: '2033-01-01T12:00:00.000Z',
      });
    expect(window.status).toBe(201);

    const blocked = await request(app)
      .post(`/api/equipment/${equipmentId}/blocked-periods`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-02T10:00:00.000Z',
        end_date: '2033-01-02T11:00:00.000Z',
      });
    expect(blocked.status).toBe(201);

    const listed = await request(app).get(`/api/equipment/${equipmentId}/availability`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.availability).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: window.body.data.availability.id })])
    );
    expect(listed.body.data.blockedPeriods).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: blocked.body.data.blockedPeriod.id })])
    );

    const deletedWindow = await request(app)
      .delete(`/api/equipment/${equipmentId}/availability/${window.body.data.availability.id}`)
      .set('Authorization', authorization(owner!));
    const deletedBlocked = await request(app)
      .delete(`/api/equipment/${equipmentId}/blocked-periods/${blocked.body.data.blockedPeriod.id}`)
      .set('Authorization', authorization(owner!));
    expect(deletedWindow.status).toBe(200);
    expect(deletedBlocked.status).toBe(200);

    const afterDelete = await request(app).get(`/api/equipment/${equipmentId}/availability`);
    expect(afterDelete.body.data.availability).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: window.body.data.availability.id })])
    );
    expect(afterDelete.body.data.blockedPeriods).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: blocked.body.data.blockedPeriod.id })])
    );
  });

  it('enforces owner and admin authorization for availability mutations', async () => {
    const equipmentId = await createEquipment('authorization');
    const unauthorized = await request(app)
      .post(`/api/equipment/${equipmentId}/availability`)
      .set('Authorization', authorization(outsider!))
      .send({
        start_date: '2033-01-03T10:00:00.000Z',
        end_date: '2033-01-03T11:00:00.000Z',
      });
    expect(unauthorized.status).toBe(403);

    const created = await request(app)
      .post(`/api/equipment/${equipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-03T10:00:00.000Z',
        end_date: '2033-01-03T11:00:00.000Z',
      });
    expect(created.status).toBe(201);

    const adminDelete = await request(app)
      .delete(`/api/equipment/${equipmentId}/availability/${created.body.data.availability.id}`)
      .set('Authorization', authorization(admin!));
    expect(adminDelete.status).toBe(200);
  });

  it('rejects invalid and overlapping periods but allows adjacent periods', async () => {
    const equipmentId = await createEquipment('intervals');
    const invalid = await request(app)
      .post(`/api/equipment/${equipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-04T12:00:00.000Z',
        end_date: '2033-01-04T10:00:00.000Z',
      });
    expect(invalid.status).toBe(400);

    const first = await request(app)
      .post(`/api/equipment/${equipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-04T10:00:00.000Z',
        end_date: '2033-01-04T12:00:00.000Z',
      });
    const overlap = await request(app)
      .post(`/api/equipment/${equipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-04T11:00:00.000Z',
        end_date: '2033-01-04T13:00:00.000Z',
      });
    const adjacent = await request(app)
      .post(`/api/equipment/${equipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-04T12:00:00.000Z',
        end_date: '2033-01-04T14:00:00.000Z',
      });

    expect(first.status).toBe(201);
    expect(overlap.status).toBe(409);
    expect(adjacent.status).toBe(201);
  });

  it('serializes concurrent availability writes for overlapping periods', async () => {
    const equipmentId = await createEquipment('concurrent_availability');
    const results = await Promise.all([
      request(app)
        .post(`/api/equipment/${equipmentId}/availability`)
        .set('Authorization', authorization(owner!))
        .send({
          start_date: '2033-01-05T10:00:00.000Z',
          end_date: '2033-01-05T12:00:00.000Z',
        }),
      request(app)
        .post(`/api/equipment/${equipmentId}/availability`)
        .set('Authorization', authorization(owner!))
        .send({
          start_date: '2033-01-05T11:00:00.000Z',
          end_date: '2033-01-05T13:00:00.000Z',
        }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
  });

  it('accepts bookings within configured availability and rejects outside or blocked periods', async () => {
    const equipmentId = await createEquipment('booking_availability');
    const configured = await request(app)
      .post(`/api/equipment/${equipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-06T10:00:00.000Z',
        end_date: '2033-01-06T14:00:00.000Z',
      });
    expect(configured.status).toBe(201);

    const blocked = await request(app)
      .post(`/api/equipment/${equipmentId}/blocked-periods`)
      .set('Authorization', authorization(owner!))
      .send({
        start_date: '2033-01-06T12:00:00.000Z',
        end_date: '2033-01-06T13:00:00.000Z',
      });
    expect(blocked.status).toBe(201);

    const inside = await createBooking(
      equipmentId,
      renterOne!,
      '2033-01-06T10:00:00.000Z',
      '2033-01-06T12:00:00.000Z'
    );
    const outside = await createBooking(
      equipmentId,
      renterTwo!,
      '2033-01-06T14:00:00.000Z',
      '2033-01-06T15:00:00.000Z'
    );
    const blockedBooking = await createBooking(
      equipmentId,
      renterOne!,
      '2033-01-06T12:00:00.000Z',
      '2033-01-06T13:00:00.000Z'
    );

    expect(await acceptBooking(inside)).toBe(200);
    expect(await acceptBooking(outside)).toBe(409);
    await expectPendingWithoutAcceptanceNotification(outside);
    expect(await acceptBooking(blockedBooking)).toBe(409);
    await expectPendingWithoutAcceptanceNotification(blockedBooking);
  });

  it('preserves legacy booking behavior when no availability windows are configured', async () => {
    const equipmentId = await createEquipment('legacy');
    const bookingId = await createBooking(
      equipmentId,
      renterOne!,
      '2033-01-07T10:00:00.000Z',
      '2033-01-07T12:00:00.000Z'
    );
    expect(await acceptBooking(bookingId)).toBe(200);
  });

  it('allows only one concurrent acceptance for overlapping bookings', async () => {
    const equipmentId = await createEquipment('concurrent');
    const first = await createBooking(
      equipmentId,
      renterOne!,
      '2033-01-08T10:00:00.000Z',
      '2033-01-08T12:00:00.000Z'
    );
    const second = await createBooking(
      equipmentId,
      renterTwo!,
      '2033-01-08T10:00:00.000Z',
      '2033-01-08T12:00:00.000Z'
    );

    const results = await Promise.all([acceptBooking(first), acceptBooking(second)]);
    expect(results.sort()).toEqual([200, 409]);
  });

  it('filters equipment by configured availability, blocked periods, and legacy availability', async () => {
    const configuredEquipmentId = await createEquipment('filter_configured');
    const blockedEquipmentId = await createEquipment('filter_blocked');
    const legacyEquipmentId = await createEquipment('filter_legacy');
    const queryStart = '2033-01-09T10:00:00.000Z';
    const queryEnd = '2033-01-09T12:00:00.000Z';

    const configured = await request(app)
      .post(`/api/equipment/${configuredEquipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({ start_date: '2033-01-09T09:00:00.000Z', end_date: '2033-01-09T13:00:00.000Z' });
    const blocked = await request(app)
      .post(`/api/equipment/${blockedEquipmentId}/availability`)
      .set('Authorization', authorization(owner!))
      .send({ start_date: '2033-01-09T09:00:00.000Z', end_date: '2033-01-09T13:00:00.000Z' });
    const blockedPeriod = await request(app)
      .post(`/api/equipment/${blockedEquipmentId}/blocked-periods`)
      .set('Authorization', authorization(owner!))
      .send({ start_date: queryStart, end_date: '2033-01-09T11:00:00.000Z' });
    expect(configured.status).toBe(201);
    expect(blocked.status).toBe(201);
    expect(blockedPeriod.status).toBe(201);

    const response = await request(app)
      .get(`/api/equipment?start_date=${encodeURIComponent(queryStart)}&end_date=${encodeURIComponent(queryEnd)}`);
    expect(response.status).toBe(200);
    const resultIds = response.body.data.equipment.map((equipment: { id: string }) => equipment.id);
    expect(resultIds).toContain(configuredEquipmentId);
    expect(resultIds).toContain(legacyEquipmentId);
    expect(resultIds).not.toContain(blockedEquipmentId);
  });
});
