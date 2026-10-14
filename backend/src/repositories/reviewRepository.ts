import { QueryResultRow } from 'pg';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { Review, ReviewType } from '../types/index.js';

type ReviewRow = {
  id: string; booking_id: string; equipment_id: string; reviewer_id: string;
  reviewee_id: string; rating: number; comment: string; review_type: ReviewType;
  created_at: Date | string; updated_at: Date | string; reviewer_name?: string | null;
};

export interface ReviewQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

const columns = `id, booking_id, equipment_id, reviewer_id, reviewee_id, rating,
  comment, review_type, created_at, updated_at`;

function mapReview(row: ReviewRow): Review & { reviewerName?: string } {
  return {
    id: row.id, booking_id: row.booking_id, equipment_id: row.equipment_id,
    reviewer_id: row.reviewer_id, reviewee_id: row.reviewee_id, rating: Number(row.rating),
    comment: row.comment, review_type: row.review_type,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    ...(row.reviewer_name ? { reviewerName: row.reviewer_name } : {}),
  };
}

export class ReviewRepository {
  private readonly pool: DatabasePool;
  public constructor(pool: DatabasePool = getDatabasePool()) { this.pool = pool; }

  public async findByBookingAndReviewer(
    bookingId: string, reviewerId: string, client: ReviewQueryClient = this.pool
  ): Promise<Review | undefined> {
    const result = await client.query<ReviewRow>(
      `SELECT ${columns} FROM reviews WHERE booking_id = $1 AND reviewer_id = $2`,
      [bookingId, reviewerId]
    );
    return result.rows[0] ? mapReview(result.rows[0]) : undefined;
  }

  public async listByEquipment(
    equipmentId: string, client: ReviewQueryClient = this.pool
  ): Promise<Array<Review & { reviewerName?: string }>> {
    const result = await client.query<ReviewRow>(
      `SELECT ${columns}, u.full_name AS reviewer_name
       FROM reviews r INNER JOIN users u ON u.id = r.reviewer_id
       WHERE r.equipment_id = $1 ORDER BY r.created_at DESC`,
      [equipmentId]
    );
    return result.rows.map(mapReview);
  }

  public async create(review: Review, client: ReviewQueryClient): Promise<Review> {
    const result = await client.query<ReviewRow>(
      `INSERT INTO reviews
       (id, booking_id, equipment_id, reviewer_id, reviewee_id, rating, comment,
        review_type, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING ${columns}`,
      [review.id, review.booking_id, review.equipment_id, review.reviewer_id,
        review.reviewee_id, review.rating, review.comment, review.review_type,
        review.created_at, review.updated_at]
    );
    return mapReview(result.rows[0]);
  }

  public async aggregate(equipmentId: string, client: ReviewQueryClient): Promise<{ avg: number; count: number }> {
    const result = await client.query<{ avg: string | number | null; count: string }>(
      `SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg,
              COUNT(*)::text AS count FROM reviews WHERE equipment_id = $1`,
      [equipmentId]
    );
    return { avg: Number(result.rows[0]?.avg ?? 0), count: Number(result.rows[0]?.count ?? 0) };
  }
}
