import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or backend folder
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'shared_farm_jwt_super_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_placeholder_secret',
  trackingStaleThresholdMinutes: parseInt(process.env.TRACKING_STALE_THRESHOLD_MINUTES || '5', 10),
};
