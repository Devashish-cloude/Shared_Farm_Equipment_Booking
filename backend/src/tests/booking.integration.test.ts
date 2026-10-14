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
const targetDatabase =
  databaseUrl !== undefined &&
  (() => {
    try {
      const url = new URL(databaseUrl);
      return (
        url.protocol === 'postgresql:' &&
        url.hostname === 'localhost' &&
        url.port === '55432' &&
        url.pathname === '/shared_farm_validation'
      );
    } catch {
      return false;
    }
  })();
const describeIfTarget = targetDatabase ? describe : describe.skip;

describeIfTarget('PostgreSQL booking integration', () => {
  const app = createApp();
  let pool: ReturnType<typeof getDatabasePool>;
  let owner: User;
  let renterOne: User;
  let renterTwo: User;
  let equipmentId: string;
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

  async function createUser(suffix: string): Promise<User> {
    const user: User = {
      id: `phase2b4_${suffix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: `phase2b4_${suffix}_${Date.now()}@example.test`,
      password_hash: await bcrypt.hash('password123', 4),
      full_name: `Booking ${suffix}`,
      phone: undefined,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await new UserRepository(pool).createUser(user);
    return user;
  }

  async function createPending(start: string, end: string, renter: User) {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token(renter)}`)
      .send({
        equipment_id: equipmentId,
        start_date: start,
        end_date: end,
        total_hours: 999,
      });
    expect(response.status).toBe(201);
    bookingIds.add(response.body.data.booking.id);
    return response;
  }

  beforeAll(async () => {
    expect(config.databaseUrl).toBe(databaseUrl);
    pool = getDatabasePool();
    owner = await createUser('owner');
    renterOne = await createUser('renter_one');
    renterTwo = await createUser('renter_two');
    const equipment = await new EquipmentRepository(pool).create({
      id: `eq_phase2b4_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      owner_id: owner.id,
      title: 'Booking Validation Tractor',
      description: 'Disposable booking test equipment',
      hourly_rate: 900,
      daily_rate: 6500,
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
  });

  afterAll(async () => {
    if (!pool) {
      return;
    }
    if (bookingIds.size > 0) {
      await pool.query('DELETE FROM bookings WHERE id = ANY($1::varchar[])', [
        [...bookingIds],
      ]);
    }
    await pool.query('DELETE FROM users WHERE id = ANY($1::varchar[])', [
      [owner.id, renterOne.id, renterTwo.id],
    ]);
    await shutdownDatabasePool();
  });

  it('allows overlapping pending requests and calculates persisted prices', async () => {
    const first = await createPending(
      '2030-01-01T10:00:00.000Z',
      '2030-01-01T12:00:00.000Z',
      renterOne
    );
    const second = await createPending(
      '2030-01-01T11:00:00.000Z',
      '2030-01-01T13:00:00.000Z',
      renterTwo
    );

    expect(first.body.data.booking.total_hours).toBe(2);
    expect(first.body.data.booking.total_price).toBe(1890);
    expect(second.body.data.booking.status).toBe('pending');
  });

  it('accepts one overlapping request and rejects the conflicting acceptance', async () => {
    const first = await createPending(
      '2030-02-01T10:00:00.000Z',
      '2030-02-01T12:00:00.000Z',
      renterOne
    );
    const second = await createPending(
      '2030-02-01T11:00:00.000Z',
      '2030-02-01T13:00:00.000Z',
      renterTwo
    );

    const accepted = await request(app)
      .patch(`/api/bookings/${first.body.data.booking.id}/status`)
      .set('Authorization', `Bearer ${token(owner)}`)
      .send({ status: 'accepted' });
    const rejected = await request(app)
      .patch(`/api/bookings/${second.body.data.booking.id}/status`)
      .set('Authorization', `Bearer ${token(owner)}`)
      .send({ status: 'accepted' });

    expect(accepted.status).toBe(200);
    expect(rejected.status).toBe(409);
  });

  it('serializes concurrent acceptance attempts so only one succeeds', async () => {
    const first = await createPending(
      '2030-03-01T10:00:00.000Z',
      '2030-03-01T12:00:00.000Z',
      renterOne
    );
    const second = await createPending(
      '2030-03-01T10:00:00.000Z',
      '2030-03-01T12:00:00.000Z',
      renterTwo
    );

    const results = await Promise.all([
      request(app)
        .patch(`/api/bookings/${first.body.data.booking.id}/status`)
        .set('Authorization', `Bearer ${token(owner)}`)
        .send({ status: 'accepted' }),
      request(app)
        .patch(`/api/bookings/${second.body.data.booking.id}/status`)
        .set('Authorization', `Bearer ${token(owner)}`)
        .send({ status: 'accepted' }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  });
});
