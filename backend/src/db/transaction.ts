export interface TransactionClient {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
  release(): void;
}

export interface TransactionPool {
  connect(): Promise<TransactionClient>;
}

export async function withTransaction<T>(
  pool: TransactionPool,
  callback: (client: TransactionClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[Database] Transaction rollback failed:', rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
