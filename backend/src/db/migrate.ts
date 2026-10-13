import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/env.js';
import { getDatabasePool, shutdownDatabasePool } from './pool.js';
import { hasExistingApplicationSchema } from './schemaInspection.js';

export interface MigrationClient {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
  release(): void;
}

export interface MigrationPool {
  connect(): Promise<MigrationClient>;
  end(): Promise<void>;
}

export interface MigrationFile {
  version: string;
  checksum: string;
  sql: string;
}

const migrationLedgerSql = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    checksum VARCHAR(128) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

export async function loadMigrations(migrationDir: string): Promise<MigrationFile[]> {
  const entries = await fs.readdir(migrationDir, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  const migrations = await Promise.all(
    fileNames.map(async (fileName) => {
      const sql = await fs.readFile(path.join(migrationDir, fileName), 'utf8');
      return {
        version: fileName,
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
        sql,
      };
    })
  );

  const versions = new Set<string>();
  for (const migration of migrations) {
    if (versions.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }
    versions.add(migration.version);
  }
  return migrations;
}

async function acquireLock(client: MigrationClient): Promise<void> {
  await client.query('SELECT pg_advisory_lock(hashtext($1))', [
    config.databaseMigrationLockKey,
  ]);
}

async function releaseLock(client: MigrationClient): Promise<void> {
  await client.query('SELECT pg_advisory_unlock(hashtext($1))', [
    config.databaseMigrationLockKey,
  ]);
}

async function readAppliedMigrations(
  client: MigrationClient
): Promise<Map<string, string>> {
  const result = await client.query<{ version: string; checksum: string }>(
    'SELECT version, checksum FROM schema_migrations ORDER BY version'
  );
  return new Map(result.rows.map((row) => [row.version, row.checksum]));
}

export async function runMigrations(
  pool: MigrationPool,
  migrationDir: string
): Promise<void> {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await acquireLock(client);
    lockAcquired = true;
    await client.query(migrationLedgerSql);

    const migrations = await loadMigrations(migrationDir);
    const applied = await readAppliedMigrations(client);
    if (await hasExistingApplicationSchema(client)) {
      const baselineVersions = [
        '001_initial_schema.sql',
        '002_person3_modules.sql',
      ];
      if (baselineVersions.some((version) => !applied.has(version))) {
        throw new Error(
          'Existing application tables do not have complete baseline migration history. ' +
            'Run db:adopt-existing --confirm after review; migrations will not be replayed.'
        );
      }
    }

    for (const migration of migrations) {
      const existingChecksum = applied.get(migration.version);
      if (existingChecksum) {
        if (existingChecksum !== migration.checksum) {
          throw new Error(`Migration checksum mismatch: ${migration.version}`);
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.version, migration.checksum]
        );
        await client.query('COMMIT');
        applied.set(migration.version, migration.checksum);
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[Database] Migration rollback failed:', rollbackError);
        }
        throw error;
      }
    }
  } finally {
    if (lockAcquired) {
      try {
        await releaseLock(client);
      } catch (unlockError) {
        console.error('[Database] Migration advisory lock release failed:', unlockError);
      }
    }
    client.release();
  }
}

export async function migrate(
  migrationDir = path.resolve(process.cwd(), 'database', 'migrations')
): Promise<void> {
  const pool = getDatabasePool();
  try {
    await runMigrations(pool, migrationDir);
  } finally {
    await shutdownDatabasePool();
  }
}

if (process.argv[1]?.toLowerCase().includes('migrate')) {
  migrate().catch((error) => {
    console.error('[Database] Migration failed:', error);
    process.exitCode = 1;
  });
}
