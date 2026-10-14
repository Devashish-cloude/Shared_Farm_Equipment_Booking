import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { TransactionPool, withTransaction } from '../db/transaction.js';
import { BookingContext, BookingRepository } from '../repositories/bookingRepository.js';
import { NotificationQueryClient, NotificationRepository } from '../repositories/notificationRepository.js';
import { PaymentRepository } from '../repositories/paymentRepository.js';
import {
  paymentFailedWrite,
  paymentSuccessWrites,
} from './notificationService.js';
import { Booking, Payment, PaymentStatus } from '../types/index.js';

export const CAPTURABLE_PAYMENT_STATUSES: readonly PaymentStatus[] = ['created', 'authorized'];

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function timingSafeHexEqual(expected: string, provided: string): boolean {
  if (provided.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export class PaymentServiceError extends Error {
  public constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'PaymentServiceError';
  }
}

export function verifyPaymentSignature(orderId: string, paymentId: string, provided: string, secret: string): boolean {
  return timingSafeHexEqual(hmacHex(secret, `${orderId}|${paymentId}`), provided);
}

export function verifyWebhookSignature(rawBody: string, provided: string, secret: string): boolean {
  return timingSafeHexEqual(hmacHex(secret, rawBody), provided);
}

export function isDemoSimulationAllowed(requested: boolean, serverEnabled: boolean): boolean {
  return requested && serverEnabled;
}

export function evaluatePaymentCapture(
  status: PaymentStatus,
  storedPaymentId: string | undefined,
  incomingPaymentId: string | undefined
): 'idempotent' | 'apply' {
  if (status === 'captured') {
    if (storedPaymentId !== incomingPaymentId) {
      throw new PaymentServiceError('Payment identifier does not match the captured payment.', 409);
    }
    return 'idempotent';
  }
  if (!CAPTURABLE_PAYMENT_STATUSES.includes(status)) {
    throw new PaymentServiceError(`Payment cannot be captured from status '${status}'.`, 409);
  }
  if (!incomingPaymentId) {
    throw new PaymentServiceError('Captured webhook is missing the payment identifier.', 400);
  }
  return 'apply';
}

export class PaymentService {
  private readonly pool: DatabasePool;
  private readonly payments: PaymentRepository;
  private readonly bookings: BookingRepository;
  private readonly notifications: NotificationRepository;
  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
    this.payments = new PaymentRepository(pool);
    this.bookings = new BookingRepository(pool);
    this.notifications = new NotificationRepository(pool);
  }

  private async lockBookingAndReloadPayment(
    orderId: string,
    client: Parameters<BookingRepository['lockById']>[1]
  ): Promise<{ payment: Payment; context: BookingContext } | undefined> {
    const located = await this.payments.findByOrderId(orderId, client);
    if (!located) return undefined;
    const locked = await this.bookings.lockById(located.booking_id, client);
    if (!locked) return undefined;
    const payment = await this.payments.findByOrderId(orderId, client);
    if (!payment) return undefined;
    const context = await this.bookings.findById(payment.booking_id, client);
    if (!context) return undefined;
    return { payment, context };
  }

  private async persistPaymentSuccess(
    context: BookingContext,
    amount: number,
    client: NotificationQueryClient
  ): Promise<void> {
    await this.notifications.createAllIfAbsent(
      paymentSuccessWrites(
        context.booking.id,
        context.equipment.title,
        amount,
        context.booking.renter_id,
        context.equipment.owner_id
      ),
      client
    );
  }

  public async createOrder(bookingId: string, userId: string, isAdmin: boolean): Promise<{ payment: Payment; booking: Booking }> {
    return withTransaction(this.pool as TransactionPool, async (client) => {
      await client.query('SELECT id FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
      const context = await this.bookings.findById(bookingId, client);
      if (!context) throw new PaymentServiceError('Booking not found.', 404);
      if (context.booking.renter_id !== userId && !isAdmin) {
        throw new PaymentServiceError('Forbidden: Only the booking renter can initiate payment.', 403);
      }
      if (!['accepted', 'payment_pending'].includes(context.booking.status)) {
        throw new PaymentServiceError(`Cannot create payment order for booking in status '${context.booking.status}'. Must be 'accepted' or 'payment_pending'.`, 400);
      }
      const existing = await this.payments.listByBooking(bookingId, client);
      const reusable = existing.find((item) => ['created', 'authorized'].includes(item.status));
      if (reusable) return { payment: reusable, booking: context.booking };
      const orderId = `order_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
      const now = new Date().toISOString();
      const payment = await this.payments.create({
        id: `pay_${uuidv4().substring(0, 8)}`,
        booking_id: bookingId,
        user_id: userId,
        razorpay_order_id: orderId,
        amount: context.booking.total_price,
        currency: 'INR',
        status: 'created',
        idempotency_key: `order_init_${uuidv4()}`,
        created_at: now,
        updated_at: now,
      }, client);
      const updated = await client.query<Booking>(
        `UPDATE bookings SET status = 'payment_pending', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status IN ('accepted', 'payment_pending')
         RETURNING id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
                   base_price, platform_fee, total_price, status, notes, created_at, updated_at`,
        [bookingId]
      );
      if (!updated.rows[0]) throw new PaymentServiceError('Booking changed before payment order creation.', 409);
      return { payment, booking: updated.rows[0] };
    });
  }

  public async verify(
    orderId: string,
    paymentId: string,
    providedSignature: string,
    userId: string,
    isAdmin: boolean,
    secret: string,
    allowDemoSimulation = false
  ): Promise<{ payment: Payment; bookingStatus: string }> {
    if (!verifyPaymentSignature(orderId, paymentId, providedSignature, secret) &&
        !allowDemoSimulation) {
      throw new PaymentServiceError('Payment verification failed: invalid signature.', 400);
    }
    return withTransaction(this.pool as TransactionPool, async (client) => {
      const loaded = await this.lockBookingAndReloadPayment(orderId, client);
      if (!loaded) throw new PaymentServiceError('Payment order record not found in system.', 404);
      const { payment, context } = loaded;
      if (payment.user_id !== userId && !isAdmin) throw new PaymentServiceError('Forbidden: payment access denied.', 403);
      if (evaluatePaymentCapture(payment.status, payment.razorpay_payment_id, paymentId) === 'idempotent') {
        return { payment, bookingStatus: context.booking.status };
      }
      const updatedPayment = await this.payments.updateStatus(payment.id, payment.status, 'captured', {
        paymentId, signature: providedSignature, method: 'razorpay_checkout',
      }, client);
      if (!updatedPayment) throw new PaymentServiceError('Payment changed before verification completed.', 409);
      const booking = await client.query<Booking>(
        `UPDATE bookings SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status IN ('accepted', 'payment_pending')
         RETURNING id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
                   base_price, platform_fee, total_price, status, notes, created_at, updated_at`,
        [payment.booking_id]
      );
      if (!booking.rows[0]) throw new PaymentServiceError('Booking cannot be confirmed from its current status.', 409);
      await this.persistPaymentSuccess(context, updatedPayment.amount, client);
      return { payment: updatedPayment, bookingStatus: booking.rows[0].status };
    });
  }

  public async listPayments(bookingId: string, userId: string, isAdmin: boolean): Promise<Payment[]> {
    const context = await this.bookings.findById(bookingId);
    if (!context) throw new PaymentServiceError('Booking not found', 404);
    if (context.booking.renter_id !== userId && context.equipment.owner_id !== userId && !isAdmin) {
      throw new PaymentServiceError('Forbidden: payment access denied.', 403);
    }
    return this.payments.listByBooking(bookingId);
  }

  public async processWebhook(
    orderId: string,
    paymentId: string | undefined,
    eventType: string,
    errorCode?: string,
    errorDescription?: string
  ): Promise<void> {
    await withTransaction(this.pool as TransactionPool, async (client) => {
      const loaded = await this.lockBookingAndReloadPayment(orderId, client);
      if (!loaded) return;
      const { payment, context } = loaded;
      if (eventType === 'payment.captured') {
        if (evaluatePaymentCapture(payment.status, payment.razorpay_payment_id, paymentId) === 'idempotent') {
          return;
        }
        const updated = await this.payments.updateStatus(payment.id, payment.status, 'captured', {
          paymentId,
          method: 'razorpay_checkout',
        }, client);
        if (!updated) throw new PaymentServiceError('Payment changed before webhook processing.', 409);
        const booking = await client.query(
          `UPDATE bookings SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status IN ('accepted', 'payment_pending')
           RETURNING id`,
          [payment.booking_id]
        );
        if (booking.rows.length !== 1) {
          throw new PaymentServiceError('Booking cannot be confirmed from its current status.', 409);
        }
        await this.persistPaymentSuccess(context, payment.amount, client);
      } else if (eventType === 'payment.failed') {
        if (payment.status === 'captured' || payment.status === 'refunded' || payment.status === 'failed') {
          return;
        }
        const updated = await this.payments.updateStatus(payment.id, payment.status, 'failed', {
          errorCode: errorCode || 'PAYMENT_FAILED',
          errorDescription: errorDescription || 'Webhook reported payment failure',
        }, client);
        if (!updated) throw new PaymentServiceError('Payment changed before webhook processing.', 409);
        const reason = errorDescription || 'Webhook reported payment failure';
        await this.notifications.createIfAbsent(
          paymentFailedWrite(context.booking.id, context.equipment.title, context.booking.renter_id, reason),
          client
        );
      }
    });
  }
}
