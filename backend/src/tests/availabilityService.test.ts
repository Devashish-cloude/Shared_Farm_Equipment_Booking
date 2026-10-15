import { beforeEach, describe, expect, it } from 'vitest';
import { AvailabilityService } from '../services/availabilityService.js';
import { store } from '../services/store.js';

describe('AvailabilityService in-memory persistence', () => {
  beforeEach(() => {
    store.reset();
  });

  it('allows only the owner or admin to manage periods', async () => {
    const service = new AvailabilityService();

    await expect(service.createAvailability(
      'eq_tractor_rahul',
      { startDate: '2031-01-01T10:00:00.000Z', endDate: '2031-01-01T12:00:00.000Z' },
      'user_amit',
      false
    )).rejects.toMatchObject({ status: 403 });

    await expect(service.createAvailability(
      'eq_tractor_rahul',
      { startDate: '2031-01-01T10:00:00.000Z', endDate: '2031-01-01T12:00:00.000Z' },
      'user_rahul',
      false
    )).resolves.toMatchObject({ equipment_id: 'eq_tractor_rahul' });

    await expect(service.createBlockedPeriod(
      'eq_tractor_rahul',
      { startDate: '2031-01-01T12:00:00.000Z', endDate: '2031-01-01T13:00:00.000Z' },
      'user_admin',
      true
    )).resolves.toMatchObject({ equipment_id: 'eq_tractor_rahul' });
  });

  it('rejects invalid and overlapping periods but accepts adjacent periods', async () => {
    const service = new AvailabilityService();
    const first = {
      startDate: '2031-01-01T10:00:00.000Z',
      endDate: '2031-01-01T12:00:00.000Z',
    };

    await expect(service.createAvailability('eq_tractor_rahul', {
      startDate: 'not-a-date',
      endDate: first.endDate,
    }, 'user_rahul', false)).rejects.toMatchObject({ status: 400 });

    await service.createAvailability('eq_tractor_rahul', first, 'user_rahul', false);
    await expect(service.createAvailability('eq_tractor_rahul', {
      startDate: '2031-01-01T11:00:00.000Z',
      endDate: '2031-01-01T13:00:00.000Z',
    }, 'user_rahul', false)).rejects.toMatchObject({ status: 409 });

    await expect(service.createAvailability('eq_tractor_rahul', {
      startDate: '2031-01-01T12:00:00.000Z',
      endDate: '2031-01-01T14:00:00.000Z',
    }, 'user_rahul', false)).resolves.toMatchObject({ start_date: '2031-01-01T12:00:00.000Z' });
  });

  it('blocks acceptance only when a booking is outside windows or overlaps a block', async () => {
    const service = new AvailabilityService();
    expect(await service.isBookableInMemory(
      'eq_tractor_rahul',
      '2031-01-01T10:00:00.000Z',
      '2031-01-01T12:00:00.000Z'
    )).toBe(true);

    await service.createAvailability('eq_tractor_rahul', {
      startDate: '2031-01-01T10:00:00.000Z',
      endDate: '2031-01-01T14:00:00.000Z',
    }, 'user_rahul', false);
    expect(await service.isBookableInMemory(
      'eq_tractor_rahul',
      '2031-01-01T14:00:00.000Z',
      '2031-01-01T15:00:00.000Z'
    )).toBe(false);

    await service.createBlockedPeriod('eq_tractor_rahul', {
      startDate: '2031-01-01T12:00:00.000Z',
      endDate: '2031-01-01T13:00:00.000Z',
    }, 'user_rahul', false);
    expect(await service.isBookableInMemory(
      'eq_tractor_rahul',
      '2031-01-01T11:00:00.000Z',
      '2031-01-01T12:00:00.000Z'
    )).toBe(true);
    expect(await service.isBookableInMemory(
      'eq_tractor_rahul',
      '2031-01-01T12:00:00.000Z',
      '2031-01-01T13:00:00.000Z'
    )).toBe(false);

    const listed = await service.list('eq_tractor_rahul');
    await service.deleteAvailability(
      'eq_tractor_rahul',
      listed.availability[0].id,
      'user_rahul',
      false
    );
    await expect(service.list('eq_tractor_rahul')).resolves.toMatchObject({
      availability: [],
      blockedPeriods: expect.any(Array),
    });
  });
});
