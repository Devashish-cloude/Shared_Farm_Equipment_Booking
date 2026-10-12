import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🌾 SHARED FARM BACKEND API`);
  console.log(`🚀 Running at: http://localhost:${config.port}`);
  console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
  console.log(`🔒 Razorpay Mode: Test Sandbox (${config.razorpayKeyId})`);
  console.log(`⏱️ Telemetry Stale Threshold: ${config.trackingStaleThresholdMinutes} minutes`);
  console.log(`=======================================================`);
});
