import { describe, it, expect } from 'vitest';
import { bookingsService } from '../services/bookings.service';
import { mockStore } from '../services/mockStore';

describe('Booking Lifecycle & State Transitions', () => {
  it('allows accepting an incoming booking request', async () => {
    // Incoming request: bk-req-201
    const accepted = await bookingsService.acceptRequest('bk-req-201');
    expect(accepted.status).toBe('accepted');
  });

  it('allows starting and ending a rental session with telemetry activation', async () => {
    const started = await bookingsService.startRental('bk-req-201');
    expect(started.status).toBe('active');
    expect(started.telemetryActive).toBe(true);

    const ended = await bookingsService.endRental('bk-req-201');
    expect(ended.status).toBe('completed');
    expect(ended.telemetryActive).toBe(false);
  });

  it('allows cancelling a booking with reason and deposit refund', async () => {
    const cancelled = await bookingsService.cancelBooking('bk-up-102', 'Sudden unseasonal rain');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.paymentStatus).toBe('refunded');
    expect(cancelled.cancellationReason).toBe('Sudden unseasonal rain');
  });
});
