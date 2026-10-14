import { describe, expect, it } from 'vitest';
import { NotificationRepository } from '../repositories/notificationRepository.js';
import { ReviewRepository } from '../repositories/reviewRepository.js';

describe('review and notification repositories', () => {
  it('maps review numerics and nullable notification fields', async () => {
    const review = await new ReviewRepository({} as never).listByEquipment('eq_1', {
      query: async () => ({ rows: [{
        id: 'rev_1', booking_id: 'book_1', equipment_id: 'eq_1', reviewer_id: 'u_1',
        reviewee_id: 'u_2', rating: '5', comment: 'Great', review_type: 'renter_to_owner',
        created_at: '2030-01-01T00:00:00Z', updated_at: '2030-01-01T00:00:00Z',
        reviewer_name: 'Farmer',
      }] }),
    });
    const notification = await new NotificationRepository({} as never).listByUser('u_1', {
      query: async () => ({ rows: [{
        id: 'n_1', user_id: 'u_1', title: 'Title', message: 'Message', type: 'tracking_alert',
        reference_id: null, reference_type: null, is_read: false, created_at: '2030-01-01T00:00:00Z',
      }] }),
    });
    expect(review[0].rating).toBe(5);
    expect(review[0].reviewerName).toBe('Farmer');
    expect(notification[0].reference_id).toBeUndefined();
  });

  it('inserts event notifications only when the user/type/reference tuple is absent', async () => {
    const sql: string[] = [];
    const repo = new NotificationRepository({} as never);
    const created = await repo.createIfAbsent({
      userId: 'u_1', title: 'Payment Successful', message: 'paid', type: 'payment_success',
      referenceId: 'book_1', referenceType: 'booking',
    }, {
      query: async (text, values) => {
        sql.push(text);
        expect(values?.[1]).toBe('u_1');
        expect(values?.[4]).toBe('payment_success');
        expect(values?.[5]).toBe('book_1');
        return { rows: [{
          id: 'n_2', user_id: 'u_1', title: 'Payment Successful', message: 'paid', type: 'payment_success',
          reference_id: 'book_1', reference_type: 'booking', is_read: false, created_at: '2030-01-01T00:00:00Z',
        }] };
      },
    });
    expect(created?.id).toBe('n_2');
    expect(sql[0]).toContain('WHERE NOT EXISTS');
    const skipped = await repo.createIfAbsent({
      userId: 'u_1', title: 'Payment Successful', message: 'paid', type: 'payment_success',
      referenceId: 'book_1', referenceType: 'booking',
    }, { query: async () => ({ rows: [] }) });
    expect(skipped).toBeUndefined();
  });

  it('keeps read operations scoped to the authenticated user', async () => {
    const calls: unknown[][] = [];
    const repo = new NotificationRepository({} as never);
    const result = await repo.markRead('n_1', 'u_1', {
      query: async (_sql, values) => {
        calls.push(values || []);
        return { rows: [] };
      },
    });
    expect(result).toBeUndefined();
    expect(calls[0]).toEqual(['n_1', 'u_1']);
  });
});
