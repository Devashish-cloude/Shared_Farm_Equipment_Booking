import { v4 as uuidv4 } from 'uuid';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { TransactionPool, withTransaction } from '../db/transaction.js';
import { BookingRepository } from '../repositories/bookingRepository.js';
import { ReviewRepository } from '../repositories/reviewRepository.js';
import { Review, ReviewType } from '../types/index.js';

export class ReviewServiceError extends Error {
  public constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ReviewServiceError';
  }
}

export class ReviewService {
  private readonly pool: DatabasePool;
  private readonly bookings: BookingRepository;
  private readonly reviews: ReviewRepository;
  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
    this.bookings = new BookingRepository(pool);
    this.reviews = new ReviewRepository(pool);
  }

  public async create(
    bookingId: string, reviewerId: string, isAdmin: boolean, rating: number, comment: string
  ): Promise<{ review: Review; aggregate: { avg: number; count: number } }> {
    return withTransaction(this.pool as TransactionPool, async (client) => {
      const context = await this.bookings.findById(bookingId, client);
      if (!context) throw new ReviewServiceError('Booking not found.', 404);
      await client.query(
        'SELECT id FROM equipment WHERE id = $1 FOR UPDATE',
        [context.equipment.id]
      );
      if (context.booking.status !== 'completed') {
        throw new ReviewServiceError(
          `Reviews can only be submitted after a rental is completed. Current booking status is '${context.booking.status}'.`,
          400
        );
      }
      const isRenter = context.booking.renter_id === reviewerId;
      const isOwner = context.equipment.owner_id === reviewerId;
      if (!isRenter && !isOwner && !isAdmin) {
        throw new ReviewServiceError('Forbidden: You were not a participant in this rental.', 403);
      }
      const reviewType: ReviewType = isRenter ? 'renter_to_owner' : 'owner_to_renter';
      const revieweeId = isRenter ? context.equipment.owner_id : context.booking.renter_id;
      if (await this.reviews.findByBookingAndReviewer(bookingId, reviewerId, client)) {
        throw new ReviewServiceError('You have already submitted a review for this booking. Duplicate reviews are not permitted.', 409);
      }
      const now = new Date().toISOString();
      let review: Review;
      try {
        review = await this.reviews.create({
          id: `rev_${uuidv4().substring(0, 8)}`,
          booking_id: bookingId,
          equipment_id: context.equipment.id,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating,
          comment,
          review_type: reviewType,
          created_at: now,
          updated_at: now,
        }, client);
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          throw new ReviewServiceError('You have already submitted a review for this booking. Duplicate reviews are not permitted.', 409);
        }
        throw error;
      }
      const aggregate = await this.reviews.aggregate(context.equipment.id, client);
      const updated = await client.query(
        `UPDATE equipment SET rating_avg = $2, rating_count = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING id`,
        [context.equipment.id, aggregate.avg, aggregate.count]
      );
      if (updated.rows.length !== 1) throw new ReviewServiceError('Equipment rating update failed.', 500);
      return { review, aggregate };
    });
  }

  public async list(equipmentId: string): Promise<{
    reviews: Array<Review & { reviewerName?: string }>;
    aggregate: { avg: number; count: number };
  }> {
    const reviews = await this.reviews.listByEquipment(equipmentId);
    const aggregate = await this.reviews.aggregate(equipmentId, this.pool);
    return { reviews, aggregate };
  }
}
