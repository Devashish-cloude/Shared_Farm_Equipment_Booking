import { apiClient } from './api';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { Booking } from '../types';

export const bookingsService = {
  async getMyRentals(): Promise<Booking[]> {
    if (isDemoModeActive()) {
      const user = mockStore.getUser();
      return mockStore.getBookings().filter(b => b.renterId === user.id);
    }
    const res = await apiClient.get<Booking[]>('/bookings/my-rentals');
    return res.data;
  },

  async getMyRequests(): Promise<Booking[]> {
    if (isDemoModeActive()) {
      const user = mockStore.getUser();
      return mockStore.getBookings().filter(b => b.ownerId === user.id);
    }
    const res = await apiClient.get<Booking[]>('/bookings/incoming-requests');
    return res.data;
  },

  async getById(id: string): Promise<Booking | null> {
    if (isDemoModeActive()) {
      return mockStore.getBookingById(id) || null;
    }
    const res = await apiClient.get<Booking>(`/bookings/${id}`);
    return res.data;
  },

  async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'status' | 'paymentStatus'>): Promise<Booking> {
    if (isDemoModeActive()) {
      return mockStore.createBooking(bookingData);
    }
    const res = await apiClient.post<Booking>('/bookings', bookingData);
    return res.data;
  },

  async acceptRequest(bookingId: string): Promise<Booking> {
    if (isDemoModeActive()) {
      return mockStore.updateBookingStatus(bookingId, 'accepted');
    }
    const res = await apiClient.patch<Booking>(`/bookings/${bookingId}/accept`);
    return res.data;
  },

  async rejectRequest(bookingId: string, reason?: string): Promise<Booking> {
    if (isDemoModeActive()) {
      return mockStore.updateBookingStatus(bookingId, 'rejected', { cancellationReason: reason });
    }
    const res = await apiClient.patch<Booking>(`/bookings/${bookingId}/reject`, { reason });
    return res.data;
  },

  async startRental(bookingId: string): Promise<Booking> {
    if (isDemoModeActive()) {
      return mockStore.updateBookingStatus(bookingId, 'active');
    }
    const res = await apiClient.patch<Booking>(`/bookings/${bookingId}/start`);
    return res.data;
  },

  async endRental(bookingId: string): Promise<Booking> {
    if (isDemoModeActive()) {
      return mockStore.updateBookingStatus(bookingId, 'completed');
    }
    const res = await apiClient.patch<Booking>(`/bookings/${bookingId}/end`);
    return res.data;
  },

  async cancelBooking(bookingId: string, reason: string): Promise<Booking> {
    if (isDemoModeActive()) {
      return mockStore.updateBookingStatus(bookingId, 'cancelled', {
        cancellationReason: reason,
        paymentStatus: 'refunded',
      });
    }
    const res = await apiClient.patch<Booking>(`/bookings/${bookingId}/cancel`, { reason });
    return res.data;
  },
};
