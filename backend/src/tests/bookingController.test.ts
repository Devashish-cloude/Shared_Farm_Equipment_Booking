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

describe('in-memory booking controller validation', () => {
  beforeEach(() => {
    store.reset();
  });

  it('derives duration and price from timestamps instead of total_hours', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-02-01T10:00:00.000Z',
        end_date: '2031-02-01T12:30:00.000Z',
        total_hours: 999,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.booking.total_hours).toBe(2.5);
    expect(response.body.data.booking.base_price).toBe(2250);
    expect(response.body.data.booking.platform_fee).toBe(112.5);
    expect(response.body.data.booking.total_price).toBe(2362.5);
  });

  it.each([
    ['invalid date', 'not-a-date', '2031-02-01T12:00:00.000Z'],
    ['reversed period', '2031-02-01T12:00:00.000Z', '2031-02-01T10:00:00.000Z'],
  ])('rejects %s', async (_label, startDate, endDate) => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: startDate,
        end_date: endDate,
      });

    expect(response.status).toBe(400);
  });

  it('allows only the owner to accept and rejects direct payment confirmation', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-03-01T10:00:00.000Z',
        end_date: '2031-03-01T12:00:00.000Z',
      });
    const bookingId = created.body.data.booking.id;

    const renterAttempt = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', auth('user_amit'))
      .send({ status: 'accepted' });
    expect(renterAttempt.status).toBe(403);

    const directConfirmation = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'confirmed' });
    expect(directConfirmation.status).toBe(400);

    const ownerAcceptance = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });
    expect(ownerAcceptance.status).toBe(200);
  });

  it('returns renter history and owner requests without exposing another user booking', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-03-10T10:00:00.000Z',
        end_date: '2031-03-10T12:00:00.000Z',
      });
    expect(created.status).toBe(201);
    const bookingId = created.body.data.booking.id;

    const renterHistory = await request(app)
      .get('/api/bookings/my-rentals')
      .set('Authorization', auth('user_amit'));
    expect(renterHistory.status).toBe(200);
    expect(renterHistory.body.data.bookings).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bookingId, renter_id: 'user_amit' })])
    );

    const ownerRequests = await request(app)
      .get('/api/bookings/my-equipment')
      .set('Authorization', auth('user_rahul'));
    expect(ownerRequests.status).toBe(200);
    expect(ownerRequests.body.data.bookings).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bookingId, equipment: expect.objectContaining({
        id: 'eq_tractor_rahul',
      }) })])
    );

    const outsider = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', auth('user_admin', false));
    expect(outsider.status).toBe(403);
  });

  it('allows the renter to cancel a pending request and rejects invalid lifecycle transitions', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-03-11T10:00:00.000Z',
        end_date: '2031-03-11T12:00:00.000Z',
      });
    const bookingId = created.body.data.booking.id;

    const cancelled = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', auth('user_amit'))
      .send({ status: 'cancelled' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.booking.status).toBe('cancelled');

    const invalid = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', auth('user_amit'))
      .send({ status: 'confirmed' });
    expect(invalid.status).toBe(400);
  });

  it('rejects booking creation for inactive listings and malformed payloads', async () => {
    const malformed = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 42,
        start_date: '2031-03-12T10:00:00.000Z',
        end_date: '2031-03-12T12:00:00.000Z',
      });
    expect(malformed.status).toBe(400);

    const deactivated = await request(app)
      .post('/api/equipment/eq_rotavator_amit/deactivate')
      .set('Authorization', auth('user_amit'))
      .send();
    expect(deactivated.status).toBe(200);

    const unavailable = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_rahul'))
      .send({
        equipment_id: 'eq_rotavator_amit',
        start_date: '2031-03-12T10:00:00.000Z',
        end_date: '2031-03-12T12:00:00.000Z',
      });
    expect(unavailable.status).toBe(400);
  });

  it('rejects acceptance outside a configured window and allows an adjacent booking', async () => {
    const availability = await request(app)
      .post('/api/equipment/eq_tractor_rahul/availability')
      .set('Authorization', auth('user_rahul'))
      .send({
        start_date: '2031-04-01T10:00:00.000Z',
        end_date: '2031-04-01T12:00:00.000Z',
      });
    expect(availability.status).toBe(201);

    const outside = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-04-01T12:00:00.000Z',
        end_date: '2031-04-01T13:00:00.000Z',
      });
    expect(outside.status).toBe(201);
    const outsideAcceptance = await request(app)
      .patch(`/api/bookings/${outside.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });
    expect(outsideAcceptance.status).toBe(409);

    const adjacentWindow = await request(app)
      .post('/api/equipment/eq_tractor_rahul/availability')
      .set('Authorization', auth('user_rahul'))
      .send({
        start_date: '2031-04-01T13:00:00.000Z',
        end_date: '2031-04-01T14:00:00.000Z',
      });
    expect(adjacentWindow.status).toBe(201);
    const adjacent = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-04-01T13:00:00.000Z',
        end_date: '2031-04-01T14:00:00.000Z',
      });
    const adjacentAcceptance = await request(app)
      .patch(`/api/bookings/${adjacent.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });
    expect(adjacentAcceptance.status).toBe(200);
  });

  it('prevents overlapping bookings from both being accepted', async () => {
    const first = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-01T10:00:00.000Z',
        end_date: '2031-05-01T12:00:00.000Z',
      });
    const second = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_admin'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-01T11:00:00.000Z',
        end_date: '2031-05-01T13:00:00.000Z',
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstAcceptance = await request(app)
      .patch(`/api/bookings/${first.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });
    expect(firstAcceptance.status).toBe(200);

    const secondAcceptance = await request(app)
      .patch(`/api/bookings/${second.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });
    expect(secondAcceptance.status).toBe(409);
    expect(secondAcceptance.body.error).toContain('already reserved');
    expect(store.getBookingById(second.body.data.booking.id)?.status).toBe('pending');
  });

  it('allows adjacent bookings to be accepted', async () => {
    const first = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-02T10:00:00.000Z',
        end_date: '2031-05-02T12:00:00.000Z',
      });
    const second = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_admin'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-02T12:00:00.000Z',
        end_date: '2031-05-02T14:00:00.000Z',
      });

    const firstAcceptance = await request(app)
      .patch(`/api/bookings/${first.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });
    const secondAcceptance = await request(app)
      .patch(`/api/bookings/${second.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });

    expect(firstAcceptance.status).toBe(200);
    expect(secondAcceptance.status).toBe(200);
  });

  it('does not let rejected or cancelled bookings block acceptance', async () => {
    const rejected = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-03T10:00:00.000Z',
        end_date: '2031-05-03T12:00:00.000Z',
      });
    const rejectedStatus = await request(app)
      .patch(`/api/bookings/${rejected.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'rejected' });

    const afterRejected = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_admin'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-03T10:00:00.000Z',
        end_date: '2031-05-03T12:00:00.000Z',
      });
    const afterRejectedAcceptance = await request(app)
      .patch(`/api/bookings/${afterRejected.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });

    const cancelled = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_amit'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-04T10:00:00.000Z',
        end_date: '2031-05-04T12:00:00.000Z',
      });
    const cancelledStatus = await request(app)
      .patch(`/api/bookings/${cancelled.body.data.booking.id}/status`)
      .set('Authorization', auth('user_amit'))
      .send({ status: 'cancelled' });

    const afterCancelled = await request(app)
      .post('/api/bookings')
      .set('Authorization', auth('user_admin'))
      .send({
        equipment_id: 'eq_tractor_rahul',
        start_date: '2031-05-04T10:00:00.000Z',
        end_date: '2031-05-04T12:00:00.000Z',
      });
    const afterCancelledAcceptance = await request(app)
      .patch(`/api/bookings/${afterCancelled.body.data.booking.id}/status`)
      .set('Authorization', auth('user_rahul'))
      .send({ status: 'accepted' });

    expect(rejectedStatus.status).toBe(200);
    expect(afterRejectedAcceptance.status).toBe(200);
    expect(cancelledStatus.status).toBe(200);
    expect(afterCancelledAcceptance.status).toBe(200);
  });
});
