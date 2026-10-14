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

describeIfTarget('PostgreSQL equipment integration', () => {
  const app = createApp();
  let pool: ReturnType<typeof getDatabasePool>;
  let equipmentRepository: EquipmentRepository;
  let userRepository: UserRepository;
  let owner: User;
  let token: string;

  beforeAll(async () => {
    expect(config.databaseUrl).toBe(databaseUrl);
    pool = getDatabasePool();
    equipmentRepository = new EquipmentRepository(pool);
    userRepository = new UserRepository(pool);
    const suffix = `phase2b3_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    owner = {
      id: suffix,
      email: `${suffix}@example.test`,
      password_hash: 'unused',
      full_name: 'Equipment Validation Owner',
      phone: undefined,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await userRepository.createUser(owner);
    token = jwt.sign(
      {
        id: owner.id,
        email: owner.email,
        full_name: owner.full_name,
        is_admin: false,
      },
      config.jwtSecret
    );
  });

  afterAll(async () => {
    if (!pool) {
      return;
    }
    await pool.query('DELETE FROM users WHERE id = $1', [owner.id]);
    await shutdownDatabasePool();
  });

  it('creates equipment from the authenticated owner and reads it with owner details', async () => {
    const response = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Validation Tractor',
        description: 'Disposable integration record',
        hourly_rate: 725,
        daily_rate: 5200,
        location_name: 'Validation Farm',
        approx_lat: 20.1,
        approx_lng: 74.1,
        image_url: 'https://example.test/tractor.jpg',
        owner_id: 'attacker-supplied-owner',
        unsupported_field: 'ignored',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.equipment.owner_id).toBe(owner.id);
    expect(response.body.data.equipment).not.toHaveProperty('unsupported_field');

    const equipmentId = response.body.data.equipment.id;
    const detail = await request(app).get(`/api/equipment/${equipmentId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.owner).toEqual({
      id: owner.id,
      fullName: owner.full_name,
    });
  });

  it('lists active equipment and reads categories', async () => {
    const categories = await equipmentRepository.findCategories();
    expect(Array.isArray(categories)).toBe(true);

    const list = await request(app).get('/api/equipment');
    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);
    expect(list.body.data.equipment).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner_id: owner.id }),
      ])
    );
  });
});
