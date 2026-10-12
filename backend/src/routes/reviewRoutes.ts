import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/reviews', authenticate, ReviewController.createReview);
router.get('/equipment/:equipmentId/reviews', ReviewController.getEquipmentReviews);

export default router;
