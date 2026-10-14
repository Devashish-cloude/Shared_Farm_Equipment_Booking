import { describe, expect, it } from 'vitest';
import { RentalSessionRepository } from '../repositories/rentalSessionRepository.js';
import { TrackingRepository } from '../repositories/trackingRepository.js';
import { TrackingService } from '../services/trackingService.js';

describe('Rental session and tracking persistence', () => {
  it('maps nullable session fields and tracking numerics', async () => {
    const sessionClient = {
      query: async () => ({
        rows: [{
          id: 'session_1',
          booking_id: 'booking_1',
          started_by: 'user_1',
          start_time: '2030-01-01T10:00:00.000Z',
          end_time: null,
          session_status: 'active',
          notes: null,
          created_at: '2030-01-01T10:00:00.000Z',
          updated_at: '2030-01-01T10:00:00.000Z',
        }],
      }),
    };
    const pointClient = {
      query: async () => ({
        rows: [{
          id: 'point_1',
          session_id: 'session_1',
          booking_id: 'booking_1',
          latitude: '20.1234567',
          longitude: '74.1234567',
          source: 'simulated_gps',
          speed_kmh: '12.50',
          heading_deg: null,
          recorded_at: '2030-01-01T10:01:00.000Z',
          created_at: '2030-01-01T10:01:00.000Z',
        }],
      }),
    };
    const session = await new RentalSessionRepository({} as never).findActive('booking_1', sessionClient);
    const point = await new TrackingRepository({} as never).latest('booking_1', pointClient);
    expect(session?.end_time).toBeUndefined();
    expect(point?.latitude).toBe(20.1234567);
    expect(point?.speed_kmh).toBe(12.5);
    expect(point?.heading_deg).toBeUndefined();
  });

  it('rolls back rental start when a notification insert fails', async () => {
    const now = '2031-01-01T00:00:00.000Z';
    const statements: string[] = [];
    const bookingRow = {
      id: 'book_1', renter_id: 'renter_1', equipment_id: 'eq_1',
      start_date: now, end_date: now, total_hours: 2, hourly_rate: 900, base_price: 1800,
      platform_fee: 90, total_price: 1890, status: 'confirmed', notes: null,
      created_at: now, updated_at: now, owner_id: 'owner_1', category_id: null, title: 'Tractor',
      description: null, equipment_hourly_rate: 900, daily_rate: null, location_name: 'Farm',
      approx_lat: null, approx_lng: null, equipment_status: 'active', rating_avg: 0, rating_count: 0,
      image_url: null, equipment_created_at: now, equipment_updated_at: now,
      owner_full_name: 'Owner', renter_full_name: 'Renter', renter_phone: null,
    };
    const sessionRow = {
      id: 'sess_1', booking_id: 'book_1', started_by: 'renter_1', start_time: now, end_time: null,
      session_status: 'active', notes: 'started', created_at: now, updated_at: now,
    };
    const client = {
      released: false,
      query: async (text: string) => {
        statements.push(text);
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
        if (text.includes('SELECT id FROM bookings')) return { rows: [{ id: 'book_1' }] };
        if (text.includes('FROM bookings b')) return { rows: [bookingRow] };
        if (text.includes('FROM rental_sessions')) return { rows: [] };
        if (text.includes('INSERT INTO rental_sessions')) return { rows: [sessionRow] };
        if (text.includes("UPDATE bookings SET status = 'in_progress'")) return { rows: [{ id: 'book_1' }] };
        if (text.includes('INSERT INTO notifications')) throw new Error('notification insert failed');
        return { rows: [] };
      },
      release: () => {
        client.released = true;
      },
    };
    const service = new TrackingService({
      connect: async () => client,
      query: async () => ({ rows: [] }),
      end: async () => undefined,
    } as never);
    await expect(service.start('book_1', 'renter_1', false)).rejects.toThrow('notification insert failed');
    expect(statements.some((sql) => sql === 'ROLLBACK')).toBe(true);
    expect(statements.some((sql) => sql === 'COMMIT')).toBe(false);
    expect(client.released).toBe(true);
  });

  it('validates coordinates before opening a transaction', async () => {
    const pool = {
      connect: async () => {
        throw new Error('transaction must not start');
      },
    };
    const service = new TrackingService(pool as never);
    await expect(service.ingest('booking_1', 'user_1', false, {
      latitude: 91,
      longitude: 10,
    })).rejects.toMatchObject({ status: 400 });
  });
});
