import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { store } from '../services/store.js';
import { config } from '../config/env.js';

const app = createApp();

// Generate auth tokens for testing
const amitToken = jwt.sign(
  { id: 'user_amit', email: 'amit@example.com', full_name: 'Amit Patel', is_admin: false },
  config.jwtSecret
);
const _rahulToken = jwt.sign(
  { id: 'user_rahul', email: 'rahul@example.com', full_name: 'Rahul Sharma', is_admin: false },
  config.jwtSecret
);
const outsiderToken = jwt.sign(
  { id: 'user_outsider', email: 'outsider@example.com', full_name: 'Stranger', is_admin: false },
  config.jwtSecret
);

describe('PERSON 3 MODULES — INTEGRATION & QA TESTS', () => {
  beforeEach(() => {
    store.reset();
  });

  // ============================================================================
  // MODULE A: RENTAL SESSIONS & EQUIPMENT TRACKING
  // ============================================================================
  describe('Module A: Rental Sessions & Telemetry Tracking', () => {
    it('should start rental session for confirmed booking and activate tracking', async () => {
      const res = await request(app)
        .post('/api/rental-sessions/booking_demo_confirmed/start')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({ notes: 'Starting early morning plowing' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.session_status).toBe('active');
      expect(res.body.data.bookingStatus).toBe('in_progress');

      // Check notification sent to owner
      const rahulNotifs = store.getNotificationsByUserId('user_rahul');
      expect(rahulNotifs.some((n) => n.type === 'rental_started')).toBe(true);
    });

    it('should reject starting rental session if booking is not confirmed', async () => {
      const res = await request(app)
        .post('/api/rental-sessions/booking_demo_accepted/start')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("must be 'confirmed'");
    });

    it('should reject start request from unauthorized user (ownership check)', async () => {
      const res = await request(app)
        .post('/api/rental-sessions/booking_demo_confirmed/start')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should record location telemetry points for active session', async () => {
      // Start session first
      await request(app)
        .post('/api/rental-sessions/booking_demo_confirmed/start')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({});

      // Ingest location update
      const locRes = await request(app)
        .post('/api/tracking/location')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_confirmed',
          latitude: 20.1995,
          longitude: 73.8355,
          source: 'simulated_gps',
          speed_kmh: 12.5,
          heading_deg: 45.0,
        });

      expect(locRes.status).toBe(201);
      expect(locRes.body.success).toBe(true);
      expect(locRes.body.data.point.latitude).toBe(20.1995);
      expect(locRes.body.data.point.source).toBe('simulated_gps');
    });

    it('should retrieve latest location and verify privacy protection', async () => {
      // Start session and ingest point
      await request(app)
        .post('/api/rental-sessions/booking_demo_confirmed/start')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({});

      await request(app)
        .post('/api/tracking/location')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_confirmed',
          latitude: 20.201,
          longitude: 73.837,
          source: 'device_gps',
        });

      // Authorized renter accesses latest location
      const authRes = await request(app)
        .get('/api/tracking/bookings/booking_demo_confirmed/latest')
        .set('Authorization', `Bearer ${amitToken}`);

      expect(authRes.status).toBe(200);
      expect(authRes.body.success).toBe(true);
      expect(authRes.body.data.latestLocation.latitude).toBe(20.201);
      expect(authRes.body.data.isStale).toBe(false);

      // Unauthorized outsider is blocked with 403
      const unauthRes = await request(app)
        .get('/api/tracking/bookings/booking_demo_confirmed/latest')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(unauthRes.status).toBe(403);
    });

    it('should end rental session and stop active tracking', async () => {
      // Start session
      await request(app)
        .post('/api/rental-sessions/booking_demo_confirmed/start')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({});

      // End session
      const endRes = await request(app)
        .post('/api/rental-sessions/booking_demo_confirmed/end')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({ notes: 'Work finished, tractor returned safely.' });

      expect(endRes.status).toBe(200);
      expect(endRes.body.success).toBe(true);
      expect(endRes.body.data.session.session_status).toBe('completed');
      expect(endRes.body.data.bookingStatus).toBe('completed');

      // Ingesting new location after session ended must fail
      const postEndLocRes = await request(app)
        .post('/api/tracking/location')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_confirmed',
          latitude: 20.205,
          longitude: 73.84,
          source: 'simulated_gps',
        });

      expect(postEndLocRes.status).toBe(400);
      expect(postEndLocRes.body.error).toContain('No active rental session');
    });
  });

  // ============================================================================
  // MODULE B: RAZORPAY PAYMENTS
  // ============================================================================
  describe('Module B: Razorpay Payments & Verification', () => {
    it('should create payment order with authoritative backend amount', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({ bookingId: 'booking_demo_accepted' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amountInRupees).toBe(3780.0);
      expect(res.body.data.amount).toBe(378000); // In paise
      expect(res.body.data.orderId).toMatch(/^order_/);
    });

    it('should verify payment with valid cryptographic signature and confirm booking', async () => {
      // Create order first
      const orderRes = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({ bookingId: 'booking_demo_accepted' });

      const orderId = orderRes.body.data.orderId;
      const paymentId = 'pay_test_payment_12345';
      const text = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', config.razorpayKeySecret)
        .update(text)
        .digest('hex');

      // Verify payment
      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.bookingStatus).toBe('confirmed');
      expect(verifyRes.body.data.payment.status).toBe('captured');
    });

    it('should reject payment with invalid signature', async () => {
      const orderRes = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({ bookingId: 'booking_demo_accepted' });

      const orderId = orderRes.body.data.orderId;

      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: 'pay_tampered_999',
          razorpay_signature: 'invalid_forged_signature_hex',
        });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.success).toBe(false);
      expect(verifyRes.body.error).toContain('invalid signature');
    });

    it('should handle repeated verification calls idempotently without duplicate status transitions', async () => {
      const orderRes = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({ bookingId: 'booking_demo_accepted' });

      const orderId = orderRes.body.data.orderId;
      const paymentId = 'pay_idempotent_test_1';
      const validSignature = crypto
        .createHmac('sha256', config.razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // First verification
      const firstRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });
      expect(firstRes.status).toBe(200);

      // Duplicate verification call
      const secondRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.message).toContain('idempotent');
    });
  });

  // ============================================================================
  // MODULE C: IN-APP NOTIFICATIONS
  // ============================================================================
  describe('Module C: In-app Notifications', () => {
    it('should list notifications and unread count for user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${amitToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
      expect(typeof res.body.data.unreadCount).toBe('number');
    });

    it('should mark notification as read and decrement unread count', async () => {
      const notifId = 'notif_1';
      const patchRes = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${amitToken}`);

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.notification.is_read).toBe(true);
    });
  });

  // ============================================================================
  // MODULE D: REVIEWS & RATINGS
  // ============================================================================
  describe('Module D: Reviews & Ratings', () => {
    it('should allow renter to review completed rental', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_completed',
          rating: 5,
          comment: 'Outstanding tractor condition and very helpful owner!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.rating).toBe(5);
      expect(res.body.data.review.review_type).toBe('renter_to_owner');
    });

    it('should reject review if rental is not yet completed', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_confirmed',
          rating: 4,
          comment: 'Good machine so far',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('only be submitted after a rental is completed');
    });

    it('should prevent duplicate reviews for the same booking and reviewer', async () => {
      // First review
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_completed',
          rating: 5,
          comment: 'First great review submission',
        });

      // Second review by same user on same booking
      const duplicateRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_completed',
          rating: 4,
          comment: 'Attempting duplicate review',
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error).toContain('Duplicate reviews are not permitted');
    });

    it('should validate rating range (reject < 1 or > 5)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_completed',
          rating: 6,
          comment: 'Invalid 6 star rating',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Rating must be an integer between 1 and 5');
    });

    it('should fetch equipment reviews with aggregate ratings', async () => {
      // Submit a review
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${amitToken}`)
        .send({
          bookingId: 'booking_demo_completed',
          rating: 5,
          comment: 'Smooth and powerful engine!',
        });

      const res = await request(app)
        .get('/api/equipment/eq_tractor_rahul/reviews');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviews.length).toBeGreaterThan(0);
      expect(res.body.data.ratingAvg).toBe(5);
    });
  });
});
