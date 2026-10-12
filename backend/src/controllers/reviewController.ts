import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { AuthenticatedRequest, Review, ReviewType } from '../types/index.js';

export class ReviewController {
  /**
   * POST /api/reviews
   * Submit a review for a completed rental booking.
   */
  public static createReview(req: AuthenticatedRequest, res: Response): void {
    const { bookingId, rating, comment } = req.body;
    const currentUserId = req.user!.id;

    if (!bookingId || rating === undefined || !comment) {
      res.status(400).json({
        success: false,
        error: 'bookingId, rating, and comment are required.',
      });
      return;
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({
        success: false,
        error: 'Rating must be an integer between 1 and 5.',
      });
      return;
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 5) {
      res.status(400).json({
        success: false,
        error: 'Review comment must be at least 5 characters long.',
      });
      return;
    }

    // Check booking existence
    const booking = store.getBookingById(bookingId);
    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found.' });
      return;
    }

    // Backend validation: Rental must be completed!
    if (booking.status !== 'completed') {
      res.status(400).json({
        success: false,
        error: `Reviews can only be submitted after a rental is completed. Current booking status is '${booking.status}'.`,
      });
      return;
    }

    const equipment = store.getEquipmentById(booking.equipment_id);
    if (!equipment) {
      res.status(404).json({ success: false, error: 'Associated equipment not found.' });
      return;
    }

    // Check participation and determine review type
    const isRenter = currentUserId === booking.renter_id;
    const isOwner = currentUserId === equipment.owner_id;

    if (!isRenter && !isOwner && !req.user?.is_admin) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: You were not a participant in this rental.',
      });
      return;
    }

    const reviewType: ReviewType = isRenter ? 'renter_to_owner' : 'owner_to_renter';
    const revieweeId = isRenter ? equipment.owner_id : booking.renter_id;

    // Check duplicate review
    const existingReview = store.getReviewByBookingAndReviewer(booking.id, currentUserId);
    if (existingReview) {
      res.status(409).json({
        success: false,
        error: 'You have already submitted a review for this booking. Duplicate reviews are not permitted.',
      });
      return;
    }

    // Create review
    const review: Review = {
      id: `rev_${uuidv4().substring(0, 8)}`,
      booking_id: booking.id,
      equipment_id: equipment.id,
      reviewer_id: currentUserId,
      reviewee_id: revieweeId,
      rating: numRating,
      comment: trimmedComment,
      review_type: reviewType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.createReview(review);

    // Re-calculate aggregate rating for the equipment
    const { avg, count } = store.calculateEquipmentRating(equipment.id);
    store.updateEquipmentRating(equipment.id, avg, count);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Thank you for your feedback!',
      data: {
        review,
        equipmentAggregate: {
          ratingAvg: avg,
          ratingCount: count,
        },
      },
    });
  }

  /**
   * GET /api/equipment/:equipmentId/reviews
   * Fetch all reviews and aggregate ratings for an equipment listing.
   */
  public static getEquipmentReviews(req: AuthenticatedRequest, res: Response): void {
    const { equipmentId } = req.params;

    const equipment = store.getEquipmentById(equipmentId);
    if (!equipment) {
      res.status(404).json({ success: false, error: 'Equipment not found.' });
      return;
    }

    const reviews = store.getReviewsByEquipmentId(equipmentId);
    const enrichedReviews = reviews.map((r) => {
      const reviewer = store.getUserById(r.reviewer_id);
      return {
        ...r,
        reviewerName: reviewer ? reviewer.full_name : 'Verified Farmer',
      };
    });

    const { avg, count } = store.calculateEquipmentRating(equipmentId);

    res.status(200).json({
      success: true,
      data: {
        equipmentId,
        equipmentTitle: equipment.title,
        ratingAvg: avg || equipment.rating_avg,
        ratingCount: count || equipment.rating_count,
        reviews: enrichedReviews,
      },
    });
  }
}
