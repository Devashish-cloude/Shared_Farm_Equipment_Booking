import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { DatabasePool } from '../db/pool.js';
import { UserRepository } from '../repositories/userRepository.js';
import { store } from '../services/store.js';
import { User, UserProfile } from '../types/index.js';

class FakeDatabase {
  public readonly calls: Array<{ text: string; values?: unknown[] }> = [];
  public readonly rows = new Map<string, unknown[]>();
  public failProfileInsert = false;
  public released = false;

  public async query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, values });
    if (this.failProfileInsert && text.includes('INSERT INTO user_profiles')) {
      throw new Error('profile insert failed');
    }
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
      return { rows: [] as T[] };
    }
    if (text.includes('INSERT INTO users')) {
      return { rows: [user] as T[] };
    }
    const matchingRows = [...this.rows.entries()].find(([query]) => text.includes(query));
    return { rows: (matchingRows?.[1] || []) as T[] };
  }

  public release(): void {
    this.released = true;
  }

  public asPool(): DatabasePool {
    return {
      connect: async () => this,
      query: <T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        values?: unknown[]
      ) => this.query<T>(text, values),
      end: async () => undefined,
    };
  }
}

const user: User = {
  id: 'user_db',
  email: 'db@example.com',
  password_hash: 'hash',
  full_name: 'Database User',
  phone: undefined,
  is_admin: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const profile: UserProfile = {
  id: 'profile_db',
  user_id: user.id,
  location_name: 'Nashik',
  farm_size_acres: 12.5,
  created_at: user.created_at,
  updated_at: user.updated_at,
};

describe('UserRepository', () => {
  it('maps nullable and numeric PostgreSQL values and uses parameterized queries', async () => {
    const database = new FakeDatabase();
    database.rows.set('FROM users', [{
      ...user,
      phone: null,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at),
    }]);
    const repository = new UserRepository(database.asPool());

    await expect(repository.findByEmail(user.email)).resolves.toEqual(user);
    expect(database.calls[0].text).toContain('$1');
    expect(database.calls[0].values).toEqual([user.email]);
  });

  it('maps a profile NUMERIC value to a number', async () => {
    const database = new FakeDatabase();
    database.rows.set('FROM user_profiles', [{
      ...profile,
      farm_size_acres: '12.50',
      location_name: null,
      created_at: new Date(profile.created_at),
      updated_at: new Date(profile.updated_at),
    }]);
    const repository = new UserRepository(database.asPool());

    await expect(repository.findProfileByUserId(user.id)).resolves.toMatchObject({
      ...profile,
      location_name: undefined,
      farm_size_acres: 12.5,
    });
  });

  it('rolls back and releases when atomic user-profile creation fails', async () => {
    const database = new FakeDatabase();
    database.failProfileInsert = true;
    const repository = new UserRepository(database.asPool());

    await expect(repository.createUserWithProfile(user, profile)).rejects.toThrow(
      'profile insert failed'
    );
    expect(database.calls.map((call) => call.text)).toEqual([
      'BEGIN',
      expect.stringContaining('INSERT INTO users'),
      expect.stringContaining('INSERT INTO user_profiles'),
      'ROLLBACK',
    ]);
    expect(database.released).toBe(true);
  });
});

describe('PostgreSQL-compatible authentication contract', () => {
  const app = createApp();

  beforeEach(() => {
    config.databaseUrl = undefined;
    store.reset();
  });

  it('supports login and returns the existing JWT/user response shape', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).toMatchObject({
      id: 'user_rahul',
      email: 'rahul@example.com',
      fullName: 'Rahul Sharma',
      isAdmin: false,
    });
  });

  it('registers a user with a profile and rejects duplicate email registration', async () => {
    const registration = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        password: 'password123',
        full_name: 'New Farmer',
        location_name: 'Pune',
      });

    expect(registration.status).toBe(201);
    const created = store.getUserByEmail('new@example.com');
    expect(created).toBeDefined();
    expect(store.userProfiles.get(created!.id)?.location_name).toBe('Pune');

    const duplicate = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        password: 'password123',
        full_name: 'New Farmer',
      });

    expect(duplicate.status).toBe(409);
  });

  it('reads the authenticated user and profile through /me', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul@example.com', password: 'password123' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 'user_rahul',
      email: 'rahul@example.com',
      fullName: 'Rahul Sharma',
      profile: {
        user_id: 'user_rahul',
        location_name: 'Nashik, Maharashtra',
      },
    });
  });
});
