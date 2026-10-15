import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { store } from '../services/store.js';

const app = createApp();

function auth(userId: string, isAdmin = false): string {
  return `Bearer ${jwt.sign({
    id: userId,
    email: `${userId}@example.test`,
    full_name: userId,
    is_admin: isAdmin,
  }, config.jwtSecret)}`;
}

describe('availability controller', () => {
  beforeEach(() => {
    store.reset();
  });

  it('returns periods and protects mutations by equipment ownership', async () => {
    const denied = await request(app)
      .post('/api/equipment/eq_tractor_rahul/availability')
      .set('Authorization', auth('user_amit'))
      .send({
        start_date: '2031-02-01T10:00:00.000Z',
        end_date: '2031-02-01T12:00:00.000Z',
      });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/api/equipment/eq_tractor_rahul/availability')
      .set('Authorization', auth('user_rahul'))
      .send({
        start_date: '2031-02-01T10:00:00.000Z',
        end_date: '2031-02-01T12:00:00.000Z',
      });
    expect(created.status).toBe(201);

    const listed = await request(app)
      .get('/api/equipment/eq_tractor_rahul/availability');
    expect(listed.status).toBe(200);
    expect(listed.body.data.availability).toHaveLength(1);
    expect(listed.body.data.blockedPeriods).toHaveLength(0);
  });
});
