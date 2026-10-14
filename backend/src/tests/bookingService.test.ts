import { describe, expect, it } from 'vitest';
import { DatabasePool } from '../db/pool.js';
import { BookingService, BookingServiceError } from '../services/bookingService.js';

const equipmentRow = {
  id: 'eq_1',
  owner_id: 'owner_1',
  category_id: null,
  title: 'Tractor',
  description: null,
  hourly_rate: '900.00',
  daily_rate: '6500.00',
  location_name: 'Nashik',
  approx_lat: '20.1',
  approx_lng: '74.1',
  status: 'active',
  rating_avg: '4.8',
  rating_count: 5,
  image_url: null,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  owner_full_name: 'Owner',
};

class FakeClient {
  public readonly calls: string[] = [];
  public overlap = false;
  public currentBooking = {
    id: 'book_1',
    renter_id: 'renter_1',
    equipment_id: 'eq_1',
    start_date: new Date('2026-02-01T10:00:00.000Z'),
    end_date: new Date('2026-02-01T12:00:00.000Z'),
    total_hours: '2.00',
    hourly_rate: '900.00',
    base_price: '1800.00',
    platform_fee: '90.00',
    total_price: '1890.00',
    status: 'pending',
    notes: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  public async query<T = Record<string, unknown>>(
    text: string,
    _values?: unknown[]
  ): Promise<{ rows: T[] }> {
    this.calls.push(text);
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
      return { rows: [] as T[] };
    }
    if (text.includes('FROM equipment e') && text.includes('FOR UPDATE')) {
      return { rows: [equipmentRow] as T[] };
    }
    if (text.includes('SELECT EXISTS')) {
      return { rows: [{ exists: this.overlap }] as T[] };
    }
    if (text.includes('FROM bookings b')) {
      return {
        rows: [{
          ...this.currentBooking,
          owner_id: equipmentRow.owner_id,
          category_id: equipmentRow.category_id,
          title: equipmentRow.title,
          description: equipmentRow.description,
          equipment_hourly_rate: equipmentRow.hourly_rate,
          equipment_status: equipmentRow.status,
          equipment_daily_rate: equipmentRow.daily_rate,
          daily_rate: equipmentRow.daily_rate,
          location_name: equipmentRow.location_name,
          approx_lat: equipmentRow.approx_lat,
          approx_lng: equipmentRow.approx_lng,
          rating_avg: equipmentRow.rating_avg,
          rating_count: equipmentRow.rating_count,
          image_url: equipmentRow.image_url,
          equipment_created_at: equipmentRow.created_at,
          equipment_updated_at: equipmentRow.updated_at,
          renter_full_name: 'Renter',
          renter_phone: null,
        }] as T[],
      };
    }
    if (text.includes('INSERT INTO bookings')) {
      return { rows: [this.currentBooking] as T[] };
    }
    if (text.includes('UPDATE bookings')) {
      this.currentBooking.status = 'accepted';
      return { rows: [this.currentBooking] as T[] };
    }
    return { rows: [] as T[] };
  }

  public release(): void {}
}

function createService(client: FakeClient): BookingService {
  const pool: DatabasePool = {
    connect: async () => client as never,
    query: async () => ({ rows: [] }),
    end: async () => undefined,
  };
  return new BookingService(pool);
}

describe('BookingService', () => {
  it('derives duration and prices from persisted equipment rates', async () => {
    const client = new FakeClient();
    const result = await createService(client).createPending({
      renterId: 'renter_1',
      equipmentId: 'eq_1',
      startDate: '2026-02-01T10:00:00.000Z',
      endDate: '2026-02-01T12:30:00.000Z',
      notes: 'Test',
    });

    expect(result.booking.total_hours).toBe(2.5);
    expect(result.booking.hourly_rate).toBe(900);
    expect(result.booking.base_price).toBe(2250);
    expect(result.booking.platform_fee).toBe(112.5);
    expect(result.booking.total_price).toBe(2362.5);
    expect(result.booking.status).toBe('pending');
  });

  it('rejects invalid periods and self-booking', async () => {
    await expect(createService(new FakeClient()).createPending({
      renterId: 'renter_1',
      equipmentId: 'eq_1',
      startDate: '2026-02-01T12:00:00.000Z',
      endDate: '2026-02-01T10:00:00.000Z',
    })).rejects.toMatchObject({ status: 400 });

    const client = new FakeClient();
    await expect(createService(client).createPending({
      renterId: 'owner_1',
      equipmentId: 'eq_1',
      startDate: '2026-02-01T10:00:00.000Z',
      endDate: '2026-02-01T12:00:00.000Z',
    })).rejects.toThrow('own equipment');
  });

  it('rejects conflicting acceptance and enforces transitions', async () => {
    const client = new FakeClient();
    client.overlap = true;
    await expect(createService(client).transition('book_1', 'accepted', 'owner_1', false))
      .rejects.toMatchObject({ status: 409 });

    client.overlap = false;
    client.currentBooking.status = 'completed';
    await expect(createService(client).transition('book_1', 'accepted', 'owner_1', false))
      .rejects.toMatchObject({ status: 400 });
  });
});
