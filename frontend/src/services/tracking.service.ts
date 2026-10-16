import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { TelemetryData } from '../types';

export const trackingService = {
  async getTelemetry(bookingId: string): Promise<TelemetryData | null> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
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

    try {
      const { data, error } = await supabase
        .from('rental_tracking')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        lat: Number(data.last_latitude ?? 22.5692),
        lng: Number(data.last_longitude ?? 72.9341),
        speedKmph: Number(data.speed_kmph ?? 0),
        fuelLevelPercent: Number(data.fuel_level_percent ?? 90),
        engineStatus: data.engine_status || 'off',
        lastUpdated: new Date(data.updated_at || data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        batteryVoltage: Number(data.battery_voltage ?? 12.6),
        hoursWorkedToday: Number(data.hours_worked_today ?? 0),
        isSimulated: Boolean(data.is_simulated),
      };
    } catch (err: any) {
      console.error(`Failed to fetch telemetry for booking ${bookingId}:`, err);
      return null;
    }
  },
};
