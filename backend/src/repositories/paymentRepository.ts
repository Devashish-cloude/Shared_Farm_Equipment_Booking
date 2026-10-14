import { QueryResultRow } from 'pg';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { Payment, PaymentStatus } from '../types/index.js';

type PaymentRow = {
  id: string;
  booking_id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  error_code: string | null;
  error_description: string | null;
  idempotency_key: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export interface PaymentQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    booking_id: row.booking_id,
    user_id: row.user_id,
    razorpay_order_id: row.razorpay_order_id,
    razorpay_payment_id: row.razorpay_payment_id ?? undefined,
    razorpay_signature: row.razorpay_signature ?? undefined,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    payment_method: row.payment_method ?? undefined,
    error_code: row.error_code ?? undefined,
    error_description: row.error_description ?? undefined,
    idempotency_key: row.idempotency_key ?? undefined,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

const columns = `id, booking_id, user_id, razorpay_order_id, razorpay_payment_id,
  razorpay_signature, amount, currency, status, payment_method, error_code,
  error_description, idempotency_key, created_at, updated_at`;

export class PaymentRepository {
  private readonly pool: DatabasePool;
  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
  }

  public async findByOrderId(orderId: string, client: PaymentQueryClient = this.pool): Promise<Payment | undefined> {
    const result = await client.query<PaymentRow>(
      `SELECT ${columns} FROM payments WHERE razorpay_order_id = $1`,
      [orderId]
    );
    return result.rows[0] ? mapPayment(result.rows[0]) : undefined;
  }

  public async findById(id: string, client: PaymentQueryClient = this.pool): Promise<Payment | undefined> {
    const result = await client.query<PaymentRow>(
      `SELECT ${columns} FROM payments WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? mapPayment(result.rows[0]) : undefined;
  }

  public async listByBooking(bookingId: string, client: PaymentQueryClient = this.pool): Promise<Payment[]> {
    const result = await client.query<PaymentRow>(
      `SELECT ${columns} FROM payments WHERE booking_id = $1 ORDER BY created_at DESC`,
      [bookingId]
    );
    return result.rows.map(mapPayment);
  }

  public async create(payment: Payment, client: PaymentQueryClient): Promise<Payment> {
    const result = await client.query<PaymentRow>(
      `INSERT INTO payments
       (id, booking_id, user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature,
        amount, currency, status, payment_method, error_code, error_description,
        idempotency_key, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING ${columns}`,
      [
        payment.id, payment.booking_id, payment.user_id, payment.razorpay_order_id,
        payment.razorpay_payment_id ?? null, payment.razorpay_signature ?? null,
        payment.amount, payment.currency, payment.status, payment.payment_method ?? null,
        payment.error_code ?? null, payment.error_description ?? null,
        payment.idempotency_key ?? null, payment.created_at, payment.updated_at,
      ]
    );
    return mapPayment(result.rows[0]);
  }

  public async updateStatus(
    id: string,
    from: PaymentStatus,
    to: PaymentStatus,
    fields: { paymentId?: string; signature?: string; method?: string; errorCode?: string; errorDescription?: string },
    client: PaymentQueryClient
  ): Promise<Payment | undefined> {
    const result = await client.query<PaymentRow>(
      `UPDATE payments
       SET status = $3, razorpay_payment_id = COALESCE($4, razorpay_payment_id),
           razorpay_signature = COALESCE($5, razorpay_signature),
           payment_method = COALESCE($6, payment_method),
           error_code = $7, error_description = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = $2
       RETURNING ${columns}`,
      [id, from, to, fields.paymentId ?? null, fields.signature ?? null, fields.method ?? null,
        fields.errorCode ?? null, fields.errorDescription ?? null]
    );
    return result.rows[0] ? mapPayment(result.rows[0]) : undefined;
  }
}
