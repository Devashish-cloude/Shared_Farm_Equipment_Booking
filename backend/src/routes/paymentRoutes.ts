import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Order creation with authoritative backend pricing
router.post('/payments/create-order', authenticate, PaymentController.createOrder);

// Payment verification and signature validation
router.post('/payments/verify', authenticate, PaymentController.verifyPayment);

// Razorpay Webhook listener (Public, verified via cryptographic header)
router.post('/payments/webhook', PaymentController.handleWebhook);

// Payment history for a booking
router.get('/payments/booking/:bookingId', authenticate, PaymentController.getBookingPayments);

export default router;
