import { Router } from 'express';
import { TrackingController } from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Rental Session Management
router.post('/rental-sessions/:bookingId/start', authenticate, TrackingController.startSession);
router.post('/rental-sessions/:bookingId/end', authenticate, TrackingController.endSession);

// Location Telemetry Ingestion and Queries
router.post('/tracking/location', authenticate, TrackingController.ingestLocation);
router.get('/tracking/bookings/:bookingId/latest', authenticate, TrackingController.getLatestLocation);
router.get('/tracking/bookings/:bookingId/history', authenticate, TrackingController.getLocationHistory);

export default router;
