import { createApp } from './app.js';
import { config } from './config/env.js';
import { shutdownDatabasePool } from './db/pool.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🌾 SHARED FARM BACKEND API`);
  console.log(`🚀 Running at: http://localhost:${config.port}`);
  console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
  console.log(`🔒 Razorpay Mode: Test Sandbox (${config.razorpayKeyId})`);
  console.log(`⏱️ Telemetry Stale Threshold: ${config.trackingStaleThresholdMinutes} minutes`);
  console.log(`=======================================================`);
});

let shutdownStarted = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shutdownStarted) {
    console.warn(`[Server] Shutdown already in progress; ignoring ${signal}.`);
    return;
  }

  shutdownStarted = true;
  console.log(`[Server] Received ${signal}; shutting down.`);

  let shutdownFailed = false;
  await new Promise<void>((resolve) => {
    try {
      server.close((error?: Error) => {
        if (error) {
          shutdownFailed = true;
          console.error('[Server] HTTP server shutdown failed:', error);
        }
        resolve();
      });
    } catch (error) {
      shutdownFailed = true;
      console.error('[Server] HTTP server shutdown failed:', error);
      resolve();
    }
  });

  try {
    await shutdownDatabasePool();
  } catch (error) {
    shutdownFailed = true;
    console.error('[Server] Database pool shutdown failed:', error);
  }

  process.exitCode = shutdownFailed ? 1 : 0;
  if (shutdownFailed) {
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
