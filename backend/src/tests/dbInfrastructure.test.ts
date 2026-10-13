import crypto from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../config/env.js';
import { classifyDatabaseError } from '../db/errors.js';
import { runMigrations } from '../db/migrate.js';
import { getDatabasePool, shutdownDatabasePool } from '../db/pool.js';
import { expectedConstraints, inspectExistingSchema } from '../db/schemaInspection.js';
import { withTransaction } from '../db/transaction.js';
import { adoptExisting } from '../db/adoptExisting.js';

class FakeClient {
  public readonly calls: Array<{ text: string; values?: unknown[] }> = [];
  public released = false;
  public existingSchema = false;
  public appliedRows: Array<{ version: string; checksum: string }> = [];

  async query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, values });
    if (text.includes('to_regclass')) {
      return { rows: [{ exists: this.existingSchema }] as T[] };
    }
    if (text.includes('SELECT version, checksum')) {
      return { rows: this.appliedRows as T[] };
    }
    if (text.includes('information_schema.tables')) {
      if (text.includes('SELECT EXISTS')) {
        return { rows: [{ exists: this.existingSchema }] as T[] };
      }
      return {
        rows: (this.existingSchema ? [{ table_name: 'users' }] : []) as T[],
      };
    }
    if (text.includes('information_schema.columns')) {
      return { rows: [] as T[] };
    }
    if (text.includes('pg_get_constraintdef')) {
      return {
        rows: expectedConstraints.map(([constraint_name, definition]) => ({
          constraint_name,
          definition,
        })) as T[],
      };
    }
    if (text.includes('INSERT INTO schema_migrations')) {
      const [version, checksum] = values as [string, string];
      this.appliedRows.push({ version, checksum });
    }
    return { rows: [] as T[] };
  }

  release(): void {
    this.released = true;
  }
}

class FakePool {
  public readonly client = new FakeClient();
  public ended = false;

  async connect(): Promise<FakeClient> {
    return this.client;
  }

  async end(): Promise<void> {
    this.ended = true;
  }
}

const expectedTables = [
  'users',
  'user_profiles',
  'equipment_categories',
  'equipment',
  'bookings',
  'rental_sessions',
  'equipment_tracking',
  'payments',
  'notifications',
  'reviews',
];

const expectedColumns = [
  ['users', 'id'], ['users', 'email'], ['users', 'password_hash'], ['users', 'full_name'], ['users', 'phone'], ['users', 'is_admin'], ['users', 'created_at'], ['users', 'updated_at'],
  ['user_profiles', 'id'], ['user_profiles', 'user_id'], ['user_profiles', 'location_name'], ['user_profiles', 'farm_size_acres'], ['user_profiles', 'address'], ['user_profiles', 'bio'], ['user_profiles', 'avatar_url'], ['user_profiles', 'created_at'], ['user_profiles', 'updated_at'],
  ['equipment_categories', 'id'], ['equipment_categories', 'name'], ['equipment_categories', 'description'],
  ['equipment', 'id'], ['equipment', 'owner_id'], ['equipment', 'category_id'], ['equipment', 'title'], ['equipment', 'description'], ['equipment', 'hourly_rate'], ['equipment', 'daily_rate'], ['equipment', 'location_name'], ['equipment', 'approx_lat'], ['equipment', 'approx_lng'], ['equipment', 'status'], ['equipment', 'rating_avg'], ['equipment', 'rating_count'], ['equipment', 'image_url'], ['equipment', 'created_at'], ['equipment', 'updated_at'],
  ['bookings', 'id'], ['bookings', 'renter_id'], ['bookings', 'equipment_id'], ['bookings', 'start_date'], ['bookings', 'end_date'], ['bookings', 'total_hours'], ['bookings', 'hourly_rate'], ['bookings', 'base_price'], ['bookings', 'platform_fee'], ['bookings', 'total_price'], ['bookings', 'status'], ['bookings', 'notes'], ['bookings', 'created_at'], ['bookings', 'updated_at'],
  ['rental_sessions', 'id'], ['rental_sessions', 'booking_id'], ['rental_sessions', 'started_by'], ['rental_sessions', 'start_time'], ['rental_sessions', 'end_time'], ['rental_sessions', 'session_status'], ['rental_sessions', 'notes'], ['rental_sessions', 'created_at'], ['rental_sessions', 'updated_at'],
  ['equipment_tracking', 'id'], ['equipment_tracking', 'session_id'], ['equipment_tracking', 'booking_id'], ['equipment_tracking', 'latitude'], ['equipment_tracking', 'longitude'], ['equipment_tracking', 'source'], ['equipment_tracking', 'speed_kmh'], ['equipment_tracking', 'heading_deg'], ['equipment_tracking', 'recorded_at'], ['equipment_tracking', 'created_at'],
  ['payments', 'id'], ['payments', 'booking_id'], ['payments', 'user_id'], ['payments', 'razorpay_order_id'], ['payments', 'razorpay_payment_id'], ['payments', 'razorpay_signature'], ['payments', 'amount'], ['payments', 'currency'], ['payments', 'status'], ['payments', 'payment_method'], ['payments', 'error_code'], ['payments', 'error_description'], ['payments', 'idempotency_key'], ['payments', 'created_at'], ['payments', 'updated_at'],
  ['notifications', 'id'], ['notifications', 'user_id'], ['notifications', 'title'], ['notifications', 'message'], ['notifications', 'type'], ['notifications', 'reference_id'], ['notifications', 'reference_type'], ['notifications', 'is_read'], ['notifications', 'created_at'],
  ['reviews', 'id'], ['reviews', 'booking_id'], ['reviews', 'equipment_id'], ['reviews', 'reviewer_id'], ['reviews', 'reviewee_id'], ['reviews', 'rating'], ['reviews', 'comment'], ['reviews', 'review_type'], ['reviews', 'created_at'], ['reviews', 'updated_at'],
];

afterEach(async () => {
  await shutdownDatabasePool();
});

describe('PostgreSQL Phase 1 infrastructure', () => {
  it('requires DATABASE_URL before creating a pool', () => {
    const original = config.databaseUrl;
    config.databaseUrl = undefined;
    expect(() => getDatabasePool()).toThrow('DATABASE_URL is required');
    config.databaseUrl = original;
  });

  it('rolls back and releases a client when a transaction fails', async () => {
    const client = new FakeClient();
    const pool = { connect: async () => client };
    const failure = new Error('operation failed');

    await expect(
      withTransaction(pool, async (transactionClient) => {
        await transactionClient.query('SELECT 1');
        throw failure;
      })
    ).rejects.toBe(failure);

    expect(client.calls.map((call) => call.text)).toEqual([
      'BEGIN',
      'SELECT 1',
      'ROLLBACK',
    ]);
    expect(client.released).toBe(true);
  });

  it('commits a successful transaction and releases the client', async () => {
    const client = new FakeClient();
    const pool = { connect: async () => client };

    await expect(withTransaction(pool, async () => 'ok')).resolves.toBe('ok');
    expect(client.calls.map((call) => call.text)).toEqual(['BEGIN', 'COMMIT']);
    expect(client.released).toBe(true);
  });

  it('runs migrations with one client, records checksums, and releases the lock', async () => {
    const migrationDir = await mkdtemp(path.join(os.tmpdir(), 'shared-farm-migrations-'));
    try {
      await writeFile(path.join(migrationDir, '001_first.sql'), 'CREATE TABLE first ();');
      await writeFile(path.join(migrationDir, '002_second.sql'), 'CREATE TABLE second ();');
      const pool = new FakePool();

      await runMigrations(pool, migrationDir);

      const calls = pool.client.calls.map((call) => call.text);
      expect(calls[0]).toContain('pg_advisory_lock');
      expect(calls.indexOf('BEGIN')).toBeLessThan(calls.indexOf('COMMIT'));
      expect(calls[calls.length - 1]).toContain('pg_advisory_unlock');
      expect(pool.client.released).toBe(true);
      expect(pool.client.appliedRows).toHaveLength(2);
    } finally {
      await rm(migrationDir, { recursive: true, force: true });
    }
  });

  it('fails before execution when an applied migration checksum changes', async () => {
    const migrationDir = await mkdtemp(path.join(os.tmpdir(), 'shared-farm-checksum-'));
    try {
      await writeFile(path.join(migrationDir, '001_first.sql'), 'CREATE TABLE changed ();');
      const pool = new FakePool();
      pool.client.appliedRows = [{ version: '001_first.sql', checksum: 'wrong' }];

      await expect(runMigrations(pool, migrationDir)).rejects.toThrow(
        'Migration checksum mismatch'
      );
      expect(pool.client.calls.some((call) => call.text === 'BEGIN')).toBe(false);
      expect(pool.client.released).toBe(true);
    } finally {
      await rm(migrationDir, { recursive: true, force: true });
    }
  });

  it('does not replay a baseline migration on an existing schema with partial history', async () => {
    const migrationDir = await mkdtemp(path.join(os.tmpdir(), 'shared-farm-partial-history-'));
    try {
      await writeFile(path.join(migrationDir, '001_initial_schema.sql'), 'baseline one');
      await writeFile(path.join(migrationDir, '002_person3_modules.sql'), 'baseline two');
      const pool = new FakePool();
      pool.client.existingSchema = true;
      pool.client.appliedRows = [{ version: '001_initial_schema.sql', checksum: 'known' }];

      await expect(runMigrations(pool, migrationDir)).rejects.toThrow(
        'complete baseline migration history'
      );
      expect(pool.client.calls.some((call) => call.text === 'baseline two')).toBe(false);
      expect(pool.client.released).toBe(true);
    } finally {
      await rm(migrationDir, { recursive: true, force: true });
    }
  });

  it('does not treat a non-users application table as a fresh database', async () => {
    const migrationDir = await mkdtemp(path.join(os.tmpdir(), 'shared-farm-partial-schema-'));
    try {
      await writeFile(path.join(migrationDir, '001_initial_schema.sql'), 'baseline one');
      await writeFile(path.join(migrationDir, '002_person3_modules.sql'), 'baseline two');
      const pool = new FakePool();
      pool.client.query = async <T = Record<string, unknown>>(
        text: string,
        values?: unknown[]
      ): Promise<{ rows: T[] }> => {
        pool.client.calls.push({ text, values });
        if (text.includes('information_schema.tables')) {
          if (text.includes('SELECT EXISTS')) {
            return { rows: [{ exists: true }] as T[] };
          }
          return { rows: [{ table_name: 'equipment' }] as T[] };
        }
        if (text.includes('SELECT version, checksum')) {
          return { rows: [] as T[] };
        }
        return { rows: [] as T[] };
      };

      await expect(runMigrations(pool, migrationDir)).rejects.toThrow(
        'complete baseline migration history'
      );
      expect(pool.client.calls.some((call) => call.text === 'baseline one')).toBe(false);
      expect(pool.client.calls.some((call) => call.text === 'baseline two')).toBe(false);
      expect(pool.client.released).toBe(true);
    } finally {
      await rm(migrationDir, { recursive: true, force: true });
    }
  });

  it('refuses adoption without explicit confirmation', async () => {
    const pool = new FakePool();
    await expect(adoptExisting(pool, 'unused', false)).rejects.toThrow(
      'requires --confirm'
    );
    expect(pool.client.released).toBe(false);
  });

  it('adopts a compatible existing schema by recording baselines without replaying SQL', async () => {
    const migrationDir = await mkdtemp(path.join(os.tmpdir(), 'shared-farm-adoption-'));
    try {
      await writeFile(path.join(migrationDir, '001_initial_schema.sql'), 'baseline one');
      await writeFile(path.join(migrationDir, '002_person3_modules.sql'), 'baseline two');
      const pool = new FakePool();
      pool.client.existingSchema = true;
      const originalQuery = pool.client.query.bind(pool.client);
      pool.client.query = async <T = Record<string, unknown>>(
        text: string,
        values?: unknown[]
      ): Promise<{ rows: T[] }> => {
        if (text.includes('information_schema.tables')) {
          return { rows: expectedTables.map((table_name) => ({ table_name })) as T[] };
        }
        if (text.includes('information_schema.columns')) {
          return {
            rows: expectedColumns.map(([table_name, column_name]) => ({
              table_name,
              column_name,
            })) as T[],
          };
        }
        return originalQuery(text, values);
      };

      await adoptExisting(pool, migrationDir, true);

      expect(pool.client.appliedRows).toHaveLength(2);
      expect(pool.client.appliedRows).toEqual([
        {
          version: '001_initial_schema.sql',
          checksum: crypto.createHash('sha256').update('baseline one').digest('hex'),
        },
        {
          version: '002_person3_modules.sql',
          checksum: crypto.createHash('sha256').update('baseline two').digest('hex'),
        },
      ]);
      expect(pool.client.calls.some((call) => call.text === 'baseline one')).toBe(false);
      expect(pool.client.calls.some((call) => call.text === 'baseline two')).toBe(false);
      expect(pool.client.released).toBe(true);
    } finally {
      await rm(migrationDir, { recursive: true, force: true });
    }
  });

  it('marks a schema incompatible when required columns are missing', async () => {
    const client = new FakeClient();
    client.query = async <T = Record<string, unknown>>(
      text: string
    ): Promise<{ rows: T[] }> => {
      if (text.includes('information_schema.tables')) {
        return { rows: expectedTables.map((table_name) => ({ table_name })) as T[] };
      }
      if (text.includes('information_schema.columns')) {
        return { rows: expectedColumns.slice(1).map(([table_name, column_name]) => ({ table_name, column_name })) as T[] };
      }
      if (text.includes('pg_get_constraintdef')) {
        return { rows: expectedConstraints.map(([constraint_name, definition]) => ({ constraint_name, definition })) as T[] };
      }
      return { rows: [] as T[] };
    };

    const inspection = await inspectExistingSchema(client);
    expect(inspection.compatible).toBe(false);
    expect(inspection.missingColumns).toContain('users.id');
  });

  it('marks a schema incompatible when required integrity constraints are missing', async () => {
    const client = new FakeClient();
    client.query = async <T = Record<string, unknown>>(
      text: string
    ): Promise<{ rows: T[] }> => {
      if (text.includes('information_schema.tables')) {
        return { rows: expectedTables.map((table_name) => ({ table_name })) as T[] };
      }
      if (text.includes('information_schema.columns')) {
        return { rows: expectedColumns.map(([table_name, column_name]) => ({ table_name, column_name })) as T[] };
      }
      if (text.includes('pg_get_constraintdef')) {
        return { rows: [] as T[] };
      }
      return { rows: [] as T[] };
    };

    const inspection = await inspectExistingSchema(client);
    expect(inspection.compatible).toBe(false);
    expect(inspection.missingConstraints).toContain('users_pkey');
    expect(inspection.missingConstraints).toContain('uq_booking_reviewer');
  });

  it('classifies PostgreSQL integrity errors without exposing values', () => {
    expect(classifyDatabaseError({ code: '23P01' })).toBe('exclusion_violation');
    expect(classifyDatabaseError({ code: '23505' })).toBe('unique_violation');
    expect(classifyDatabaseError({ code: '23514' })).toBe('check_violation');
    expect(classifyDatabaseError({ code: '08006' })).toBe('connection_error');
  });
});
