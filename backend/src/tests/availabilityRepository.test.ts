import { describe, expect, it } from 'vitest';
import { DatabasePool } from '../db/pool.js';
import { AvailabilityRepository } from '../repositories/availabilityRepository.js';

class FakeDatabase {
  public readonly calls: Array<{ text: string; values?: unknown[] }> = [];
  public rows: unknown[] = [];

  public async query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }> {
    this.calls.push({ text, values });
    return { rows: this.rows as T[] };
  }

  public asPool(): DatabasePool {
    return {
      connect: async () => {
        throw new Error('connect was not expected');
      },
      query: <T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        values?: unknown[]
      ) => this.query<T>(text, values),
      end: async () => undefined,
    };
  }
}

describe('AvailabilityRepository', () => {
  it('maps availability and blocked period rows and uses parameterized queries', async () => {
    const database = new FakeDatabase();
    database.rows = [{
      id: 'availability_1',
      equipment_id: 'eq_1',
      start_date: new Date('2031-01-01T10:00:00.000Z'),
      end_date: new Date('2031-01-01T12:00:00.000Z'),
      created_at: new Date('2030-12-01T00:00:00.000Z'),
    }];
    const repository = new AvailabilityRepository(database.asPool());

    await expect(repository.findWindows('eq_1')).resolves.toEqual([
      expect.objectContaining({
        id: 'availability_1',
        start_date: '2031-01-01T10:00:00.000Z',
        end_date: '2031-01-01T12:00:00.000Z',
      }),
    ]);
    expect(database.calls[0].values).toEqual(['eq_1']);

    await repository.findBlockedPeriods('eq_1');
    expect(database.calls[1].text).toContain('equipment_blocked_periods');
  });

  it('checks booking availability with half-open overlap predicates', async () => {
    const database = new FakeDatabase();
    database.rows = [{ available: true }];
    const repository = new AvailabilityRepository(database.asPool());

    await expect(repository.isBookable(
      'eq_1',
      '2031-01-01T10:00:00.000Z',
      '2031-01-01T12:00:00.000Z',
      database
    )).resolves.toBe(true);
    expect(database.calls[0].text).toContain('start_date < $3');
    expect(database.calls[0].text).toContain('end_date > $2');
    expect(database.calls[0].values).toEqual([
      'eq_1',
      '2031-01-01T10:00:00.000Z',
      '2031-01-01T12:00:00.000Z',
    ]);
  });

  it('writes and deletes periods with ownership scoped SQL', async () => {
    const database = new FakeDatabase();
    database.rows = [{
      id: 'availability_1',
      equipment_id: 'eq_1',
      start_date: new Date('2031-01-01T10:00:00.000Z'),
      end_date: new Date('2031-01-01T12:00:00.000Z'),
      created_at: new Date('2030-12-01T00:00:00.000Z'),
    }];
    const repository = new AvailabilityRepository(database.asPool());

    await repository.createWindow({
      id: 'availability_1',
      equipment_id: 'eq_1',
      start_date: '2031-01-01T10:00:00.000Z',
      end_date: '2031-01-01T12:00:00.000Z',
      created_at: '2030-12-01T00:00:00.000Z',
    }, database);
    expect(database.calls[0].text).toContain('INSERT INTO equipment_availability_windows');

    await expect(repository.deleteWindow('eq_1', 'availability_1', database)).resolves.toBe(true);
    expect(database.calls[1].text).toContain('WHERE id = $1 AND equipment_id = $2');
  });
});
