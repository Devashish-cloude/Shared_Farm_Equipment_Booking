import { QueryResultRow } from 'pg';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { Booking, BookingStatus, Equipment } from '../types/index.js';

type BookingRow = {
  id: string;
  renter_id: string;
  equipment_id: string;
  start_date: Date | string;
  end_date: Date | string;
  total_hours: string | number;
  hourly_rate: string | number;
  base_price: string | number;
  platform_fee: string | number;
  total_price: string | number;
  status: BookingStatus;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type EquipmentContextRow = {
  id: string;
  owner_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  hourly_rate: string | number;
  daily_rate: string | number | null;
  location_name: string;
  approx_lat: string | number | null;
  approx_lng: string | number | null;
  status: Equipment['status'];
  rating_avg: string | number;
  rating_count: number;
  image_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  owner_full_name: string;
};

type BookingContextRow = BookingRow & {
  owner_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  equipment_hourly_rate: string | number;
  daily_rate: string | number | null;
  location_name: string;
  approx_lat: string | number | null;
  approx_lng: string | number | null;
  equipment_status: Equipment['status'];
  rating_avg: string | number;
  rating_count: number;
  image_url: string | null;
  equipment_created_at: Date | string;
  equipment_updated_at: Date | string;
  owner_full_name: string;
  renter_full_name: string;
  renter_phone: string | null;
};

export interface BookingQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
}

export type BookingContext = {
  booking: Booking;
  equipment: Equipment;
  owner: { id: string; fullName: string };
  renter: { id: string; fullName: string; phone?: string };
};

export const RESERVED_BOOKING_STATUSES: BookingStatus[] = [
  'accepted',
  'payment_pending',
  'confirmed',
  'in_progress',
  'disputed',
];

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    renter_id: row.renter_id,
    equipment_id: row.equipment_id,
    start_date: toIsoString(row.start_date),
    end_date: toIsoString(row.end_date),
    total_hours: Number(row.total_hours),
    hourly_rate: Number(row.hourly_rate),
    base_price: Number(row.base_price),
    platform_fee: Number(row.platform_fee),
    total_price: Number(row.total_price),
    status: row.status,
    notes: row.notes ?? undefined,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

function toEquipment(row: EquipmentContextRow): Equipment {
  return {
    id: row.id,
    owner_id: row.owner_id,
    category_id: row.category_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    hourly_rate: Number(row.hourly_rate),
    daily_rate: row.daily_rate === null ? undefined : Number(row.daily_rate),
    location_name: row.location_name,
    approx_lat: row.approx_lat === null ? undefined : Number(row.approx_lat),
    approx_lng: row.approx_lng === null ? undefined : Number(row.approx_lng),
    status: row.status,
    rating_avg: Number(row.rating_avg),
    rating_count: Number(row.rating_count),
    image_url: row.image_url ?? undefined,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

const contextSelect = `
  SELECT b.id, b.renter_id, b.equipment_id, b.start_date, b.end_date,
         b.total_hours, b.hourly_rate, b.base_price, b.platform_fee, b.total_price,
         b.status, b.notes, b.created_at, b.updated_at,
         e.owner_id, e.category_id, e.title, e.description, e.hourly_rate AS equipment_hourly_rate,
         e.daily_rate, e.location_name, e.approx_lat, e.approx_lng, e.status AS equipment_status,
         e.rating_avg, e.rating_count, e.image_url, e.created_at AS equipment_created_at,
         e.updated_at AS equipment_updated_at, u.full_name AS owner_full_name,
         r.full_name AS renter_full_name, r.phone AS renter_phone
  FROM bookings b
  INNER JOIN equipment e ON e.id = b.equipment_id
  INNER JOIN users u ON u.id = e.owner_id
  INNER JOIN users r ON r.id = b.renter_id`;

function mapContext(row: BookingContextRow): BookingContext {
  return {
      booking: toBooking(row),
      equipment: toEquipment({
        id: row.equipment_id,
        owner_id: row.owner_id,
        category_id: row.category_id,
        title: row.title,
        description: row.description,
        hourly_rate: row.equipment_hourly_rate,
        daily_rate: row.daily_rate,
        location_name: row.location_name,
        approx_lat: row.approx_lat,
        approx_lng: row.approx_lng,
        status: row.equipment_status,
        rating_avg: row.rating_avg,
        rating_count: row.rating_count,
        image_url: row.image_url,
        created_at: row.equipment_created_at,
        updated_at: row.equipment_updated_at,
        owner_full_name: row.owner_full_name,
      }),
      owner: { id: row.owner_id, fullName: row.owner_full_name },
      renter: {
        id: row.renter_id,
        fullName: row.renter_full_name,
        phone: row.renter_phone ?? undefined,
      },
  };
}

export class BookingRepository {
  private readonly pool: DatabasePool;

  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
  }

  public async lockById(id: string, client: BookingQueryClient): Promise<boolean> {
    const result = await client.query<{ id: string }>(
      'SELECT id FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );
    return result.rows.length === 1;
  }

  public async findById(
    id: string,
    client: BookingQueryClient = this.pool
  ): Promise<BookingContext | undefined> {
    const result = await client.query<BookingContextRow>(
      contextSelect + '\n WHERE b.id = $1',
      [id]
    );
    return result.rows[0] ? mapContext(result.rows[0]) : undefined;
  }

  public async findByUser(
    userId: string,
    role: 'renter' | 'owner',
    client: BookingQueryClient = this.pool
  ): Promise<BookingContext[]> {
    const condition =
      role === 'renter' ? 'b.renter_id = $1' : 'e.owner_id = $1';
    const result = await client.query<BookingContextRow>(
      contextSelect + `\n WHERE ${condition}\n ORDER BY b.created_at DESC`,
      [userId]
    );
    return result.rows.map((row) => mapContext(row));
  }

  public async findEquipmentForUpdate(
    equipmentId: string,
    client: BookingQueryClient
  ): Promise<EquipmentContextRow | undefined> {
    const result = await client.query<EquipmentContextRow>(
      `SELECT e.id, e.owner_id, e.category_id, e.title, e.description, e.hourly_rate,
              e.daily_rate, e.location_name, e.approx_lat, e.approx_lng, e.status,
              e.rating_avg, e.rating_count, e.image_url, e.created_at, e.updated_at,
              u.full_name AS owner_full_name
       FROM equipment e
       INNER JOIN users u ON u.id = e.owner_id
       WHERE e.id = $1
       FOR UPDATE`,
      [equipmentId]
    );
    return result.rows[0];
  }

  public async hasReservedOverlap(
    equipmentId: string,
    startDate: string,
    endDate: string,
    client: BookingQueryClient
  ): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM bookings
         WHERE equipment_id = $1
           AND status = ANY($4::varchar[])
           AND start_date < $3::timestamptz
           AND end_date > $2::timestamptz
       ) AS exists`,
      [equipmentId, startDate, endDate, RESERVED_BOOKING_STATUSES]
    );
    return result.rows[0]?.exists === true;
  }

  public async create(
    booking: Booking,
    client: BookingQueryClient
  ): Promise<Booking> {
    const result = await client.query<BookingRow>(
      `INSERT INTO bookings
       (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
        base_price, platform_fee, total_price, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
                 base_price, platform_fee, total_price, status, notes, created_at, updated_at`,
      [
        booking.id,
        booking.renter_id,
        booking.equipment_id,
        booking.start_date,
        booking.end_date,
        booking.total_hours,
        booking.hourly_rate,
        booking.base_price,
        booking.platform_fee,
        booking.total_price,
        booking.status,
        booking.notes ?? null,
        booking.created_at,
        booking.updated_at,
      ]
    );
    return toBooking(result.rows[0]);
  }

  public async updateStatus(
    id: string,
    fromStatus: BookingStatus,
    toStatus: BookingStatus,
    client: BookingQueryClient
  ): Promise<Booking | undefined> {
    const result = await client.query<BookingRow>(
      `UPDATE bookings
       SET status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = $2
       RETURNING id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate,
                 base_price, platform_fee, total_price, status, notes, created_at, updated_at`,
      [id, fromStatus, toStatus]
    );
    return result.rows[0] ? toBooking(result.rows[0]) : undefined;
  }
}
