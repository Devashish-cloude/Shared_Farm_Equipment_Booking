import { QueryResultRow } from 'pg';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { RentalSession, SessionStatus } from '../types/index.js';

type SessionRow = {
  id: string;
  booking_id: string;
  started_by: string;
  start_time: Date | string;
  end_time: Date | string | null;
  session_status: SessionStatus;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export interface SessionQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
}

const columns = `id, booking_id, started_by, start_time, end_time,
  session_status, notes, created_at, updated_at`;

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapSession(row: SessionRow): RentalSession {
  return {
    id: row.id,
    booking_id: row.booking_id,
    started_by: row.started_by,
    start_time: iso(row.start_time),
    end_time: row.end_time === null ? undefined : iso(row.end_time),
    session_status: row.session_status,
    notes: row.notes ?? undefined,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

export class RentalSessionRepository {
  private readonly pool: DatabasePool;

  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
  }

  public async findActive(bookingId: string, client: SessionQueryClient = this.pool): Promise<RentalSession | undefined> {
    const result = await client.query<SessionRow>(
      `SELECT ${columns} FROM rental_sessions
       WHERE booking_id = $1 AND session_status = 'active'
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [bookingId]
    );
    return result.rows[0] ? mapSession(result.rows[0]) : undefined;
  }

  public async listByBooking(bookingId: string, client: SessionQueryClient = this.pool): Promise<RentalSession[]> {
    const result = await client.query<SessionRow>(
      `SELECT ${columns} FROM rental_sessions WHERE booking_id = $1 ORDER BY created_at`,
      [bookingId]
    );
    return result.rows.map(mapSession);
  }

  public async create(session: RentalSession, client: SessionQueryClient): Promise<RentalSession> {
    const result = await client.query<SessionRow>(
      `INSERT INTO rental_sessions
       (id, booking_id, started_by, start_time, end_time, session_status, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING ${columns}`,
      [
        session.id, session.booking_id, session.started_by, session.start_time,
        session.end_time ?? null, session.session_status, session.notes ?? null,
        session.created_at, session.updated_at,
      ]
    );
    return mapSession(result.rows[0]);
  }

  public async complete(
    id: string,
    notes: string | undefined,
    client: SessionQueryClient
  ): Promise<RentalSession | undefined> {
    const result = await client.query<SessionRow>(
      `UPDATE rental_sessions
       SET session_status = 'completed', end_time = CURRENT_TIMESTAMP,
           notes = CASE WHEN $2::text IS NULL THEN notes
                        ELSE CONCAT(COALESCE(notes, ''), CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' | ' END, 'End note: ', $2)
                   END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND session_status = 'active'
       RETURNING ${columns}`,
      [id, notes ?? null]
    );
    return result.rows[0] ? mapSession(result.rows[0]) : undefined;
  }
}
