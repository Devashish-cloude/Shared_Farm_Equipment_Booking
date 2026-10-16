import { QueryResultRow } from 'pg';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { Equipment, EquipmentCategory } from '../types/index.js';

type EquipmentRow = {
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
  owner_full_name: string | null;
};

export type EquipmentSearchFilters = {
  categoryId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: Equipment['status'];
  startDate?: string;
  endDate?: string;
};

export type EquipmentUpdate = Partial<Pick<
  Equipment,
  'category_id' | 'title' | 'description' | 'hourly_rate' | 'daily_rate' |
  'location_name' | 'approx_lat' | 'approx_lng' | 'image_url'
>>;

const equipmentUpdateColumns: Record<string, string> = {
  category_id: 'category_id',
  title: 'title',
  description: 'description',
  hourly_rate: 'hourly_rate',
  daily_rate: 'daily_rate',
  location_name: 'location_name',
  approx_lat: 'approx_lat',
  approx_lng: 'approx_lng',
  image_url: 'image_url',
};

export interface EquipmentQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
}

function toNumber(value: string | number | null): number | undefined {
  return value === null ? undefined : Number(value);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    owner_id: row.owner_id,
    category_id: row.category_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    hourly_rate: Number(row.hourly_rate),
    daily_rate: toNumber(row.daily_rate),
    location_name: row.location_name,
    approx_lat: toNumber(row.approx_lat),
    approx_lng: toNumber(row.approx_lng),
    status: row.status,
    rating_avg: Number(row.rating_avg),
    rating_count: Number(row.rating_count),
    image_url: row.image_url ?? undefined,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

const equipmentSelect = `
  SELECT e.id, e.owner_id, e.category_id, e.title, e.description,
         e.hourly_rate, e.daily_rate, e.location_name, e.approx_lat, e.approx_lng,
         e.status, e.rating_avg, e.rating_count, e.image_url,
         e.created_at, e.updated_at, u.full_name AS owner_full_name
  FROM equipment e
  INNER JOIN users u ON u.id = e.owner_id`;

export class EquipmentRepository {
  private readonly pool: DatabasePool;

  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
  }

  public async findAvailable(
    client: EquipmentQueryClient = this.pool,
    filters: EquipmentSearchFilters = {}
  ): Promise<Array<{ equipment: Equipment; owner: { id: string; fullName: string } }>> {
    const values: unknown[] = [];
    const conditions: string[] = [
      `e.status = $${values.length + 1}`,
    ];
    values.push(filters.status || 'active');
    if (filters.categoryId) {
      values.push(filters.categoryId);
      conditions.push(`e.category_id = $${values.length}`);
    }
    if (filters.location) {
      values.push(`%${filters.location}%`);
      conditions.push(`e.location_name ILIKE $${values.length}`);
    }
    if (filters.minPrice !== undefined) {
      values.push(filters.minPrice);
      conditions.push(`e.hourly_rate >= $${values.length}`);
    }
    if (filters.maxPrice !== undefined) {
      values.push(filters.maxPrice);
      conditions.push(`e.hourly_rate <= $${values.length}`);
    }
    if (filters.startDate && filters.endDate) {
      values.push(filters.startDate, filters.endDate);
      const startParam = values.length - 1;
      const endParam = values.length;
      conditions.push(`(
        NOT EXISTS (
          SELECT 1 FROM equipment_availability_windows aw0
          WHERE aw0.equipment_id = e.id
        )
        OR EXISTS (
          SELECT 1 FROM equipment_availability_windows aw
          WHERE aw.equipment_id = e.id
            AND aw.start_date <= $${startParam}::timestamptz
            AND aw.end_date >= $${endParam}::timestamptz
        )
      )`);
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM equipment_blocked_periods bp
        WHERE bp.equipment_id = e.id
          AND bp.start_date < $${endParam}::timestamptz
          AND bp.end_date > $${startParam}::timestamptz
      )`);
    }
    const result = await client.query<EquipmentRow>(
      `${equipmentSelect}
       WHERE ${conditions.join('\n         AND ')}
       ORDER BY e.created_at DESC`,
      values
    );
    return result.rows.map((row) => ({
      equipment: toEquipment(row),
      owner: { id: row.owner_id, fullName: row.owner_full_name || '' },
    }));
  }

  public async findById(
    id: string,
    client: EquipmentQueryClient = this.pool
  ): Promise<{ equipment: Equipment; owner: { id: string; fullName: string } } | undefined> {
    const result = await client.query<EquipmentRow>(
      `${equipmentSelect}
       WHERE e.id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row
      ? {
          equipment: toEquipment(row),
          owner: { id: row.owner_id, fullName: row.owner_full_name || '' },
        }
      : undefined;
  }

  public async findByOwner(
    ownerId: string,
    client: EquipmentQueryClient = this.pool
  ): Promise<Array<{ equipment: Equipment; owner: { id: string; fullName: string } }>> {
    const result = await client.query<EquipmentRow>(
      `${equipmentSelect}
       WHERE e.owner_id = $1
       ORDER BY e.created_at DESC`,
      [ownerId]
    );
    return result.rows.map((row) => ({
      equipment: toEquipment(row),
      owner: { id: row.owner_id, fullName: row.owner_full_name || '' },
    }));
  }

  public async create(
    equipment: Equipment,
    client: EquipmentQueryClient = this.pool
  ): Promise<Equipment> {
    const result = await client.query<EquipmentRow>(
      `INSERT INTO equipment
       (id, owner_id, category_id, title, description, hourly_rate, daily_rate,
        location_name, approx_lat, approx_lng, status, rating_avg, rating_count,
        image_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id, owner_id, category_id, title, description, hourly_rate, daily_rate,
                 location_name, approx_lat, approx_lng, status, rating_avg, rating_count,
                 image_url, created_at, updated_at`,
      [
        equipment.id,
        equipment.owner_id,
        equipment.category_id ?? null,
        equipment.title,
        equipment.description ?? null,
        equipment.hourly_rate,
        equipment.daily_rate ?? null,
        equipment.location_name,
        equipment.approx_lat ?? null,
        equipment.approx_lng ?? null,
        equipment.status,
        equipment.rating_avg,
        equipment.rating_count,
        equipment.image_url ?? null,
        equipment.created_at,
        equipment.updated_at,
      ]
    );
    return toEquipment({ ...result.rows[0], owner_full_name: null });
  }

  public async findCategories(
    client: EquipmentQueryClient = this.pool
  ): Promise<EquipmentCategory[]> {
    const result = await client.query<EquipmentCategory>(
      `SELECT id, name, description
       FROM equipment_categories
       ORDER BY name ASC`
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
    }));
  }

  public async categoryExists(
    categoryId: string,
    client: EquipmentQueryClient = this.pool
  ): Promise<boolean> {
    const result = await client.query<{ id: string }>(
      'SELECT id FROM equipment_categories WHERE id = $1',
      [categoryId]
    );
    return result.rows.length === 1;
  }

  public async update(
    id: string,
    fields: EquipmentUpdate,
    client: EquipmentQueryClient = this.pool
  ): Promise<Equipment | undefined> {
    const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
    for (const [key] of entries) {
      if (!equipmentUpdateColumns[key]) {
        throw new Error(`Unsupported equipment update field: ${key}`);
      }
    }
    if (entries.length === 0) {
      return this.findById(id, client).then((result) => result?.equipment);
    }
    const values: unknown[] = [id];
    const assignments = entries.map(([key, value]) => {
      values.push(equipmentUpdateColumns[key] === 'category_id' ? value ?? null : value);
      return `${equipmentUpdateColumns[key]} = $${values.length}`;
    });
    values.push(new Date().toISOString());
    assignments.push(`updated_at = $${values.length}`);
    const result = await client.query<EquipmentRow>(
      `UPDATE equipment
       SET ${assignments.join(', ')}
       WHERE id = $1
       RETURNING id, owner_id, category_id, title, description, hourly_rate, daily_rate,
                 location_name, approx_lat, approx_lng, status, rating_avg, rating_count,
                 image_url, created_at, updated_at`,
      values
    );
    return result.rows[0]
      ? toEquipment({ ...result.rows[0], owner_full_name: null })
      : undefined;
  }

  public async deactivate(
    id: string,
    client: EquipmentQueryClient = this.pool
  ): Promise<Equipment | undefined> {
    const result = await client.query<EquipmentRow>(
      `UPDATE equipment
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, owner_id, category_id, title, description, hourly_rate, daily_rate,
                 location_name, approx_lat, approx_lng, status, rating_avg, rating_count,
                 image_url, created_at, updated_at`,
      [id]
    );
    return result.rows[0]
      ? toEquipment({ ...result.rows[0], owner_full_name: null })
      : undefined;
  }
}
