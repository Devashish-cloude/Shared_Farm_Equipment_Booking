export interface PostgresError {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
}

export type DatabaseErrorKind =
  | 'unique_violation'
  | 'exclusion_violation'
  | 'foreign_key_violation'
  | 'check_violation'
  | 'connection_error'
  | 'unknown';

export function classifyDatabaseError(error: unknown): DatabaseErrorKind {
  const databaseError = error as PostgresError;

  switch (databaseError.code) {
    case '23505':
      return 'unique_violation';
    case '23P01':
      return 'exclusion_violation';
    case '23503':
      return 'foreign_key_violation';
    case '23514':
      return 'check_violation';
    case '08000':
    case '08003':
    case '08006':
      return 'connection_error';
    default:
      return 'unknown';
  }
}

export function isDatabaseError(error: unknown, kind: DatabaseErrorKind): boolean {
  return classifyDatabaseError(error) === kind;
}
