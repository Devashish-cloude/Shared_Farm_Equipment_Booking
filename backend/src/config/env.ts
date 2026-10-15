import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or backend folder
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const DEFAULT_JWT_SECRET = 'shared_farm_jwt_super_secret_key_2026';

export function validateJwtSecret(nodeEnv: string, secret: string | undefined): string {
  if (nodeEnv === 'production' && (!secret || secret === DEFAULT_JWT_SECRET)) {
    throw new Error('JWT_SECRET must be explicitly configured in production.');
  }
  return secret || DEFAULT_JWT_SECRET;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL,
  databasePoolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  databaseIdleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '10000', 10),
  databaseConnectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
  databaseSsl: process.env.DB_SSL === 'true',
  databaseSslRejectUnauthorized:
    process.env.NODE_ENV === 'production' ||
    process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  databaseMigrationLockKey: process.env.DB_MIGRATION_LOCK_KEY || 'shared-farm-schema-migrations',
  jwtSecret: validateJwtSecret(nodeEnv, process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_placeholder_secret',
  paymentAllowDemoSimulation:
    process.env.PAYMENT_ALLOW_DEMO_SIMULATION === 'true' &&
    (process.env.NODE_ENV || 'development') !== 'production',
  demoAuthAllowHeader:
    process.env.DEMO_AUTH_ALLOW_HEADER === 'true' &&
    (process.env.NODE_ENV || 'development') !== 'production',
  trackingStaleThresholdMinutes: parseInt(process.env.TRACKING_STALE_THRESHOLD_MINUTES || '5', 10),
};
