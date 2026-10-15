import { describe, expect, it } from 'vitest';
import { DatabasePool } from '../db/pool.js';
import { EquipmentRepository } from '../repositories/equipmentRepository.js';
import { Equipment } from '../types/index.js';

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

const row = {
  id: 'eq_1',
  owner_id: 'user_1',
  category_id: null,
  title: 'Tractor',
  description: null,
  hourly_rate: '900.00',
  daily_rate: '6500.00',
  location_name: 'Nashik',
  approx_lat: '20.198300',
  approx_lng: null,
  status: 'active',
  rating_avg: '4.80',
  rating_count: 5,
  image_url: null,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  owner_full_name: 'Rahul Sharma',
};

describe('EquipmentRepository', () => {
  it('maps joined equipment and owner rows, including PostgreSQL numerics', async () => {
    const database = new FakeDatabase();
    database.rows = [row];
    const repository = new EquipmentRepository(database.asPool());

    await expect(repository.findAvailable()).resolves.toEqual([{
      equipment: expect.objectContaining({
        id: 'eq_1',
        hourly_rate: 900,
        daily_rate: 6500,
        approx_lat: 20.1983,
        approx_lng: undefined,
        image_url: undefined,
      }),
      owner: { id: 'user_1', fullName: 'Rahul Sharma' },
    }]);
    expect(database.calls[0].text).toContain('WHERE e.status = $1');
    expect(database.calls[0].values).toEqual(['active']);
  });

  it('uses parameterized lookup and maps categories', async () => {
    const database = new FakeDatabase();
    const repository = new EquipmentRepository(database.asPool());
    database.rows = [row];

    await repository.findById('eq_1');
    expect(database.calls[0].values).toEqual(['eq_1']);

    database.rows = [{ id: 'cat_1', name: 'Tractors', description: null }];
    await expect(repository.findCategories()).resolves.toEqual([{
      id: 'cat_1',
      name: 'Tractors',
      description: undefined,
    }]);
  });

  it('writes only mapped equipment fields with parameterized values', async () => {
    const database = new FakeDatabase();
    database.rows = [row];
    const repository = new EquipmentRepository(database.asPool());
    const equipment: Equipment = {
      id: 'eq_1',
      owner_id: 'user_1',
      title: 'Tractor',
      hourly_rate: 900,
      location_name: 'Nashik',
      status: 'active',
      rating_avg: 5,
      rating_count: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    await repository.create(equipment);
    expect(database.calls[0].text).toContain('INSERT INTO equipment');
    expect(database.calls[0].text).toContain('$2');
    expect(database.calls[0].values).toContain('user_1');
  });

  it('builds parameterized marketplace filters and update/deactivation queries', async () => {
    const database = new FakeDatabase();
    database.rows = [row];
    const repository = new EquipmentRepository(database.asPool());

    await repository.findAvailable(database, {
      categoryId: 'cat_1',
      location: 'Nashik',
      minPrice: 500,
      maxPrice: 1000,
      startDate: '2031-01-01T10:00:00.000Z',
      endDate: '2031-01-01T12:00:00.000Z',
    });
    expect(database.calls[0].text).toContain('e.category_id =');
    expect(database.calls[0].text).toContain('e.location_name ILIKE');
    expect(database.calls[0].text).toContain('equipment_availability_windows');
    expect(database.calls[0].values).toEqual([
      'active',
      'cat_1',
      '%Nashik%',
      500,
      1000,
      '2031-01-01T10:00:00.000Z',
      '2031-01-01T12:00:00.000Z',
    ]);

    await repository.update('eq_1', { title: 'Updated', hourly_rate: 950 });
    expect(database.calls[1].text).toContain('UPDATE equipment');
    expect(database.calls[1].text.split('RETURNING')[0]).not.toContain('owner_id');

    await repository.deactivate('eq_1');
    expect(database.calls[2].text).toContain("status = 'inactive'");
  });
});
