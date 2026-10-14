import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { attachJsonRawBody, createApp } from '../app.js';
import { config } from '../config/env.js';
import paymentRoutes from '../routes/paymentRoutes.js';
import { store } from '../services/store.js';
import { PaymentStatus } from '../types/index.js';

const app = createApp();
const amitToken = jwt.sign(
  { id: 'user_amit', email: 'amit@example.com', full_name: 'Amit Patel', is_admin: false },
  config.jwtSecret
);

function signWebhook(rawBody: string): string {
  return crypto.createHmac('sha256', config.razorpayWebhookSecret).update(rawBody).digest('hex');
}

function capturedBody(orderId: string, paymentId: string, trailingSpace = false): string {
  const body = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
        },
      },
    },
  });
  return trailingSpace ? `${body} ` : body;
}

async function createOrder(): Promise<string> {
  const response = await request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${amitToken}`)
    .send({ bookingId: 'booking_demo_accepted' });
  expect(response.status).toBe(201);
  return response.body.data.orderId as string;
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

async function withNodeEnv(nodeEnv: string, run: () => Promise<void>): Promise<void> {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previous;
    }
  }
}

describe('Payment webhook security', () => {
  beforeEach(() => {
    store.reset();
  });

  it('mounts raw-body JSON parsing before payment routes and leaves webhook unauthenticated', () => {
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
    const verify = layers.find((layer) => layer.route?.path === '/payments/verify');
    expect(webhook?.route?.stack.map((layer) => layer.name)).toEqual(['handleWebhook']);
    expect(verify?.route?.stack.map((layer) => layer.name)).toContain('authenticate');
  });

  it('rejects missing and invalid webhook signatures in development and production', async () => {
    const orderId = await createOrder();
    const rawBody = capturedBody(orderId, 'pay_unsigned');

    for (const nodeEnv of ['development', 'production']) {
      await withNodeEnv(nodeEnv, async () => {
        const missing = await postWebhook(rawBody, undefined);
        expect(missing.status).toBe(400);
        expect(missing.body.error).toContain('Missing x-razorpay-signature');

        const invalid = await postWebhook(rawBody, 'invalid_webhook_signature');
        expect(invalid.status).toBe(400);
        expect(invalid.body.error).toBe('Invalid webhook signature');
      });
    }

    const payment = store.getPaymentByOrderId(orderId);
    const booking = store.getBookingById('booking_demo_accepted');
    expect(payment?.status).toBe('created');
    expect(booking?.status).toBe('payment_pending');
  });

  it('does not treat demo simulation flags as webhook authentication', async () => {
    const orderId = await createOrder();
    const previous = process.env.PAYMENT_ALLOW_DEMO_SIMULATION;
    process.env.PAYMENT_ALLOW_DEMO_SIMULATION = 'true';
    try {
      const response = await request(app)
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'forged')
        .send({
          event: 'payment.captured',
          is_demo_simulated: true,
          payload: { payment: { entity: { id: 'pay_demo', order_id: orderId } } },
        });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid webhook signature');
      expect(store.getPaymentByOrderId(orderId)?.status).toBe('created');
    } finally {
      if (previous === undefined) {
        delete process.env.PAYMENT_ALLOW_DEMO_SIMULATION;
      } else {
        process.env.PAYMENT_ALLOW_DEMO_SIMULATION = previous;
      }
    }
  });

  it('verifies HMAC against the actual raw request body, not a re-serialized payload', async () => {
    const orderId = await createOrder();
    const paymentId = 'pay_raw_body_hmac';
    const rawBody = capturedBody(orderId, paymentId, true);
    const canonicalBody = JSON.stringify(JSON.parse(rawBody));

    const forgedCanonical = await postWebhook(rawBody, signWebhook(canonicalBody));
    expect(forgedCanonical.status).toBe(400);
    expect(forgedCanonical.body.error).toBe('Invalid webhook signature');
    expect(store.getPaymentByOrderId(orderId)?.status).toBe('created');

    const authentic = await postWebhook(rawBody, signWebhook(rawBody));
    expect(authentic.status).toBe(200);
    expect(store.getPaymentByOrderId(orderId)?.status).toBe('captured');
    expect(store.getPaymentByOrderId(orderId)?.razorpay_payment_id).toBe(paymentId);
    expect(store.getBookingById('booking_demo_accepted')?.status).toBe('confirmed');
  });

  it('keeps repeated matching capture events idempotent and rejects mismatched payment IDs', async () => {
    const orderId = await createOrder();
    const paymentId = 'pay_webhook_match';
    const rawBody = capturedBody(orderId, paymentId);
    const first = await postWebhook(rawBody, signWebhook(rawBody));
    expect(first.status).toBe(200);

    const repeat = await postWebhook(rawBody, signWebhook(rawBody));
    expect(repeat.status).toBe(200);
    expect(repeat.body.message).toContain('Webhook processed successfully');

    const mismatchedBody = capturedBody(orderId, 'pay_webhook_other');
    const mismatched = await postWebhook(mismatchedBody, signWebhook(mismatchedBody));
    expect(mismatched.status).toBe(409);
    expect(mismatched.body.error).toContain('does not match the captured payment');
    expect(store.getPaymentByOrderId(orderId)?.razorpay_payment_id).toBe(paymentId);
    expect(store.getPaymentByOrderId(orderId)?.status).toBe('captured');
  });

  it('rejects capture webhooks from failed and refunded payments without changing state', async () => {
    for (const status of ['failed', 'refunded'] as PaymentStatus[]) {
      store.reset();
      const orderId = await createOrder();
      const payment = store.getPaymentByOrderId(orderId)!;
      payment.status = status;
      store.updatePayment(payment);
      const bookingBefore = store.getBookingById(payment.booking_id)!.status;

      const rawBody = capturedBody(orderId, `pay_${status}_capture`);
      const response = await postWebhook(rawBody, signWebhook(rawBody));
      expect(response.status).toBe(409);
      expect(response.body.error).toContain(`status '${status}'`);
      expect(store.getPaymentByOrderId(orderId)?.status).toBe(status);
      expect(store.getBookingById(payment.booking_id)?.status).toBe(bookingBefore);
    }
  });

  it('rejects mismatched payment IDs on repeated in-memory verification while matching IDs stay idempotent', async () => {
    const orderId = await createOrder();
    const paymentId = 'pay_verify_match';
    const signature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const first = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });

    expect(first.status).toBe(200);

    const repeat = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });
    expect(repeat.status).toBe(200);
    expect(repeat.body.message).toContain('idempotent');

    const otherId = 'pay_verify_other';
    const otherSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${orderId}|${otherId}`)
      .digest('hex');
    const mismatched = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: otherId,
        razorpay_signature: otherSignature,
      });
    expect(mismatched.status).toBe(409);
    expect(store.getPaymentByOrderId(orderId)?.razorpay_payment_id).toBe(paymentId);
    expect(store.getPaymentByOrderId(orderId)?.status).toBe('captured');
  });

  it('uses a unique idempotency key for each failed in-memory payment retry', async () => {
    const firstOrderId = await createOrder();
    const firstPayment = store.getPaymentByOrderId(firstOrderId)!;
    firstPayment.status = 'failed';
    store.updatePayment(firstPayment);

    const second = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({ bookingId: firstPayment.booking_id });

    expect(second.status).toBe(201);
    const attempts = store.getPaymentsByBookingId(firstPayment.booking_id);
    expect(attempts).toHaveLength(2);
    expect(attempts[0].idempotency_key).not.toBe(attempts[1].idempotency_key);
  });

  it('rejects invalid checkout verification without mutating state and allows a later valid capture', async () => {
    const orderId = await createOrder();
    const paymentId = 'pay_verify_retry';
    const bookingBefore = store.getBookingById('booking_demo_accepted')!;
    const paymentBefore = store.getPaymentByOrderId(orderId)!;

    const missing = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({ razorpay_order_id: orderId });
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'invalid_forged_signature_hex',
      });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toContain('invalid signature');
    expect(store.getPaymentByOrderId(orderId)?.status).toBe(paymentBefore.status);
    expect(store.getPaymentByOrderId(orderId)?.razorpay_payment_id).toBe(paymentBefore.razorpay_payment_id);
    expect(store.getBookingById('booking_demo_accepted')?.status).toBe(bookingBefore.status);

    const signature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const concurrent = await Promise.all([
      request(app).post('/api/payments/verify').set('Authorization', `Bearer ${amitToken}`).send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
      request(app).post('/api/payments/verify').set('Authorization', `Bearer ${amitToken}`).send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    ]);
    expect(concurrent.every((response) => response.status === 200)).toBe(true);
    expect(store.getPaymentByOrderId(orderId)?.status).toBe('captured');
    expect(store.getPaymentByOrderId(orderId)?.razorpay_payment_id).toBe(paymentId);
    expect(store.getBookingById('booking_demo_accepted')?.status).toBe('confirmed');
  });

  it('rejects in-memory verification capture attempts against failed and refunded payments', async () => {
    for (const status of ['failed', 'refunded'] as PaymentStatus[]) {
      store.reset();
      const orderId = await createOrder();
      const payment = store.getPaymentByOrderId(orderId)!;
      payment.status = status;
      store.updatePayment(payment);
      const paymentId = `pay_verify_${status}`;
      const signature = crypto
        .createHmac('sha256', config.razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });
      expect(response.status).toBe(409);
      expect(store.getPaymentByOrderId(orderId)?.status).toBe(status);
      expect(store.getBookingById(payment.booking_id)?.status).toBe('payment_pending');
    }
  });
});
