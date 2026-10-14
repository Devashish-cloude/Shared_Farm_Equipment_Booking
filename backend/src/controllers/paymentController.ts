import { NextFunction, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { NotificationService } from '../services/notificationService.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest, Payment } from '../types/index.js';
import { config as appConfig } from '../config/env.js';
import {
  PaymentService,
  PaymentServiceError,
  evaluatePaymentCapture,
  isDemoSimulationAllowed,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../services/paymentService.js';
import { getDatabasePool } from '../db/pool.js';

function usePostgres(): boolean {
  return Boolean(appConfig.databaseUrl);
}

function paymentService(): PaymentService {
  return new PaymentService(getDatabasePool());
}

export class PaymentController {
  /**
   * Helper to verify Razorpay signature using HMAC SHA-256
   */
  public static verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string
  ): boolean {
    return verifyPaymentSignature(orderId, paymentId, signature, secret);
  }

  /**
   * Helper to generate a demo signature (for local test mode when testing without live keys)
   */
  public static generateDemoSignature(orderId: string, paymentId: string, secret: string): string {
    const text = `${orderId}|${paymentId}`;
    return crypto.createHmac('sha256', secret).update(text).digest('hex');
  }

  /**
   * POST /api/payments/create-order
   * Create Razorpay order using authoritative backend price.
   */
  public static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { bookingId } = req.body;

    if (!bookingId) {
      res.status(400).json({ success: false, error: 'bookingId is required.' });
      return;
    }

    if (usePostgres()) {
      try {
        const result = await paymentService().createOrder(bookingId, req.user!.id, Boolean(req.user!.is_admin));
        res.status(201).json({
          success: true,
          message: 'Razorpay payment order created successfully.',
          data: {
            orderId: result.payment.razorpay_order_id,
            amount: Math.round(result.booking.total_price * 100),
            currency: result.payment.currency,
            amountInRupees: result.booking.total_price,
            keyId: appConfig.razorpayKeyId,
            bookingId: result.booking.id,
            bookingSummary: {
              totalHours: result.booking.total_hours,
              hourlyRate: result.booking.hourly_rate,
              basePrice: result.booking.base_price,
              platformFee: result.booking.platform_fee,
              totalPrice: result.booking.total_price,
            },
          },
        });
      } catch (error) {
        if (error instanceof PaymentServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
      return;
    }
    const booking = store.getBookingById(bookingId);
    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found.' });
      return;
    }

    // Only renter can pay for their booking
    if (booking.renter_id !== req.user?.id && !req.user?.is_admin) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Only the booking renter can initiate payment.',
      });
      return;
    }

    // Must be in accepted or payment_pending status
    if (booking.status !== 'accepted' && booking.status !== 'payment_pending') {
      res.status(400).json({
        success: false,
        error: `Cannot create payment order for booking in status '${booking.status}'. Must be 'accepted' or 'payment_pending'.`,
      });
      return;
    }

    // Authoritative amount in paise (1 INR = 100 paise)
    // NEVER TRUST FRONTEND AMOUNT!
    const amountInPaise = Math.round(booking.total_price * 100);
    const orderReceipt = `rcpt_${booking.id.substring(0, 12)}_${Date.now()}`;
    const razorpayOrderId = `order_${uuidv4().replace(/-/g, '').substring(0, 14)}`;

    // Create Payment record
    const paymentRecord: Payment = {
      id: `pay_${uuidv4().substring(0, 8)}`,
      booking_id: booking.id,
      user_id: req.user!.id,
      razorpay_order_id: razorpayOrderId,
      amount: booking.total_price,
      currency: 'INR',
      status: 'created',
      idempotency_key: `order_init_${uuidv4()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.createPayment(paymentRecord);
    store.updateBookingStatus(booking.id, 'payment_pending');

    res.status(201).json({
      success: true,
      message: 'Razorpay payment order created successfully.',
      data: {
        orderId: razorpayOrderId,
        amount: amountInPaise,
        currency: 'INR',
        amountInRupees: booking.total_price,
        keyId: config.razorpayKeyId,
        bookingId: booking.id,
        bookingSummary: {
          totalHours: booking.total_hours,
          hourlyRate: booking.hourly_rate,
          basePrice: booking.base_price,
          platformFee: booking.platform_fee,
          totalPrice: booking.total_price,
        },
      },
    });
  }

  /**
   * POST /api/payments/verify
   * Verify Razorpay payment signature and capture payment idempotently.
   */
  public static async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, is_demo_simulated } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are mandatory.',
      });
      return;
    }

    if (usePostgres()) {
      try {
        const result = await paymentService().verify(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          req.user!.id,
          Boolean(req.user!.is_admin),
          appConfig.razorpayKeySecret,
          isDemoSimulationAllowed(Boolean(is_demo_simulated), appConfig.paymentAllowDemoSimulation)
        );
        const payment = await paymentService().listPayments(
          result.payment.booking_id,
          req.user!.id,
          Boolean(req.user!.is_admin)
        );
        res.status(200).json({
          success: true,
          message: 'Payment verified and captured successfully. Booking is now confirmed!',
          data: {
            payment: payment.find((item) => item.id === result.payment.id) || result.payment,
            bookingStatus: result.bookingStatus,
          },
        });
      } catch (error) {
        if (error instanceof PaymentServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
      return;
    }
    const payment = store.getPaymentByOrderId(razorpay_order_id);
    if (!payment) {
      res.status(404).json({
        success: false,
        error: 'Payment order record not found in system.',
      });
      return;
    }

    const booking = store.getBookingById(payment.booking_id);
    if (!booking) {
      res.status(404).json({ success: false, error: 'Associated booking not found.' });
      return;
    }

    // Cryptographic signature verification (never skipped for already-captured rows)
    const isValid = PaymentController.verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      config.razorpayKeySecret
    );

    // Demo simulation is checkout-verify only and never authenticates webhooks.
    // Invalid checkout signatures must not poison payment/booking state.
    if (!isValid && !isDemoSimulationAllowed(Boolean(is_demo_simulated), config.paymentAllowDemoSimulation)) {
      res.status(400).json({
        success: false,
        error: 'Payment verification failed: invalid signature.',
      });
      return;
    }

    try {
      const captureDecision = evaluatePaymentCapture(
        payment.status,
        payment.razorpay_payment_id,
        razorpay_payment_id
      );
      if (captureDecision === 'idempotent') {
        res.status(200).json({
          success: true,
          message: 'Payment was already verified and captured (idempotent response).',
          data: {
            payment,
            bookingStatus: booking.status,
          },
        });
        return;
      }
    } catch (error) {
      if (error instanceof PaymentServiceError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      throw error;
    }

    // Update payment record
    payment.status = 'captured';
    payment.razorpay_payment_id = razorpay_payment_id;
    payment.razorpay_signature = razorpay_signature;
    payment.payment_method = 'razorpay_checkout';
    store.updatePayment(payment);

    // Update booking status to confirmed
    store.updateBookingStatus(booking.id, 'confirmed');

    // Send notifications to both participants
    const equipment = store.getEquipmentById(booking.equipment_id);
    NotificationService.notifyPaymentSuccess(
      booking.id,
      equipment?.title || 'Farm Equipment',
      payment.amount,
      booking.renter_id,
      equipment?.owner_id || ''
    );

    res.status(200).json({
      success: true,
      message: 'Payment verified and captured successfully. Booking is now confirmed!',
      data: {
        payment,
        bookingStatus: 'confirmed',
      },
    });
  }

  /**
   * POST /api/payments/webhook
   * Handle Razorpay Webhook with raw body signature verification
   */
  public static async handleWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody;

    if (!signature || typeof signature !== 'string') {
      res.status(400).json({ success: false, error: 'Missing x-razorpay-signature header' });
      return;
    }

    if (typeof rawBody !== 'string') {
      res.status(400).json({ success: false, error: 'Missing raw webhook body for signature verification' });
      return;
    }

    // Always verify HMAC against the raw body. Demo payment simulation must not bypass this.
    if (!verifyWebhookSignature(rawBody, signature, config.razorpayWebhookSecret)) {
      res.status(400).json({ success: false, error: 'Invalid webhook signature' });
      return;
    }

    const event = req.body;
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      res.status(200).json({ success: true, message: 'Event ignored: no payment entity.' });
      return;
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    if (orderId && usePostgres()) {
      try {
        await paymentService().processWebhook(
          orderId,
          paymentId,
          eventType,
          paymentEntity.error_code,
          paymentEntity.error_description
        );
      } catch (error) {
        if (error instanceof PaymentServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
        return;
      }
    } else if (orderId) {
      const payment = store.getPaymentByOrderId(orderId);
      if (payment) {
        if (eventType === 'payment.captured') {
          try {
            const captureDecision = evaluatePaymentCapture(
              payment.status,
              payment.razorpay_payment_id,
              paymentId
            );
            if (captureDecision === 'apply') {
              payment.status = 'captured';
              payment.razorpay_payment_id = paymentId;
              store.updatePayment(payment);
              store.updateBookingStatus(payment.booking_id, 'confirmed');

              const booking = store.getBookingById(payment.booking_id);
              const equipment = booking ? store.getEquipmentById(booking.equipment_id) : undefined;
              if (booking && equipment) {
                NotificationService.notifyPaymentSuccess(
                  booking.id,
                  equipment.title,
                  payment.amount,
                  booking.renter_id,
                  equipment.owner_id
                );
              }
            }
          } catch (error) {
            if (error instanceof PaymentServiceError) {
              res.status(error.status).json({ success: false, error: error.message });
              return;
            }
            throw error;
          }
        } else if (eventType === 'payment.failed' && payment.status !== 'captured' && payment.status !== 'refunded') {
          if (payment.status !== 'failed') {
            payment.status = 'failed';
            payment.error_code = paymentEntity.error_code || 'PAYMENT_FAILED';
            payment.error_description = paymentEntity.error_description || 'Webhook reported payment failure';
            store.updatePayment(payment);
            const booking = store.getBookingById(payment.booking_id);
            const equipment = booking ? store.getEquipmentById(booking.equipment_id) : undefined;
            if (booking) {
              NotificationService.notifyPaymentFailed(
                booking.id,
                equipment?.title || 'Farm Equipment',
                booking.renter_id,
                payment.error_description
              );
            }
          }
        }
      }
    }

    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  }

  /**
   * Helper endpoint: GET /api/payments/booking/:bookingId
   * Retrieve payment history for a specific booking
   */
  public static async getBookingPayments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    if (usePostgres()) {
      try {
        const payments = await paymentService().listPayments(
          req.params.bookingId,
          req.user!.id,
          Boolean(req.user!.is_admin)
        );
        res.status(200).json({ success: true, data: { payments } });
      } catch (error) {
        if (error instanceof PaymentServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
      return;
    }
    const { bookingId } = req.params;
    const booking = store.getBookingById(bookingId);
    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    const payments = store.getPaymentsByBookingId(bookingId);
    res.status(200).json({ success: true, data: { payments } });
  }
}
