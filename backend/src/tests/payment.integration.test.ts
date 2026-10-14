import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { attachJsonRawBody, createApp } from '../app.js';
import { config } from '../config/env.js';
import { getDatabasePool, shutdownDatabasePool } from '../db/pool.js';
import { EquipmentRepository } from '../repositories/equipmentRepository.js';
import paymentRoutes from '../routes/paymentRoutes.js';
import { PaymentService } from '../services/paymentService.js';
import { UserRepository } from '../repositories/userRepository.js';
import { User } from '../types/index.js';

const VALIDATION_DATABASE_URL = 'postgresql://postgres:validation_only@localhost:55432/shared_farm_validation';
const databaseUrl = process.env.DATABASE_URL;
const targetDatabase = (() => {
  if (!databaseUrl) return false;
  try {
    const url = new URL(databaseUrl);
    return url.protocol === 'postgresql:' && url.hostname === 'localhost' &&
      url.port === '55432' && url.pathname === '/shared_farm_validation';
  } catch {
    return false;
  }
})();
const describeIfTarget = targetDatabase ? describe : describe.skip;
const describeIfExactValidationUrl =
  databaseUrl === VALIDATION_DATABASE_URL ? describe : describe.skip;

describeIfTarget('PostgreSQL payment integration', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let owner: User;
  let renter: User;
  let equipmentId: string;
  let bookingId: string;
  let orderId: string;
  let paymentId: string;
  let webhookBookingId: string;
  let webhookOrderId: string;
  let retryBookingId: string;
  const httpBookingIds = new Set<string>();
  const secret = 'integration-payment-secret';

  async function user(name: string): Promise<User> {
    const id = `phase2b5_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const result: User = {
      id,
      email: `${id}@example.test`,
      password_hash: await bcrypt.hash('password123', 4),
      full_name: `Payment ${name}`,
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await new UserRepository(pool).createUser(result);
    return result;
  }

  beforeAll(async () => {
    expect(config.databaseUrl).toBe(databaseUrl);
    pool = getDatabasePool();
    owner = await user('owner');
    renter = await user('renter');
    const equipment = await new EquipmentRepository(pool).create({
      id: `eq_phase2b5_${Date.now()}`,
      owner_id: owner.id,
      title: 'Payment Test Tractor',
      hourly_rate: 900,
      location_name: 'Validation Farm',
      status: 'active',
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    equipmentId = equipment.id;
    const created = await pool.query(
      `INSERT INTO bookings
       (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
        base_price, platform_fee, total_price, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'accepted',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id`,
      [`book_phase2b5_${Date.now()}`, renter.id, equipmentId, '2031-01-01T10:00:00Z',
        '2031-01-01T12:00:00Z', 2, 900, 1800, 90, 1890]
    );
    bookingId = created.rows[0].id;
  });

  afterAll(async () => {
    if (!pool) return;
    if (orderId) await pool.query('DELETE FROM payments WHERE razorpay_order_id = $1', [orderId]);
    if (webhookOrderId) await pool.query('DELETE FROM payments WHERE razorpay_order_id = $1', [webhookOrderId]);
    if (webhookBookingId) await pool.query('DELETE FROM bookings WHERE id = $1', [webhookBookingId]);
    if (retryBookingId) {
      await pool.query('DELETE FROM payments WHERE booking_id = $1', [retryBookingId]);
      await pool.query('DELETE FROM bookings WHERE id = $1', [retryBookingId]);
    }
    if (httpBookingIds.size > 0) {
      const ids = [...httpBookingIds];
      await pool.query('DELETE FROM payments WHERE booking_id = ANY($1::varchar[])', [ids]);
      await pool.query('DELETE FROM bookings WHERE id = ANY($1::varchar[])', [ids]);
    }
    await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    await pool.query('DELETE FROM equipment WHERE id = $1', [equipmentId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::varchar[])', [[owner.id, renter.id]]);
    await shutdownDatabasePool();
  });

  it('creates an authoritative order and atomically confirms verification', async () => {
    const service = new PaymentService(pool);
    const results = await Promise.all([
      service.createOrder(bookingId, renter.id, false),
      service.createOrder(bookingId, renter.id, false),
    ]);
    const order = results[0];
    orderId = order.payment.razorpay_order_id;
    expect(results[1].payment.razorpay_order_id).toBe(orderId);
    expect(order.payment.amount).toBe(1890);

    paymentId = `pay_phase2b5_${Date.now()}`;
    const sig = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    const result = await service.verify(orderId, paymentId, sig, renter.id, false, secret);
    expect(result.payment.status).toBe('captured');
    expect(result.bookingStatus).toBe('confirmed');
  });

  it('is idempotent and does not downgrade a captured payment', async () => {
    const service = new PaymentService(pool);
    const sig = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    const result = await service.verify(orderId, paymentId, sig, renter.id, false, secret);
    expect(result.payment.status).toBe('captured');
    await service.processWebhook(orderId, paymentId, 'payment.failed', 'LATE_FAILURE', 'must not downgrade');
    const row = await pool.query('SELECT status FROM payments WHERE razorpay_order_id = $1', [orderId]);
    expect(row.rows[0].status).toBe('captured');
  });

  it('processes captured webhooks, rejects mismatched identifiers, and rolls back on booking failure', async () => {
    const service = new PaymentService(pool);
    const created = await pool.query(
      `INSERT INTO bookings
       (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
        base_price, platform_fee, total_price, status, created_at, updated_at)
       VALUES ($1,$2,$3,'2031-03-01T10:00:00Z','2031-03-01T12:00:00Z',2,900,1800,90,1890,'accepted',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id`,
      [`book_phase2b5_webhook_${Date.now()}`, renter.id, equipmentId]
    );
    webhookBookingId = created.rows[0].id;
    const order = await service.createOrder(webhookBookingId, renter.id, false);
    webhookOrderId = order.payment.razorpay_order_id;
    const webhookPaymentId = `pay_phase2b5_webhook_${Date.now()}`;
    await service.processWebhook(webhookOrderId, webhookPaymentId, 'payment.captured');
    const captured = await pool.query(
      `SELECT p.status AS payment_status, p.razorpay_payment_id, b.status AS booking_status
       FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE p.razorpay_order_id = $1`,
      [webhookOrderId]
    );
    expect(captured.rows[0]).toEqual({
      payment_status: 'captured',
      razorpay_payment_id: webhookPaymentId,
      booking_status: 'confirmed',
    });
    await service.processWebhook(webhookOrderId, webhookPaymentId, 'payment.captured');
    await expect(service.processWebhook(webhookOrderId, 'wrong_payment_id', 'payment.captured'))
      .rejects.toMatchObject({ status: 409 });

    const rollbackBooking = await pool.query(
      `INSERT INTO bookings
       (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
        base_price, platform_fee, total_price, status, created_at, updated_at)
       VALUES ($1,$2,$3,'2031-04-01T10:00:00Z','2031-04-01T12:00:00Z',2,900,1800,90,1890,'accepted',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id`,
      [`book_phase2b5_rollback_${Date.now()}`, renter.id, equipmentId]
    );
    const rollbackBookingId = rollbackBooking.rows[0].id;
    const rollbackOrder = await service.createOrder(rollbackBookingId, renter.id, false);
    await pool.query(`UPDATE bookings SET status = 'completed' WHERE id = $1`, [rollbackBookingId]);
    await expect(service.processWebhook(rollbackOrder.payment.razorpay_order_id, 'pay_rollback', 'payment.captured'))
      .rejects.toMatchObject({ status: 409 });
    const unchanged = await pool.query(
      `SELECT p.status, b.status AS booking_status FROM payments p
       JOIN bookings b ON b.id = p.booking_id WHERE p.razorpay_order_id = $1`,
      [rollbackOrder.payment.razorpay_order_id]
    );
    expect(unchanged.rows[0]).toEqual({ status: 'created', booking_status: 'completed' });
    await pool.query('DELETE FROM payments WHERE booking_id = $1', [rollbackBookingId]);
    await pool.query('DELETE FROM bookings WHERE id = $1', [rollbackBookingId]);
  });

  it('rejects captured webhooks from failed and refunded payments without changing state', async () => {
    const service = new PaymentService(pool);
    for (const status of ['failed', 'refunded'] as const) {
      const created = await pool.query(
        `INSERT INTO bookings
         (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
          base_price, platform_fee, total_price, status, created_at, updated_at)
         VALUES ($1,$2,$3,'2031-05-01T10:00:00Z','2031-05-01T12:00:00Z',2,900,1800,90,1890,'accepted',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING id`,
        [`book_phase2b5_${status}_${Date.now()}`, renter.id, equipmentId]
      );
      const bookingIdForStatus = created.rows[0].id;
      const order = await service.createOrder(bookingIdForStatus, renter.id, false);
      await pool.query(`UPDATE payments SET status = $2 WHERE razorpay_order_id = $1`, [
        order.payment.razorpay_order_id,
        status,
      ]);
      await expect(service.processWebhook(order.payment.razorpay_order_id, `pay_${status}`, 'payment.captured'))
        .rejects.toMatchObject({ status: 409 });
      const unchanged = await pool.query(
        `SELECT p.status, p.razorpay_payment_id, b.status AS booking_status FROM payments p
         JOIN bookings b ON b.id = p.booking_id WHERE p.razorpay_order_id = $1`,
        [order.payment.razorpay_order_id]
      );
      expect(unchanged.rows[0]).toEqual({
        status,
        razorpay_payment_id: null,
        booking_status: 'payment_pending',
      });
      await pool.query('DELETE FROM payments WHERE booking_id = $1', [bookingIdForStatus]);
      await pool.query('DELETE FROM bookings WHERE id = $1', [bookingIdForStatus]);
    }
  });

  it('rejects unauthorized payment history access', async () => {
    await expect(new PaymentService(pool).listPayments(bookingId, 'not-a-participant', false))
      .rejects.toMatchObject({ status: 403 });
  });

  it('rejects invalid checkout signatures without mutating state and captures a later valid verification', async () => {
    const service = new PaymentService(pool);
    const created = await pool.query(
      `INSERT INTO bookings
       (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
        base_price, platform_fee, total_price, status, created_at, updated_at)
       VALUES ($1,$2,$3,'2031-06-01T10:00:00Z','2031-06-01T12:00:00Z',2,900,1800,90,1890,'accepted',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       RETURNING id`,
      [`book_phase2b5_retry_${Date.now()}`, renter.id, equipmentId]
    );
    retryBookingId = created.rows[0].id;
    const firstOrder = await service.createOrder(retryBookingId, renter.id, false);
    await pool.query(
      `UPDATE payments SET status = 'failed', error_code = 'CARD_DECLINED'
       WHERE razorpay_order_id = $1`,
      [firstOrder.payment.razorpay_order_id]
    );
    const order = await service.createOrder(retryBookingId, renter.id, false);
    expect(order.payment.razorpay_order_id).not.toBe(firstOrder.payment.razorpay_order_id);
    expect(order.payment.idempotency_key).not.toBe(firstOrder.payment.idempotency_key);
    const attempts = await pool.query(
      'SELECT status FROM payments WHERE booking_id = $1 ORDER BY created_at',
      [retryBookingId]
    );
    expect(attempts.rows.map((row: { status: string }) => row.status)).toEqual(['failed', 'created']);
    const retryOrderId = order.payment.razorpay_order_id;
    const retryPaymentId = `pay_phase2b5_retry_${Date.now()}`;

    await expect(service.verify(retryOrderId, retryPaymentId, 'invalid_signature', renter.id, false, secret))
      .rejects.toMatchObject({ status: 400 });
    const afterInvalid = await pool.query(
      `SELECT p.status, p.razorpay_payment_id, b.status AS booking_status
       FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE p.razorpay_order_id = $1`,
      [retryOrderId]
    );
    expect(afterInvalid.rows[0]).toEqual({
      status: 'created',
      razorpay_payment_id: null,
      booking_status: 'payment_pending',
    });

    const sig = crypto.createHmac('sha256', secret).update(`${retryOrderId}|${retryPaymentId}`).digest('hex');
    const concurrent = await Promise.allSettled([
      service.verify(retryOrderId, retryPaymentId, sig, renter.id, false, secret),
      service.verify(retryOrderId, retryPaymentId, sig, renter.id, false, secret),
    ]);
    const fulfilled = concurrent.filter((result) => result.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    concurrent.filter((result) => result.status === 'rejected').forEach((result) => {
      expect(result.reason).toMatchObject({ status: 409 });
    });
    const captured = await pool.query(
      `SELECT p.status, p.razorpay_payment_id, b.status AS booking_status
       FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE p.razorpay_order_id = $1`,
      [retryOrderId]
    );
    expect(captured.rows[0]).toEqual({
      status: 'captured',
      razorpay_payment_id: retryPaymentId,
      booking_status: 'confirmed',
    });
  });

  describeIfExactValidationUrl('HTTP webhook route', () => {
    const app = createApp();

    function token(user: User): string {
      return jwt.sign(
        { id: user.id, email: user.email, full_name: user.full_name, is_admin: user.is_admin },
        config.jwtSecret
      );
    }

    function signWebhook(rawBody: string): string {
      return crypto.createHmac('sha256', config.razorpayWebhookSecret).update(rawBody).digest('hex');
    }

    function capturedBody(orderId: string, paymentId: string, trailingSpace = false): string {
      const body = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: paymentId, order_id: orderId } } },
      });
      return trailingSpace ? `${body} ` : body;
    }

    async function postWebhook(rawBody: string, signature: string | undefined) {
      const req = request(app)
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json');
      if (signature !== undefined) {
        req.set('x-razorpay-signature', signature);
      }
      return req.send(rawBody);
    }

    async function insertAcceptedBooking(): Promise<string> {
      const created = await pool.query(
        `INSERT INTO bookings
         (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
          base_price, platform_fee, total_price, status, created_at, updated_at)
         VALUES ($1,$2,$3,'2031-07-01T10:00:00Z','2031-07-01T12:00:00Z',2,900,1800,90,1890,'accepted',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
         RETURNING id`,
        [`book_phase2b5_http_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, renter.id, equipmentId]
      );
      httpBookingIds.add(created.rows[0].id);
      return created.rows[0].id;
    }

    async function createHttpOrder(): Promise<{ bookingId: string; orderId: string }> {
      const bookingIdForHttp = await insertAcceptedBooking();
      const created = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${token(renter)}`)
        .send({ bookingId: bookingIdForHttp });
      expect(created.status).toBe(201);
      return { bookingId: bookingIdForHttp, orderId: created.body.data.orderId as string };
    }

    async function persistedState(orderId: string) {
      const row = await pool.query(
        `SELECT p.status AS payment_status, p.razorpay_payment_id, b.status AS booking_status
         FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE p.razorpay_order_id = $1`,
        [orderId]
      );
      return row.rows[0];
    }

    it('preserves raw-body JSON parsing before payment routes when PostgreSQL is configured', () => {
      const stack = (app as { _router: { stack: Array<{ name: string }> } })._router.stack;
      const jsonIndex = stack.findIndex((layer) => layer.name === 'jsonParser');
      const routerIndex = stack.findIndex((layer) => layer.name === 'router');
      expect(attachJsonRawBody.name).toBe('attachJsonRawBody');
      expect(jsonIndex).toBeGreaterThan(-1);
      expect(jsonIndex).toBeLessThan(routerIndex);
      const layers = (paymentRoutes as unknown as {
        stack: Array<{ route?: { path: string; stack: Array<{ name: string }> } }>;
      }).stack;
      const webhook = layers.find((layer) => layer.route?.path === '/payments/webhook');
      expect(webhook?.route?.stack.map((layer) => layer.name)).toEqual(['handleWebhook']);
    });

    it('captures a signed payment.captured webhook over HTTP and rejects unsigned or invalid HMAC', async () => {
      const { bookingId: httpBookingId, orderId } = await createHttpOrder();
      const paymentId = `pay_http_${Date.now()}`;
      const rawBody = capturedBody(orderId, paymentId, true);
      const canonicalBody = JSON.stringify(JSON.parse(rawBody));

      const missing = await postWebhook(rawBody, undefined);
      expect(missing.status).toBe(400);
      expect(missing.body.error).toContain('Missing x-razorpay-signature');

      const invalid = await postWebhook(rawBody, 'invalid_webhook_signature');
      expect(invalid.status).toBe(400);
      expect(invalid.body.error).toBe('Invalid webhook signature');

      const canonicalSignature = await postWebhook(rawBody, signWebhook(canonicalBody));
      expect(canonicalSignature.status).toBe(400);
      expect(canonicalSignature.body.error).toBe('Invalid webhook signature');
      expect(await persistedState(orderId)).toEqual({
        payment_status: 'created',
        razorpay_payment_id: null,
        booking_status: 'payment_pending',
      });

      const authentic = await postWebhook(rawBody, signWebhook(rawBody));
      expect(authentic.status).toBe(200);
      expect(await persistedState(orderId)).toEqual({
        payment_status: 'captured',
        razorpay_payment_id: paymentId,
        booking_status: 'confirmed',
      });
      expect(httpBookingIds.has(httpBookingId)).toBe(true);
    });

    it('rejects invalid HTTP checkout verification without mutating state, then captures a valid retry', async () => {
      const { orderId } = await createHttpOrder();
      const paymentId = `pay_http_verify_${Date.now()}`;
      const auth = `Bearer ${token(renter)}`;

      const invalid = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', auth)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'invalid_forged_signature_hex',
        });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error).toContain('invalid signature');
      expect(await persistedState(orderId)).toEqual({
        payment_status: 'created',
        razorpay_payment_id: null,
        booking_status: 'payment_pending',
      });

      const signature = crypto
        .createHmac('sha256', config.razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      const valid = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', auth)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });
      expect(valid.status).toBe(200);
      expect(valid.body.data.bookingStatus).toBe('confirmed');
      expect(await persistedState(orderId)).toEqual({
        payment_status: 'captured',
        razorpay_payment_id: paymentId,
        booking_status: 'confirmed',
      });
    });

    it('rejects mismatched payment IDs and invalid capture transitions without corrupting persisted state', async () => {
      const { orderId } = await createHttpOrder();
      const paymentId = `pay_http_match_${Date.now()}`;
      const rawBody = capturedBody(orderId, paymentId);
      const first = await postWebhook(rawBody, signWebhook(rawBody));
      expect(first.status).toBe(200);
      const repeat = await postWebhook(rawBody, signWebhook(rawBody));
      expect(repeat.status).toBe(200);

      const mismatchedBody = capturedBody(orderId, `pay_http_other_${Date.now()}`);
      const mismatched = await postWebhook(mismatchedBody, signWebhook(mismatchedBody));
      expect(mismatched.status).toBe(409);
      expect(await persistedState(orderId)).toEqual({
        payment_status: 'captured',
        razorpay_payment_id: paymentId,
        booking_status: 'confirmed',
      });

      const failedBooking = await createHttpOrder();
      await pool.query(`UPDATE payments SET status = 'failed' WHERE razorpay_order_id = $1`, [failedBooking.orderId]);
      const failedBody = capturedBody(failedBooking.orderId, `pay_http_failed_${Date.now()}`);
      const failedCapture = await postWebhook(failedBody, signWebhook(failedBody));
      expect(failedCapture.status).toBe(409);
      expect(await persistedState(failedBooking.orderId)).toEqual({
        payment_status: 'failed',
        razorpay_payment_id: null,
        booking_status: 'payment_pending',
      });
    });
  });
});
