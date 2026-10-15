import { describe, expect, it } from 'vitest';
import { DEFAULT_JWT_SECRET, validateJwtSecret } from '../config/env.js';

describe('JWT configuration', () => {
  it('allows the local development fallback', () => {
    expect(validateJwtSecret('development', undefined)).toBe(DEFAULT_JWT_SECRET);
  });

  it('rejects a missing or default secret in production without exposing a secret', () => {
    expect(() => validateJwtSecret('production', undefined)).toThrow(
      'JWT_SECRET must be explicitly configured in production.'
    );
    expect(() => validateJwtSecret('production', DEFAULT_JWT_SECRET)).toThrow(
      'JWT_SECRET must be explicitly configured in production.'
    );
  });

  it('accepts an explicitly configured production secret', () => {
    expect(validateJwtSecret('production', 'a-production-secret')).toBe('a-production-secret');
  });
});
