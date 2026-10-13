import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/env.js';

export interface DatabasePool {
  connect(): Promise<PoolClient>;
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>>;
  end(): Promise<void>;
}

let pool: Pool | undefined;

function requireDatabaseUrl(): string {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL operations.');
  }
  return config.databaseUrl;
}

export function getDatabasePool(): DatabasePool {
  if (!pool) {
    pool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: config.databasePoolMax,
      idleTimeoutMillis: config.databaseIdleTimeoutMs,
      connectionTimeoutMillis: config.databaseConnectionTimeoutMs,
      ssl: config.databaseSsl
        ? { rejectUnauthorized: config.databaseSslRejectUnauthorized }
        : undefined,
    });
  }
  return pool;
}

export async function shutdownDatabasePool(): Promise<void> {
  if (pool) {
    const currentPool = pool;
    pool = undefined;
    await currentPool.end();
  }
}

export function createDatabasePool(options: {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean;
  rejectUnauthorized?: boolean;
}): DatabasePool {
  return new Pool({
    connectionString: options.connectionString,
    max: options.max,
    idleTimeoutMillis: options.idleTimeoutMillis,
    connectionTimeoutMillis: options.connectionTimeoutMillis,
    ssl: options.ssl
      ? { rejectUnauthorized: options.rejectUnauthorized !== false }
      : undefined,
  });
}
