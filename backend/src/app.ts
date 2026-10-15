import express, { Request, Response, NextFunction } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

export function attachJsonRawBody(
  req: IncomingMessage & { rawBody?: string },
  _res: ServerResponse,
  buf: Buffer
): void {
  req.rawBody = buf.toString('utf8');
}

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());

  // JSON parser with rawBody preservation for Razorpay webhook HMAC. Must run before routes.
  app.use(
    express.json({
      verify: attachJsonRawBody,
    })
  );

  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      service: 'Shared Farm Equipment Booking API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      modules: {
        rentalSessions: 'active',
        equipmentTracking: 'active',
        razorpayPayments: 'active',
        notifications: 'active',
        reviews: 'active',
      },
    });
  });

  // Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/equipment', equipmentRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api', trackingRoutes);
  app.use('/api', paymentRoutes);
  app.use('/api', notificationRoutes);
  app.use('/api', reviewRoutes);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
    });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Error]:', err);
    const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500
      ? err.status
      : 500;
    res.status(status).json({
      success: false,
      error: status === 500 ? 'Internal server error' : err.message,
    });
  });

  return app;
};

export default createApp;
