import { QueryResultRow } from 'pg';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { EquipmentTracking, TrackingSource } from '../types/index.js';

type TrackingRow = {
  id: string;
  session_id: string;
  booking_id: string;
  latitude: string | number;
  longitude: string | number;
  source: TrackingSource;
  speed_kmh: string | number | null;
  heading_deg: string | number | null;
  recorded_at: Date | string;
  created_at: Date | string;
};

export interface TrackingQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapPoint(row: TrackingRow): EquipmentTracking {
  return {
    id: row.id,
    session_id: row.session_id,
    booking_id: row.booking_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    source: row.source,
    speed_kmh: row.speed_kmh === null ? undefined : Number(row.speed_kmh),
    heading_deg: row.heading_deg === null ? undefined : Number(row.heading_deg),
    recorded_at: iso(row.recorded_at),
    created_at: iso(row.created_at),
  };
}

const columns = `id, session_id, booking_id, latitude, longitude, source,
  speed_kmh, heading_deg, recorded_at, created_at`;

export class TrackingRepository {
  private readonly pool: DatabasePool;

  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
  }

  public async create(point: EquipmentTracking, client: TrackingQueryClient): Promise<EquipmentTracking> {
    const result = await client.query<TrackingRow>(
      `INSERT INTO equipment_tracking
       (id, session_id, booking_id, latitude, longitude, source, speed_kmh, heading_deg, recorded_at, created_at)
       SELECT $1::varchar(64),$2::varchar(64),$3::varchar(64),$4::numeric,$5::numeric,$6::varchar(50),$7::numeric,$8::numeric,$9::timestamptz,$10::timestamptz
       WHERE EXISTS (
         SELECT 1 FROM rental_sessions
         WHERE id = $2 AND booking_id = $3 AND session_status = 'active'
       )
       RETURNING ${columns}`,
      [
        point.id, point.session_id, point.booking_id, point.latitude, point.longitude,
        point.source, point.speed_kmh ?? 0, point.heading_deg ?? 0,
        point.recorded_at, point.created_at,
      ]
    );
    if (!result.rows[0]) {
      throw new Error('Tracking session is not active or does not belong to the booking.');
    }
    return mapPoint(result.rows[0]);
  }

  public async latest(bookingId: string, client: TrackingQueryClient = this.pool): Promise<EquipmentTracking | undefined> {
    const result = await client.query<TrackingRow>(
      `SELECT ${columns} FROM equipment_tracking
       WHERE booking_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [bookingId]
    );
    return result.rows[0] ? mapPoint(result.rows[0]) : undefined;
  }

  public async history(bookingId: string, client: TrackingQueryClient = this.pool): Promise<EquipmentTracking[]> {
    const result = await client.query<TrackingRow>(
      `SELECT ${columns} FROM equipment_tracking
       WHERE booking_id = $1 ORDER BY recorded_at`,
      [bookingId]
    );
    return result.rows.map(mapPoint);
  }
}
