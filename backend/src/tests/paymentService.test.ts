import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DatabasePool } from '../db/pool.js';
import {
  PaymentService,
  PaymentServiceError,
  evaluatePaymentCapture,
  isDemoSimulationAllowed,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../services/paymentService.js';

describe('PaymentService', () => {
  it('verifies Razorpay signatures with constant-time comparison', () => {
    const signature = crypto.createHmac('sha256', 'secret').update('order|payment').digest('hex');
    expect(verifyPaymentSignature('order', 'payment', signature, 'secret')).toBe(true);
    expect(verifyPaymentSignature('order', 'payment', `${signature}x`, 'secret')).toBe(false);
  });

  it('does not let the request field enable demo verification without server authorization', () => {
    expect(isDemoSimulationAllowed(true, false)).toBe(false);
    expect(isDemoSimulationAllowed(true, true)).toBe(true);
    expect(isDemoSimulationAllowed(false, true)).toBe(false);
  });

  it('verifies Razorpay webhook signatures against the raw body', () => {
    const rawBody = '{"event":"payment.captured"} ';
    const signature = crypto.createHmac('sha256', 'webhook-secret').update(rawBody).digest('hex');
    expect(verifyWebhookSignature(rawBody, signature, 'webhook-secret')).toBe(true);
    expect(verifyWebhookSignature(JSON.stringify(JSON.parse(rawBody)), signature, 'webhook-secret')).toBe(false);
    expect(verifyWebhookSignature(rawBody, 'deadbeef', 'webhook-secret')).toBe(false);
  });

  it('rejects invalid payment state transitions explicitly', () => {
    expect(evaluatePaymentCapture('created', undefined, 'pay_1')).toBe('apply');
    expect(evaluatePaymentCapture('authorized', undefined, 'pay_1')).toBe('apply');
    expect(evaluatePaymentCapture('captured', 'pay_1', 'pay_1')).toBe('idempotent');
    expect(() => evaluatePaymentCapture('captured', 'pay_1', 'pay_other')).toThrow(PaymentServiceError);
    expect(() => evaluatePaymentCapture('failed', undefined, 'pay_1')).toThrow(/failed/);
    expect(() => evaluatePaymentCapture('refunded', undefined, 'pay_1')).toThrow(/refunded/);
    try {
      evaluatePaymentCapture('failed', undefined, 'pay_1');
    } catch (error) {
      expect((error as PaymentServiceError).status).toBe(409);
    }
  });

  it('requires a PostgreSQL connection only when a service operation is used', () => {
    const pool: DatabasePool = {
      connect: async () => {
        throw new Error('not used');
      },
      query: async () => ({ rows: [] }),
      end: async () => undefined,
    };
    expect(new PaymentService(pool)).toBeDefined();
  });

  it('rolls back payment capture when a notification insert fails', async () => {
    const now = '2031-01-01T00:00:00.000Z';
    const statements: string[] = [];
    const paymentRow = {
      id: 'pay_1', booking_id: 'book_1', user_id: 'renter_1', razorpay_order_id: 'order_1',
      razorpay_payment_id: null, razorpay_signature: null, amount: 1890, currency: 'INR',
      status: 'created', payment_method: null, error_code: null, error_description: null,
      idempotency_key: null, created_at: now, updated_at: now,
    };
    const bookingRow = {
      id: 'book_1', renter_id: 'renter_1', equipment_id: 'eq_1',
      start_date: now, end_date: now, total_hours: 2, hourly_rate: 900, base_price: 1800,
      platform_fee: 90, total_price: 1890, status: 'payment_pending', notes: null,
      created_at: now, updated_at: now, owner_id: 'owner_1', category_id: null, title: 'Tractor',
      description: null, equipment_hourly_rate: 900, daily_rate: null, location_name: 'Farm',
      approx_lat: null, approx_lng: null, equipment_status: 'active', rating_avg: 0, rating_count: 0,
      image_url: null, equipment_created_at: now, equipment_updated_at: now,
      owner_full_name: 'Owner', renter_full_name: 'Renter', renter_phone: null,
    };
    const client = {
      released: false,
      query: async (text: string) => {
        statements.push(text);
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
        if (text.includes('FROM payments WHERE razorpay_order_id')) return { rows: [paymentRow] };
        if (text.includes('SELECT id FROM bookings')) return { rows: [{ id: 'book_1' }] };
        if (text.includes('FROM bookings b')) return { rows: [bookingRow] };
        if (text.includes('UPDATE payments')) return { rows: [{ ...paymentRow, status: 'captured', razorpay_payment_id: 'pay_rzp' }] };
        if (text.includes("UPDATE bookings SET status = 'confirmed'")) return { rows: [bookingRow] };
        if (text.includes('INSERT INTO notifications')) throw new Error('notification insert failed');
        return { rows: [] };
      },
      release: () => {
        client.released = true;
      },
    };
    const pool: DatabasePool = {
      connect: async () => client,
      query: async () => ({ rows: [] }),
      end: async () => undefined,
    };
    const signature = crypto.createHmac('sha256', 'secret').update('order_1|pay_rzp').digest('hex');
    await expect(new PaymentService(pool).verify('order_1', 'pay_rzp', signature, 'renter_1', false, 'secret'))
      .rejects.toThrow('notification insert failed');
    expect(statements.some((sql) => sql === 'ROLLBACK')).toBe(true);
    expect(statements.some((sql) => sql === 'COMMIT')).toBe(false);
    expect(client.released).toBe(true);
    const lockIndex = statements.findIndex((sql) => sql.includes('SELECT id FROM bookings') && sql.includes('FOR UPDATE'));
    const paymentUpdateIndex = statements.findIndex((sql) => sql.includes('UPDATE payments'));
    expect(lockIndex).toBeGreaterThan(-1);
    expect(lockIndex).toBeLessThan(paymentUpdateIndex);
  });
});
