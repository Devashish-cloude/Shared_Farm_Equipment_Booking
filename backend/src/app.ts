import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());

  // JSON parser with rawBody preservation for Razorpay webhook cryptographic checks
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
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
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  return app;
};

export default createApp;
