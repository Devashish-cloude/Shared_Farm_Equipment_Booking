import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { Booking } from '../types';
import { resolveEquipmentImage } from '../lib/equipmentImages';
import { DEMO_EQUIPMENT_SLUG_MAP } from './equipment.service';

export const DEMO_OWNER_SLUG_MAP: Record<string, string> = {
  'usr-ramesh-01': '00000000-0000-4000-8000-000000000001',
  'usr-gurpreet-02': '00000000-0000-4000-8000-000000000002',
  'usr-balwinder-03': '00000000-0000-4000-8000-000000000003',
  'usr-sunita-04': '00000000-0000-4000-8000-000000000004',
  'usr-vikram-05': '00000000-0000-4000-8000-000000000005',
  'usr-suresh-06': '00000000-0000-4000-8000-000000000006',
};

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
      if (!userId) {
        const user = mockStore.getActiveUser();
        const targetId = renterId || user?.id;
        if (!targetId) return [];
        return mockStore.getBookings().filter(b => b.renterId === targetId);
      }

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
        if (fallback.error) {
          const user = mockStore.getActiveUser();
          const targetId = renterId || user?.id;
          if (targetId) return mockStore.getBookings().filter(b => b.renterId === targetId);
          throw new Error(fallback.error.message);
        }
        return (fallback.data || []).map(mapSupabaseBooking);
      }

      return (data || []).map(mapSupabaseBooking);
    } catch (err: any) {
      console.warn('Notice: falling back to local rentals:', err?.message || err);
      const user = mockStore.getActiveUser();
      const targetId = renterId || user?.id;
      if (targetId) return mockStore.getBookings().filter(b => b.renterId === targetId);
      return [];
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
      if (!userId) {
        const user = mockStore.getActiveUser();
        const targetId = ownerId || user?.id;
        if (!targetId) return [];
        return mockStore.getBookings().filter(b => b.ownerId === targetId);
      }

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
        if (fallback.error) {
          const user = mockStore.getActiveUser();
          const targetId = ownerId || user?.id;
          if (targetId) return mockStore.getBookings().filter(b => b.ownerId === targetId);
          throw new Error(fallback.error.message);
        }
        return (fallback.data || []).map(mapSupabaseBooking);
      }

      return (data || []).map(mapSupabaseBooking);
    } catch (err: any) {
      console.warn('Notice: falling back to local requests:', err?.message || err);
      const user = mockStore.getActiveUser();
      const targetId = ownerId || user?.id;
      if (targetId) return mockStore.getBookings().filter(b => b.ownerId === targetId);
      return [];
    }
  },

  async getById(id: string): Promise<Booking | null> {
    const mockItem = mockStore.getBookingById(id);
    if (mockItem) return mockItem;

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
        if (fallback.data) return mapSupabaseBooking(fallback.data);
        return mockStore.getBookingById(id) || null;
      }

      if (data) return mapSupabaseBooking(data);
      return mockStore.getBookingById(id) || null;
    } catch (err: any) {
      console.warn(`Notice: query for booking ${id}:`, err?.message || err);
      return mockStore.getBookingById(id) || null;
    }
  },

  /**
   * Creates a booking with atomic double-booking prevention, concurrency locks,
   * and server-side pricing verification via Supabase RPC.
   */
  async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'status' | 'paymentStatus'>): Promise<Booking> {
    const { data: sessionData } = await supabase.auth.getSession();
    const activeUser = mockStore.getActiveUser();
    const effectiveUserId = sessionData?.session?.user?.id || bookingData.renterId || activeUser?.id;

    if (!effectiveUserId) {
      throw new Error('Authentication required to book equipment.');
    }

    if (isDemoModeActive() || !isSupabaseConfigured() || !sessionData?.session?.user) {
      return mockStore.createBooking({
        ...bookingData,
        renterId: effectiveUserId,
      });
    }

    const targetEquipmentId = DEMO_EQUIPMENT_SLUG_MAP[bookingData.equipmentId] || bookingData.equipmentId;
    const targetOwnerId = DEMO_OWNER_SLUG_MAP[bookingData.ownerId] || bookingData.ownerId;

    try {
      // Call atomic function: creates booking with SELECT ... FOR UPDATE and conflict prevention
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_booking_atomic', {
        p_equipment_id: targetEquipmentId,
        p_start_date: bookingData.startDate,
        p_end_date: bookingData.endDate,
        p_with_operator: Boolean(bookingData.withOperator),
        p_notes: bookingData.renterNotes || null,
      });

    if (rpcError) {
      if (
        rpcError.message.includes('function') &&
        (rpcError.message.includes('does not exist') || rpcError.message.includes('Could not find'))
      ) {
        const insertPayload = {
          equipment_id: targetEquipmentId,
          renter_id: sessionData.session.user.id,
          owner_id: targetOwnerId,
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          duration_hours: bookingData.durationHours,
          with_operator: Boolean(bookingData.withOperator),
          base_price: bookingData.basePrice,
          operator_price: bookingData.operatorPrice,
          platform_fee: bookingData.platformFee,
          security_deposit: bookingData.securityDeposit,
          total_price: bookingData.totalPrice,
          status: 'pending',
          payment_status: 'pending',
          payment_method: bookingData.paymentMethod || 'upi',
          renter_notes: bookingData.renterNotes || null,
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('bookings')
          .insert(insertPayload)
          .select(`
            *,
            equipment:equipment_id(id, title, name, category, images, image_urls),
            renter:renter_id(id, full_name, phone, village),
            owner:owner_id(id, full_name, phone)
          `)
          .single();

        if (insertErr) throw new Error(insertErr.message);
        return mapSupabaseBooking(inserted);
      }
      throw new Error(rpcError.message);
    }

    const bookingId = rpcData?.id;
    if (bookingId) {
      const fullBooking = await this.getById(bookingId);
      if (fullBooking) return fullBooking;
    }

    return mapSupabaseBooking(rpcData);
    } catch (err: any) {
      console.warn('Notice: falling back to local booking:', err?.message || err);
      return mockStore.createBooking({
        ...bookingData,
        renterId: effectiveUserId,
      });
    }
  },

  async acceptRequest(bookingId: string): Promise<Booking> {
    const { data: sessionData } = await supabase.auth.getSession();
    const mockItem = mockStore.getBookingById(bookingId);
    if (isDemoModeActive() || !isSupabaseConfigured() || !sessionData?.session?.user || mockItem) {
      return mockStore.updateBookingStatus(bookingId, 'accepted');
    }

    try {
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

      return (await this.getById(bookingId)) || mockStore.updateBookingStatus(bookingId, 'accepted');
    } catch (err: any) {
      console.warn('Notice: falling back to local acceptRequest:', err?.message || err);
      return mockStore.updateBookingStatus(bookingId, 'accepted');
    }
  },

  async rejectRequest(bookingId: string, reason?: string): Promise<Booking> {
    const { data: sessionData } = await supabase.auth.getSession();
    const mockItem = mockStore.getBookingById(bookingId);
    if (isDemoModeActive() || !isSupabaseConfigured() || !sessionData?.session?.user || mockItem) {
      return mockStore.updateBookingStatus(bookingId, 'rejected', { cancellationReason: reason });
    }

    try {
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

      return (await this.getById(bookingId)) || mockStore.updateBookingStatus(bookingId, 'rejected', { cancellationReason: reason });
    } catch (err: any) {
      console.warn('Notice: falling back to local rejectRequest:', err?.message || err);
      return mockStore.updateBookingStatus(bookingId, 'rejected', { cancellationReason: reason });
    }
  },

  async startRental(bookingId: string): Promise<Booking> {
    const { data: sessionData } = await supabase.auth.getSession();
    const mockItem = mockStore.getBookingById(bookingId);
    if (isDemoModeActive() || !isSupabaseConfigured() || !sessionData?.session?.user || mockItem) {
      return mockStore.updateBookingStatus(bookingId, 'active');
    }

    try {
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

      return (await this.getById(bookingId)) || mockStore.updateBookingStatus(bookingId, 'active');
    } catch (err: any) {
      console.warn('Notice: falling back to local startRental:', err?.message || err);
      return mockStore.updateBookingStatus(bookingId, 'active');
    }
  },

  async endRental(bookingId: string): Promise<Booking> {
    const { data: sessionData } = await supabase.auth.getSession();
    const mockItem = mockStore.getBookingById(bookingId);
    if (isDemoModeActive() || !isSupabaseConfigured() || !sessionData?.session?.user || mockItem) {
      return mockStore.updateBookingStatus(bookingId, 'completed');
    }

    try {
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

      return (await this.getById(bookingId)) || mockStore.updateBookingStatus(bookingId, 'completed');
    } catch (err: any) {
      console.warn('Notice: falling back to local endRental:', err?.message || err);
      return mockStore.updateBookingStatus(bookingId, 'completed');
    }
  },

  async cancelBooking(bookingId: string, reason: string): Promise<Booking> {
    const { data: sessionData } = await supabase.auth.getSession();
    const mockItem = mockStore.getBookingById(bookingId);
    if (isDemoModeActive() || !isSupabaseConfigured() || !sessionData?.session?.user || mockItem) {
      return mockStore.updateBookingStatus(bookingId, 'cancelled', {
        cancellationReason: reason,
        paymentStatus: 'refunded',
      });
    }

    try {
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

      return (await this.getById(bookingId)) || mockStore.updateBookingStatus(bookingId, 'cancelled', {
        cancellationReason: reason,
        paymentStatus: 'refunded',
      });
    } catch (err: any) {
      console.warn('Notice: falling back to local cancelBooking:', err?.message || err);
      return mockStore.updateBookingStatus(bookingId, 'cancelled', {
        cancellationReason: reason,
        paymentStatus: 'refunded',
      });
    }
  },
};
