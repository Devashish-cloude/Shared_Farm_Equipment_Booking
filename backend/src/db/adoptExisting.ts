import path from 'node:path';
import { config } from '../config/env.js';
import { getDatabasePool, shutdownDatabasePool } from './pool.js';
import { inspectExistingSchema } from './schemaInspection.js';
import { loadMigrations, MigrationPool } from './migrate.js';

interface AdoptionClient {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
  release(): void;
}

async function adoptExisting(
  pool: MigrationPool,
  migrationDir: string,
  confirmed: boolean
): Promise<void> {
  if (!confirmed) {
    throw new Error('Existing-database adoption requires --confirm.');
  }

  const client = await pool.connect() as AdoptionClient;
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [
      config.databaseMigrationLockKey,
    ]);
    lockAcquired = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        checksum VARCHAR(128) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const inspection = await inspectExistingSchema(client);
    if (!inspection.compatible) {
      throw new Error(
        `Existing schema is incompatible. Missing tables: ${inspection.missingTables.join(', ') || 'none'}; ` +
          `missing columns: ${inspection.missingColumns.join(', ') || 'none'}; ` +
          `missing constraints: ${inspection.missingConstraints.join(', ') || 'none'}`
      );
    }

    const ledger = await client.query<{ version: string; checksum: string }>(
      'SELECT version, checksum FROM schema_migrations ORDER BY version'
    );
    if (ledger.rows.length > 0) {
      throw new Error('Migration history already exists; use db:migrate instead.');
    }

    const migrations = await loadMigrations(migrationDir);
    const baseline = migrations.filter((migration) =>
      ['001_initial_schema.sql', '002_person3_modules.sql'].includes(migration.version)
    );
    if (baseline.length !== 2) {
      throw new Error('Both baseline migrations 001 and 002 are required for adoption.');
    }

    await client.query('BEGIN');
    try {
      for (const migration of baseline) {
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.version, migration.checksum]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[Database] Adoption rollback failed:', rollbackError);
      }
      throw error;
    }
  } finally {
    if (lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [
          config.databaseMigrationLockKey,
        ]);
      } catch (unlockError) {
        console.error('[Database] Adoption advisory lock release failed:', unlockError);
      }
    }
    client.release();
  }
}

export async function adoptExistingDatabase(
  confirmed: boolean,
  migrationDir = path.resolve(process.cwd(), 'database', 'migrations')
): Promise<void> {
  const pool = getDatabasePool();
  try {
    await adoptExisting(pool, migrationDir, confirmed);
  } finally {
    await shutdownDatabasePool();
  }
}

if (process.argv[1]?.toLowerCase().includes('adoptexisting')) {
  adoptExistingDatabase(process.argv.includes('--confirm')).catch((error) => {
    console.error('[Database] Existing-database adoption failed:', error);
    process.exitCode = 1;
  });
}

export { adoptExisting };
