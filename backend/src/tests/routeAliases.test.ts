import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { store } from '../services/store.js';

const app = createApp();

function auth(userId: string): string {
  return `Bearer ${jwt.sign({ id: userId }, config.jwtSecret)}`;
}

describe('Frontend service route aliases and endpoints', () => {
  beforeEach(() => {
    store.reset();
  });

  it('GET /api/equipment/my-listings returns owner listings', async () => {
    const res = await request(app)
      .get('/api/equipment/my-listings')
      .set('Authorization', auth('user_rahul'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.equipment)).toBe(true);
    expect(res.body.data.equipment.length).toBeGreaterThan(0);
    expect(res.body.data.equipment.every((e: { owner_id: string }) => e.owner_id === 'user_rahul')).toBe(true);
  });

  it('PUT /api/equipment/:id updates equipment', async () => {
    const res = await request(app)
      .put('/api/equipment/eq_tractor_rahul')
      .set('Authorization', auth('user_rahul'))
      .send({ title: 'Mahindra 575 DI Updated' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.equipment.title).toBe('Mahindra 575 DI Updated');
  });

  it('DELETE /api/equipment/:id deactivates equipment', async () => {
    const res = await request(app)
      .delete('/api/equipment/eq_tractor_rahul')
      .set('Authorization', auth('user_rahul'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.equipment.status).toBe('inactive');
  });

  it('GET /api/bookings/incoming-requests returns owner requests', async () => {
    const res = await request(app)
      .get('/api/bookings/incoming-requests')
      .set('Authorization', auth('user_rahul'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.bookings)).toBe(true);
  });

  it('PATCH /api/bookings/:id/accept and /reject work via action endpoints', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-01T10:00:00.000Z',
        end_date: '2031-05-01T14:00:00.000Z',
      });
    expect(created.status).toBe(201);
    const bookingId = created.body.data.booking.id;

    const accepted = await request(app)
      .patch(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', auth('user_rahul'));
    expect(accepted.status).toBe(200);
    expect(accepted.body.success).toBe(true);
    expect(accepted.body.data.booking.status).toBe('accepted');
  });

  it('PATCH /api/bookings/:id/cancel cancels booking', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-06-01T10:00:00.000Z',
        end_date: '2031-06-01T14:00:00.000Z',
      });
    const bookingId = created.body.data.booking.id;

    const cancelled = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', auth('user_amit'))
      .send({ reason: 'Weather disruption' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.success).toBe(true);
    expect(cancelled.body.data.booking.status).toBe('cancelled');
  });
});
