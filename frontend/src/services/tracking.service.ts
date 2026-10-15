import { apiClient } from './api';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { TelemetryData } from '../types';

export const trackingService = {
  async getTelemetry(bookingId: string): Promise<TelemetryData | null> {
    if (isDemoModeActive()) {
      const booking = mockStore.getBookingById(bookingId);
      if (!booking || !booking.currentTelemetry) {
        // Return realistic simulated tractor telemetry for active bookings
        return {
          lat: 22.5692 + (Math.random() - 0.5) * 0.001,
          lng: 72.9341 + (Math.random() - 0.5) * 0.001,
          speedKmph: 7.2,
          fuelLevelPercent: 73,
          engineStatus: 'running',
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          batteryVoltage: 13.8,
          hoursWorkedToday: 3.4,
          isSimulated: true,
        };
      }
      return {
        ...booking.currentTelemetry,
        lat: booking.currentTelemetry.lat + (Math.random() - 0.5) * 0.0005,
        lng: booking.currentTelemetry.lng + (Math.random() - 0.5) * 0.0005,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    }
    const res = await apiClient.get<TelemetryData>(`/tracking/${bookingId}`);
    return res.data;
  },
};
