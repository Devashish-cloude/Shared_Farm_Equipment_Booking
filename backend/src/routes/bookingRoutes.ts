import { Router } from 'express';
import { BookingController } from '../controllers/bookingController.js';
import { TrackingController } from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, BookingController.createBooking);
router.get('/my-rentals', authenticate, BookingController.getMyRentals);
router.get('/my-equipment', authenticate, BookingController.getMyEquipment);
router.get('/incoming-requests', authenticate, BookingController.getMyEquipment);
router.get('/:id', authenticate, BookingController.getBookingById);
router.patch('/:id/status', authenticate, BookingController.updateBookingStatus);

router.patch('/:id/accept', authenticate, (req, res, next) => {
  req.body = { ...req.body, status: 'accepted' };
  BookingController.updateBookingStatus(req, res, next);
});

router.patch('/:id/reject', authenticate, (req, res, next) => {
  req.body = { ...req.body, status: 'rejected' };
  BookingController.updateBookingStatus(req, res, next);
});

router.patch('/:id/cancel', authenticate, (req, res, next) => {
  req.body = { ...req.body, status: 'cancelled' };
  BookingController.updateBookingStatus(req, res, next);
});

router.patch('/:id/start', authenticate, (req, res, next) => {
  req.params.bookingId = req.params.id;
  TrackingController.startSession(req, res, next);
});

router.patch('/:id/end', authenticate, (req, res, next) => {
  req.params.bookingId = req.params.id;
  TrackingController.endSession(req, res, next);
});

export default router;
