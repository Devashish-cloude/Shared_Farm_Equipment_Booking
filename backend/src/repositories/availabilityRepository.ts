import { QueryResultRow } from 'pg';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import {
  EquipmentAvailabilityWindow,
  EquipmentBlockedPeriod,
} from '../types/index.js';

type AvailabilityRow = {
  id: string;
  equipment_id: string;
  start_date: Date | string;
  end_date: Date | string;
  created_at: Date | string;
};

export interface AvailabilityQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAvailability(row: AvailabilityRow): EquipmentAvailabilityWindow {
  return {
    id: row.id,
    equipment_id: row.equipment_id,
    start_date: toIso(row.start_date),
    end_date: toIso(row.end_date),
    created_at: toIso(row.created_at),
  };
}

function mapBlocked(row: AvailabilityRow): EquipmentBlockedPeriod {
  return {
    id: row.id,
    equipment_id: row.equipment_id,
    start_date: toIso(row.start_date),
    end_date: toIso(row.end_date),
    created_at: toIso(row.created_at),
  };
}

export class AvailabilityRepository {
  private readonly pool: DatabasePool;

  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
  }

  public async findWindows(
    equipmentId: string,
    client: AvailabilityQueryClient = this.pool
  ): Promise<EquipmentAvailabilityWindow[]> {
    const result = await client.query<AvailabilityRow>(
      `SELECT id, equipment_id, start_date, end_date, created_at
       FROM equipment_availability_windows
       WHERE equipment_id = $1
       ORDER BY start_date ASC`,
      [equipmentId]
    );
    return result.rows.map(mapAvailability);
  }

  public async findBlockedPeriods(
    equipmentId: string,
    client: AvailabilityQueryClient = this.pool
  ): Promise<EquipmentBlockedPeriod[]> {
    const result = await client.query<AvailabilityRow>(
      `SELECT id, equipment_id, start_date, end_date, created_at
       FROM equipment_blocked_periods
       WHERE equipment_id = $1
       ORDER BY start_date ASC`,
      [equipmentId]
    );
    return result.rows.map(mapBlocked);
  }

  public async findEquipmentOwner(
    equipmentId: string,
    client: AvailabilityQueryClient
  ): Promise<string | undefined> {
    const result = await client.query<{ owner_id: string }>(
      'SELECT owner_id FROM equipment WHERE id = $1 FOR UPDATE',
      [equipmentId]
    );
    return result.rows[0]?.owner_id;
  }

  public async equipmentExists(
    equipmentId: string,
    client: AvailabilityQueryClient = this.pool
  ): Promise<boolean> {
    const result = await client.query<{ id: string }>(
      'SELECT id FROM equipment WHERE id = $1',
      [equipmentId]
    );
    return result.rows.length === 1;
  }

  public async hasWindowOverlap(
    equipmentId: string,
    startDate: string,
    endDate: string,
    client: AvailabilityQueryClient
  ): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM equipment_availability_windows
         WHERE equipment_id = $1
           AND start_date < $3::timestamptz
           AND end_date > $2::timestamptz
       ) AS exists`,
      [equipmentId, startDate, endDate]
    );
    return result.rows[0]?.exists === true;
  }

  public async hasBlockedOverlap(
    equipmentId: string,
    startDate: string,
    endDate: string,
    client: AvailabilityQueryClient
  ): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM equipment_blocked_periods
         WHERE equipment_id = $1
           AND start_date < $3::timestamptz
           AND end_date > $2::timestamptz
       ) AS exists`,
      [equipmentId, startDate, endDate]
    );
    return result.rows[0]?.exists === true;
  }

  public async isBookable(
    equipmentId: string,
    startDate: string,
    endDate: string,
    client: AvailabilityQueryClient
  ): Promise<boolean> {
    const result = await client.query<{ available: boolean }>(
      `      SELECT (
        NOT EXISTS (
          SELECT 1 FROM equipment_availability_windows
          WHERE equipment_id = $1
        )
        OR EXISTS (
        SELECT 1
        FROM equipment_availability_windows
        WHERE equipment_id = $1
          AND start_date <= $2::timestamptz
          AND end_date >= $3::timestamptz
        )
      ) AND NOT EXISTS (
         SELECT 1
         FROM equipment_blocked_periods
         WHERE equipment_id = $1
           AND start_date < $3::timestamptz
           AND end_date > $2::timestamptz
       ) AS available`,
      [equipmentId, startDate, endDate]
    );
    return result.rows[0]?.available === true;
  }

  public async createWindow(
    window: EquipmentAvailabilityWindow,
    client: AvailabilityQueryClient
  ): Promise<EquipmentAvailabilityWindow> {
    const result = await client.query<AvailabilityRow>(
      `INSERT INTO equipment_availability_windows
       (id, equipment_id, start_date, end_date, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, equipment_id, start_date, end_date, created_at`,
      [window.id, window.equipment_id, window.start_date, window.end_date, window.created_at]
    );
    return mapAvailability(result.rows[0]);
  }

  public async createBlockedPeriod(
    period: EquipmentBlockedPeriod,
    client: AvailabilityQueryClient
  ): Promise<EquipmentBlockedPeriod> {
    const result = await client.query<AvailabilityRow>(
      `INSERT INTO equipment_blocked_periods
       (id, equipment_id, start_date, end_date, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, equipment_id, start_date, end_date, created_at`,
      [period.id, period.equipment_id, period.start_date, period.end_date, period.created_at]
    );
    return mapBlocked(result.rows[0]);
  }

  public async deleteWindow(
    equipmentId: string,
    id: string,
    client: AvailabilityQueryClient
  ): Promise<boolean> {
    const result = await client.query<{ id: string }>(
      'DELETE FROM equipment_availability_windows WHERE id = $1 AND equipment_id = $2 RETURNING id',
      [id, equipmentId]
    );
    return result.rows.length === 1;
  }

  public async deleteBlockedPeriod(
    equipmentId: string,
    id: string,
    client: AvailabilityQueryClient
  ): Promise<boolean> {
    const result = await client.query<{ id: string }>(
      'DELETE FROM equipment_blocked_periods WHERE id = $1 AND equipment_id = $2 RETURNING id',
      [id, equipmentId]
    );
    return result.rows.length === 1;
  }
}
