import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { Booking } from '../types';
import { resolveEquipmentImage } from '../lib/equipmentImages';

/**
 * Maps a Supabase booking row with nested equipment, renter, and owner profiles
 * to the frontend Booking model.
 */
export function mapSupabaseBooking(row: any): Booking {
  const eq = Array.isArray(row.equipment) ? row.equipment[0] : (row.equipment || {});
  const renter = Array.isArray(row.renter) ? row.renter[0] : (row.renter || {});
  const owner = Array.isArray(row.owner) ? row.owner[0] : (row.owner || {});
  const eqImages = eq.images || eq.image_urls || [];
  const primaryImage = resolveEquipmentImage(eqImages, null, eq.category);

  return {
    id: row.id,
    equipmentId: row.equipment_id,
    equipmentName: eq.title || eq.name || 'Farm Equipment',
    equipmentCategory: eq.category || 'Tractors',
    equipmentImage: primaryImage,
    renterId: row.renter_id,
    renterName: renter.full_name || 'Renter',
    renterPhone: renter.phone || '',
    renterVillage: renter.village || '',
    ownerId: row.owner_id,
    ownerName: owner.full_name || 'Equipment Owner',
    ownerPhone: owner.phone || '',
    startDate: row.start_date,
    endDate: row.end_date,
    durationHours: Number(row.duration_hours || 0),
    withOperator: Boolean(row.with_operator),
    basePrice: Number(row.base_price || 0),
    operatorPrice: Number(row.operator_price || 0),
    platformFee: Number(row.platform_fee || 0),
    securityDeposit: Number(row.security_deposit || 0),
    totalPrice: Number(row.total_price || 0),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    createdAt: row.created_at || new Date().toISOString(),
    renterNotes: row.renter_notes,
    cancellationReason: row.cancellation_reason,
  };
}

export const bookingsService = {
  async getMyRentals(renterId?: string): Promise<Booking[]> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      const user = mockStore.getActiveUser();
      const targetId = renterId || user?.id;
      if (!targetId) return [];
      return mockStore.getBookings().filter(b => b.renterId === targetId);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = renterId || sessionData?.session?.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          equipment:equipment_id(id, title, name, category, images, image_urls),
          renter:renter_id(id, full_name, phone, village),
          owner:owner_id(id, full_name, phone)
        `)
        .eq('renter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback without disambiguated joins
        const fallback = await supabase
          .from('bookings')
          .select('*')
          .eq('renter_id', userId)
          .order('created_at', { ascending: false });
        if (fallback.error) throw new Error(fallback.error.message);
        return (fallback.data || []).map(mapSupabaseBooking);
      }

      return (data || []).map(mapSupabaseBooking);
    } catch (err: any) {
      console.error('Failed to fetch renter bookings:', err);
      throw new Error(err.message || 'Failed to load rental bookings');
    }
  },

  async getMyRequests(ownerId?: string): Promise<Booking[]> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      const user = mockStore.getActiveUser();
      const targetId = ownerId || user?.id;
      if (!targetId) return [];
      return mockStore.getBookings().filter(b => b.ownerId === targetId);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = ownerId || sessionData?.session?.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          equipment:equipment_id(id, title, name, category, images, image_urls),
          renter:renter_id(id, full_name, phone, village),
          owner:owner_id(id, full_name, phone)
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        const fallback = await supabase
          .from('bookings')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });
        if (fallback.error) throw new Error(fallback.error.message);
        return (fallback.data || []).map(mapSupabaseBooking);
      }

      return (data || []).map(mapSupabaseBooking);
    } catch (err: any) {
      console.error('Failed to fetch owner booking requests:', err);
      throw new Error(err.message || 'Failed to load booking requests');
    }
  },

  async getById(id: string): Promise<Booking | null> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.getBookingById(id) || null;
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          equipment:equipment_id(id, title, name, category, images, image_urls),
          renter:renter_id(id, full_name, phone, village),
          owner:owner_id(id, full_name, phone)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        const fallback = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
        if (fallback.error) throw new Error(fallback.error.message);
        return fallback.data ? mapSupabaseBooking(fallback.data) : null;
      }

      return data ? mapSupabaseBooking(data) : null;
    } catch (err: any) {
      console.error(`Failed to fetch booking ${id}:`, err);
      throw new Error(err.message || 'Failed to load booking details');
    }
  },

  /**
   * Creates a booking with atomic double-booking prevention, concurrency locks,
   * and server-side pricing verification via Supabase RPC.
   */
  async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'status' | 'paymentStatus'>): Promise<Booking> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.createBooking(bookingData);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      throw new Error('Authentication required to book equipment.');
    }

    // Call atomic function: creates booking with SELECT ... FOR UPDATE and conflict prevention
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_booking_atomic', {
      p_equipment_id: bookingData.equipmentId,
      p_start_date: bookingData.startDate,
      p_end_date: bookingData.endDate,
      p_with_operator: Boolean(bookingData.withOperator),
      p_notes: bookingData.renterNotes || null,
    });

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    const bookingId = rpcData?.id;
    if (bookingId) {
      const fullBooking = await this.getById(bookingId);
      if (fullBooking) return fullBooking;
    }

    return mapSupabaseBooking(rpcData);
  },

  async acceptRequest(bookingId: string): Promise<Booking> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.updateBookingStatus(bookingId, 'accepted');
    }

    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'accepted' })
      .eq('id', bookingId);

    if (error) throw new Error(`Failed to accept booking: ${error.message}`);

    // Notify renter
    await supabase.from('notifications').insert({
      user_id: booking.renterId,
      title: 'Booking Request Accepted!',
      message: `Your booking for "${booking.equipmentName}" was accepted by the owner.`,
      type: 'booking',
      reference_id: bookingId,
      reference_type: 'booking',
      link: '/dashboard/rentals',
    });

    return (await this.getById(bookingId))!;
  },

  async rejectRequest(bookingId: string, reason?: string): Promise<Booking> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.updateBookingStatus(bookingId, 'rejected', { cancellationReason: reason });
    }

    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'rejected',
        cancellation_reason: reason || 'Declined by owner',
      })
      .eq('id', bookingId);

    if (error) throw new Error(`Failed to reject booking: ${error.message}`);

    // Notify renter
    await supabase.from('notifications').insert({
      user_id: booking.renterId,
      title: 'Booking Request Declined',
      message: `Your booking request for "${booking.equipmentName}" was declined.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'booking',
      reference_id: bookingId,
      reference_type: 'booking',
      link: '/dashboard/rentals',
    });

    return (await this.getById(bookingId))!;
  },

  async startRental(bookingId: string): Promise<Booking> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.updateBookingStatus(bookingId, 'active');
    }

    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'active' })
      .eq('id', bookingId);

    if (error) throw new Error(`Failed to start rental: ${error.message}`);

    // Initialize or update rental tracking row
    await supabase.from('rental_tracking').upsert({
      booking_id: bookingId,
      equipment_id: booking.equipmentId,
      owner_id: booking.ownerId,
      renter_id: booking.renterId,
      status: 'active',
      pickup_at: new Date().toISOString(),
      expected_return_at: booking.endDate,
      last_latitude: 22.5692,
      last_longitude: 72.9341,
      speed_kmph: 6.8,
      fuel_level_percent: 85,
      engine_status: 'running',
      battery_voltage: 13.6,
      hours_worked_today: 1.2,
      is_simulated: true,
    }, { onConflict: 'booking_id' });

    // Update equipment availability status to in-use
    await supabase
      .from('equipment')
      .update({ availability_status: 'in-use', status: 'in-use' })
      .eq('id', booking.equipmentId);

    return (await this.getById(bookingId))!;
  },

  async endRental(bookingId: string): Promise<Booking> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.updateBookingStatus(bookingId, 'completed');
    }

    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);

    if (error) throw new Error(`Failed to end rental: ${error.message}`);

    // Update rental tracking status
    await supabase
      .from('rental_tracking')
      .update({
        status: 'completed',
        returned_at: new Date().toISOString(),
        engine_status: 'off',
        speed_kmph: 0,
      })
      .eq('booking_id', bookingId);

    // Restore equipment availability status to available
    await supabase
      .from('equipment')
      .update({ availability_status: 'available', status: 'available' })
      .eq('id', booking.equipmentId);

    // Notify renter to leave a review
    await supabase.from('notifications').insert({
      user_id: booking.renterId,
      title: 'Rental Completed',
      message: `Your rental of "${booking.equipmentName}" is complete. Leave a rating to help the community!`,
      type: 'rental',
      reference_id: bookingId,
      reference_type: 'booking',
      link: '/dashboard/rentals',
    });

    return (await this.getById(bookingId))!;
  },

  async cancelBooking(bookingId: string, reason: string): Promise<Booking> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.updateBookingStatus(bookingId, 'cancelled', {
        cancellationReason: reason,
        paymentStatus: 'refunded',
      });
    }

    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        payment_status: 'refunded',
      })
      .eq('id', bookingId);

    if (error) throw new Error(`Failed to cancel booking: ${error.message}`);

    // If equipment was in-use, restore availability
    await supabase
      .from('equipment')
      .update({ availability_status: 'available', status: 'available' })
      .eq('id', booking.equipmentId);

    return (await this.getById(bookingId))!;
  },
};
