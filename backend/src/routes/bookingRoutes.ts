import { Router } from 'express';
import { BookingController } from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, BookingController.createBooking);
router.get('/my-rentals', authenticate, BookingController.getMyRentals);
router.get('/my-equipment', authenticate, BookingController.getMyEquipment);
router.get('/:id', authenticate, BookingController.getBookingById);
router.patch('/:id/status', authenticate, BookingController.updateBookingStatus);

export default router;
