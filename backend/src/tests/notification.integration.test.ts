import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { getDatabasePool, shutdownDatabasePool } from '../db/pool.js';
import { EquipmentRepository } from '../repositories/equipmentRepository.js';
import { NotificationRepository } from '../repositories/notificationRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { PaymentService } from '../services/paymentService.js';
import { TrackingService } from '../services/trackingService.js';
import { User } from '../types/index.js';

const VALIDATION_DATABASE_URL = 'postgresql://postgres:validation_only@localhost:55432/shared_farm_validation';
const databaseUrl = process.env.DATABASE_URL;
const describeIfExact =
  databaseUrl === VALIDATION_DATABASE_URL ? describe : describe.skip;

describeIfExact('PostgreSQL notification persistence', () => {
  const app = createApp();
  let pool: ReturnType<typeof getDatabasePool>;
  let owner: User;
  let renter: User;
  let outsider: User;
  let equipmentId: string;
  let successBookingId: string;
  let failedBookingId: string;
  let rentalBookingId: string;
  const extraBookingIds = new Set<string>();
  const secret = 'integration-payment-secret';

  async function createUser(label: string): Promise<User> {
    const id = `phase2b8_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const user: User = {
      id,
      email: `${id}@example.test`,
      password_hash: await bcrypt.hash('password123', 4),
      full_name: `Notify ${label}`,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await new UserRepository(pool).createUser(user);
    return user;
  }

  async function insertBooking(status: 'accepted' | 'confirmed'): Promise<string> {
    const created = await pool.query(
      `INSERT INTO bookings
       (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
        base_price, platform_fee, total_price, status, created_at, updated_at)
       VALUES ($1,$2,$3,'2032-01-01T10:00:00Z','2032-01-01T12:00:00Z',2,900,1800,90,1890,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id`,
      [`book_phase2b8_${status}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, renter.id, equipmentId, status]
    );
    return created.rows[0].id;
  }

  async function eventCounts(bookingId: string) {
    const rows = await pool.query(
      `SELECT user_id, type, COUNT(*)::int AS count
       FROM notifications
       WHERE reference_id = $1
       GROUP BY user_id, type
       ORDER BY type, user_id`,
      [bookingId]
    );
    return rows.rows;
  }

  function token(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name, is_admin: user.is_admin },
      config.jwtSecret
    );
  }

  beforeAll(async () => {
    expect(config.databaseUrl).toBe(VALIDATION_DATABASE_URL);
    pool = getDatabasePool();
    owner = await createUser('owner');
    renter = await createUser('renter');
    outsider = await createUser('outsider');
    const equipment = await new EquipmentRepository(pool).create({
      id: `eq_phase2b8_${Date.now()}`,
      owner_id: owner.id,
      title: 'Notification Tractor',
      hourly_rate: 900,
      location_name: 'Validation Farm',
      status: 'active',
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    equipmentId = equipment.id;
    successBookingId = await insertBooking('accepted');
    failedBookingId = await insertBooking('accepted');
    rentalBookingId = await insertBooking('confirmed');
  });

  afterAll(async () => {
    if (!pool || !owner || !renter || !outsider) return;
    const userIds = [owner.id, renter.id, outsider.id];
    const bookingIds = [successBookingId, failedBookingId, rentalBookingId, ...extraBookingIds].filter(Boolean);
    await pool.query('DELETE FROM notifications WHERE user_id = ANY($1::varchar[])', [userIds]);
    if (bookingIds.length) {
      await pool.query('DELETE FROM equipment_tracking WHERE booking_id = ANY($1::varchar[])', [bookingIds]);
      await pool.query('DELETE FROM rental_sessions WHERE booking_id = ANY($1::varchar[])', [bookingIds]);
      await pool.query('DELETE FROM payments WHERE booking_id = ANY($1::varchar[])', [bookingIds]);
      await pool.query('DELETE FROM bookings WHERE id = ANY($1::varchar[])', [bookingIds]);
    }
    await pool.query('DELETE FROM equipment WHERE id = $1', [equipmentId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::varchar[])', [userIds]);
    await shutdownDatabasePool();
  });

  it('does not notify on invalid checkout signatures, then persists payment-success once', async () => {
    const payments = new PaymentService(pool);
    const order = await payments.createOrder(successBookingId, renter.id, false);
    const orderId = order.payment.razorpay_order_id;
    const paymentId = `pay_phase2b8_ok_${Date.now()}`;

    await expect(payments.verify(orderId, paymentId, 'invalid_signature', renter.id, false, secret))
      .rejects.toMatchObject({ status: 400 });
    expect(await eventCounts(successBookingId)).toEqual([]);

    const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    const first = await payments.verify(orderId, paymentId, signature, renter.id, false, secret);
    expect(first.bookingStatus).toBe('confirmed');
    await payments.verify(orderId, paymentId, signature, renter.id, false, secret);
    await payments.processWebhook(orderId, paymentId, 'payment.captured');

    expect(await eventCounts(successBookingId)).toEqual([
      { user_id: owner.id, type: 'payment_success', count: 1 },
      { user_id: renter.id, type: 'payment_success', count: 1 },
    ]);
  });

  it('persists a legitimate payment-failure notification once and skips retries', async () => {
    const payments = new PaymentService(pool);
    const order = await payments.createOrder(failedBookingId, renter.id, false);
    await payments.processWebhook(
      order.payment.razorpay_order_id,
      `pay_phase2b8_fail_${Date.now()}`,
      'payment.failed',
      'CARD_DECLINED',
      'Insufficient funds'
    );
    await payments.processWebhook(
      order.payment.razorpay_order_id,
      `pay_phase2b8_fail_${Date.now()}`,
      'payment.failed',
      'CARD_DECLINED',
      'Insufficient funds'
    );
    expect(await eventCounts(failedBookingId)).toEqual([
      { user_id: renter.id, type: 'payment_failed', count: 1 },
    ]);
    const row = await pool.query(
      'SELECT status FROM payments WHERE razorpay_order_id = $1',
      [order.payment.razorpay_order_id]
    );
    expect(row.rows[0].status).toBe('failed');
  });

  it('persists rental-started and rental-completed notifications for renter and owner', async () => {
    const tracking = new TrackingService(pool);
    await tracking.start(rentalBookingId, renter.id, false);
    expect(await eventCounts(rentalBookingId)).toEqual([
      { user_id: owner.id, type: 'rental_started', count: 1 },
      { user_id: renter.id, type: 'rental_started', count: 1 },
    ]);
    await expect(tracking.start(rentalBookingId, renter.id, false)).rejects.toMatchObject({ status: 409 });
    expect(await eventCounts(rentalBookingId)).toEqual([
      { user_id: owner.id, type: 'rental_started', count: 1 },
      { user_id: renter.id, type: 'rental_started', count: 1 },
    ]);

    await tracking.end(rentalBookingId, owner.id, false);
    expect(await eventCounts(rentalBookingId)).toEqual([
      { user_id: owner.id, type: 'rental_completed', count: 1 },
      { user_id: renter.id, type: 'rental_completed', count: 1 },
      { user_id: owner.id, type: 'rental_started', count: 1 },
      { user_id: renter.id, type: 'rental_started', count: 1 },
    ]);
  });

  it('scopes HTTP list, unread counts, and read-state updates to the notification owner', async () => {
    const repo = new NotificationRepository(pool);
    const listed = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token(renter)}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.unreadCount).toBeGreaterThan(0);
    const renterNotes = listed.body.data.notifications as Array<{ id: string; user_id: string; is_read: boolean }>;
    expect(renterNotes.every((item) => item.user_id === renter.id)).toBe(true);

    const ownerList = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token(owner)}`);
    expect(ownerList.body.data.notifications.every((item: { user_id: string }) => item.user_id === owner.id)).toBe(true);

    const unread = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${token(renter)}`);
    expect(unread.status).toBe(200);
    expect(unread.body.data.unreadCount).toBe(listed.body.data.unreadCount);

    const target = renterNotes.find((item) => !item.is_read);
    expect(target).toBeDefined();
    const cross = await request(app)
      .patch(`/api/notifications/${target!.id}/read`)
      .set('Authorization', `Bearer ${token(outsider)}`);
    expect(cross.status).toBe(404);
    expect((await repo.markRead(target!.id, outsider.id))?.is_read).toBeUndefined();

    const marked = await request(app)
      .patch(`/api/notifications/${target!.id}/read`)
      .set('Authorization', `Bearer ${token(renter)}`);
    expect(marked.status).toBe(200);
    expect(marked.body.data.notification.is_read).toBe(true);
    expect(marked.body.data.unreadCount).toBe(listed.body.data.unreadCount - 1);

    const all = await request(app)
      .patch('/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${token(renter)}`);
    expect(all.status).toBe(200);
    expect(all.body.data.unreadCount).toBe(0);
    expect(await repo.unreadCount(renter.id)).toBe(0);
    expect(await repo.unreadCount(owner.id)).toBeGreaterThan(0);
  });

  async function insertCreatedPayment(bookingId: string, suffix: string): Promise<{ id: string; orderId: string }> {
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const id = `pay_phase2b8_${suffix}_${stamp}`;
    const orderId = `order_phase2b8_${suffix}_${stamp}`;
    await pool.query(
      `INSERT INTO payments
       (id, booking_id, user_id, razorpay_order_id, amount, currency, status, idempotency_key, created_at, updated_at)
       VALUES ($1,$2,$3,$4,1890,'INR','created',$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      [id, bookingId, renter.id, orderId, `idem_phase2b8_${suffix}_${stamp}`]
    );
    return { id, orderId };
  }

  it('serializes concurrent payment-failure events for different rows on the same booking', async () => {
    const bookingId = await insertBooking('payment_pending');
    extraBookingIds.add(bookingId);
    const first = await insertCreatedPayment(bookingId, 'fail_a');
    const second = await insertCreatedPayment(bookingId, 'fail_b');
    const payments = new PaymentService(pool);
    const results = await Promise.allSettled([
      payments.processWebhook(first.orderId, `rzp_${first.id}`, 'payment.failed', 'CARD_DECLINED', 'Insufficient funds'),
      payments.processWebhook(second.orderId, `rzp_${second.id}`, 'payment.failed', 'CARD_DECLINED', 'Insufficient funds'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    const statuses = await pool.query(
      'SELECT status FROM payments WHERE booking_id = $1 ORDER BY razorpay_order_id',
      [bookingId]
    );
    expect(statuses.rows.every((row: { status: string }) => row.status === 'failed')).toBe(true);
    expect(await eventCounts(bookingId)).toEqual([
      { user_id: renter.id, type: 'payment_failed', count: 1 },
    ]);
    await payments.processWebhook(first.orderId, `rzp_${first.id}`, 'payment.failed', 'CARD_DECLINED', 'Insufficient funds');
    expect(await eventCounts(bookingId)).toEqual([
      { user_id: renter.id, type: 'payment_failed', count: 1 },
    ]);
  });

  it('serializes concurrent capture and failure for the same booking and keeps notifications consistent', async () => {
    const bookingId = await insertBooking('accepted');
    extraBookingIds.add(bookingId);
    const payments = new PaymentService(pool);
    const order = await payments.createOrder(bookingId, renter.id, false);
    const captureId = `rzp_cap_${Date.now()}`;
    const results = await Promise.allSettled([
      payments.processWebhook(order.payment.razorpay_order_id, captureId, 'payment.captured'),
      payments.processWebhook(order.payment.razorpay_order_id, captureId, 'payment.failed', 'LATE', 'declined'),
    ]);
    const row = await pool.query(
      `SELECT p.status AS payment_status, p.razorpay_payment_id, b.status AS booking_status
       FROM payments p JOIN bookings b ON b.id = p.booking_id
       WHERE p.razorpay_order_id = $1`,
      [order.payment.razorpay_order_id]
    );
    const state = row.rows[0];
    if (state.payment_status === 'captured') {
      expect(state.booking_status).toBe('confirmed');
      expect(state.razorpay_payment_id).toBe(captureId);
      expect(await eventCounts(bookingId)).toEqual([
        { user_id: owner.id, type: 'payment_success', count: 1 },
        { user_id: renter.id, type: 'payment_success', count: 1 },
      ]);
      const rejected = results.filter((result) => result.status === 'rejected');
      rejected.forEach((result) => expect(result.reason).toMatchObject({ status: 409 }));
    } else {
      expect(state.payment_status).toBe('failed');
      expect(state.booking_status).toBe('payment_pending');
      expect(await eventCounts(bookingId)).toEqual([
        { user_id: renter.id, type: 'payment_failed', count: 1 },
      ]);
      expect(results.some((result) => result.status === 'rejected')).toBe(true);
      results.filter((result) => result.status === 'rejected').forEach((result) => {
        expect(result.reason).toMatchObject({ status: 409 });
      });
    }
    await payments.processWebhook(order.payment.razorpay_order_id, captureId, 'payment.failed', 'LATE', 'declined');
    if (state.payment_status === 'captured') {
      await payments.processWebhook(order.payment.razorpay_order_id, captureId, 'payment.captured');
      expect(await eventCounts(bookingId)).toEqual([
        { user_id: owner.id, type: 'payment_success', count: 1 },
        { user_id: renter.id, type: 'payment_success', count: 1 },
      ]);
      const afterRetry = await pool.query(
        'SELECT status FROM payments WHERE razorpay_order_id = $1',
        [order.payment.razorpay_order_id]
      );
      expect(afterRetry.rows[0].status).toBe('captured');
    } else {
      await expect(
        payments.processWebhook(order.payment.razorpay_order_id, captureId, 'payment.captured')
      ).rejects.toMatchObject({ status: 409 });
      expect(await eventCounts(bookingId)).toEqual([
        { user_id: renter.id, type: 'payment_failed', count: 1 },
      ]);
    }
  });
});
