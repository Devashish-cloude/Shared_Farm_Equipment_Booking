import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { getDatabasePool, shutdownDatabasePool } from '../db/pool.js';
import { UserRepository } from '../repositories/userRepository.js';
import { User, UserProfile } from '../types/index.js';

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

describeIfTarget('PostgreSQL 16 authentication integration', () => {
  const app = createApp();
  let pool: ReturnType<typeof getDatabasePool>;
  let repository: UserRepository;
  const testPrefix = `phase2b_${crypto.randomUUID().replace(/-/g, '')}`;
  const testEmails = new Set<string>();
  const testUserIds = new Set<string>();

  beforeAll(() => {
    expect(config.databaseUrl).toBe(databaseUrl);
    expect(targetDatabase).toBe(true);
    pool = getDatabasePool();
    repository = new UserRepository(pool);
  });

  afterAll(async () => {
    if (!pool) {
      return;
    }
    for (const userId of testUserIds) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    for (const email of testEmails) {
      await pool.query('DELETE FROM users WHERE email = $1', [email]);
    }
    await shutdownDatabasePool();
  });

  function makeUser(suffix: string, passwordHash: string): User {
    const now = new Date().toISOString();
    const userId = `${testPrefix}_${suffix}`;
    const email = `${userId}@example.test`;
    testUserIds.add(userId);
    testEmails.add(email);
    return {
      id: userId,
      email,
      password_hash: passwordHash,
      full_name: `Phase 2B ${suffix}`,
      phone: '+919000000000',
      is_admin: false,
      created_at: now,
      updated_at: now,
    };
  }

  function makeProfile(user: User, suffix: string): UserProfile {
    const now = new Date().toISOString();
    return {
      id: `${testPrefix}_profile_${suffix}`,
      user_id: user.id,
      location_name: 'Validation Farm',
      farm_size_acres: 12.5,
      address: 'Disposable validation address',
      created_at: now,
      updated_at: now,
    };
  }

  it('creates a user and profile and finds the user by email and ID', async () => {
    const user = makeUser('repository', await bcrypt.hash('password123', 4));
    const profile = makeProfile(user, 'repository');

    const created = await repository.createUserWithProfile(user, profile);

    expect(created.user).toMatchObject({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    });
    expect(created.profile).toMatchObject({
      id: profile.id,
      user_id: user.id,
      farm_size_acres: 12.5,
    });
    await expect(repository.findByEmail(user.email)).resolves.toMatchObject({
      id: user.id,
      email: user.email,
    });
    await expect(repository.findById(user.id)).resolves.toMatchObject({
      id: user.id,
      email: user.email,
    });
  });

  it('rolls back the user when profile creation fails', async () => {
    const user = makeUser('rollback', await bcrypt.hash('password123', 4));
    const invalidProfile = makeProfile(user, 'rollback');
    invalidProfile.user_id = `${testPrefix}_missing_parent`;

    await expect(repository.createUserWithProfile(user, invalidProfile)).rejects.toMatchObject({
      code: '23503',
    });
    await expect(repository.findById(user.id)).resolves.toBeUndefined();
  });

  it('returns HTTP 409 for duplicate email registration', async () => {
    const email = `${testPrefix}_duplicate@example.test`;
    testEmails.add(email);
    const body = {
      email,
      password: 'password123',
      full_name: 'Duplicate Test User',
      location_name: 'Validation Farm',
    };

    const first = await request(app).post('/api/auth/register').send(body);
    const second = await request(app).post('/api/auth/register').send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it('reads a persisted profile through /api/auth/me', async () => {
    const email = `${testPrefix}_me@example.test`;
    testEmails.add(email);
    const registration = await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      full_name: 'Profile Test User',
      phone: '+919111111111',
      location_name: 'Nashik Validation Farm',
    });

    expect(registration.status).toBe(201);
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registration.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email,
      fullName: 'Profile Test User',
      phone: '+919111111111',
      profile: {
        location_name: 'Nashik Validation Farm',
        farm_size_acres: 5,
      },
    });
  });
});
