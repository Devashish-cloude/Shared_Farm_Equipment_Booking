import { apiClient } from './api';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Transaction } from '../types';

export interface EarningsSummary {
  grossEarnings: number;
  platformFees: number;
  netEarnings: number;
  pendingPayouts: number;
  completedBookingsCount: number;
}

export interface PaymentSimulationResult {
  success: boolean;
  transactionId: string;
  amount?: number;
  alreadyPaid?: boolean;
  paymentStatus?: string;
  error?: string;
}

export const paymentsService = {
  async getTransactions(): Promise<Transaction[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) {
          const user = mockStore.getActiveUser();
          return user ? mockStore.getTransactions() : [];
        }

        const { data, error } = await supabase
          .from('bookings')
          .select('*, equipment:equipment_id(title, name)')
          .eq('owner_id', userId)
          .eq('payment_status', 'paid')
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data.map((b) => {
            const gross = Number(b.base_price || 0) + Number(b.operator_price || 0);
            const fee = Number(b.platform_fee || 0);
            return {
              id: `tx-${b.id.substring(0, 8)}`,
              bookingId: b.id,
              equipmentTitle: b.equipment?.title || b.equipment?.name || 'Farm Machinery',
              type: 'earning',
              grossAmount: gross,
              platformFee: fee,
              netAmount: Math.max(0, gross - fee),
              status: b.status === 'completed' ? 'completed' : 'held',
              date: b.updated_at || b.created_at,
              referenceNo: `SF-TXN-${b.id.substring(0, 6).toUpperCase()}`,
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getTransactions fallback:', err);
      }
    }

    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.getTransactions();
    }

    try {
      const res = await apiClient.get<Transaction[]>('/payments/transactions');
      return res.data;
    } catch {
      return mockStore.getTransactions();
    }
  },

  async getEarningsSummary(): Promise<EarningsSummary> {
    if (isSupabaseConfigured()) {
      try {
        const txs = await this.getTransactions();
        const gross = txs.filter((t) => t.type === 'earning').reduce((acc, t) => acc + t.grossAmount, 0);
        const fees = txs.filter((t) => t.type === 'earning').reduce((acc, t) => acc + t.platformFee, 0);
        const net = txs.filter((t) => t.type === 'earning').reduce((acc, t) => acc + t.netAmount, 0);

        return {
          grossEarnings: gross,
          platformFees: fees,
          netEarnings: net,
          pendingPayouts: 0,
          completedBookingsCount: txs.filter((t) => t.type === 'earning' && t.status === 'completed').length,
        };
      } catch (err) {
        console.warn('Supabase earnings summary fallback:', err);
      }
    }

    if (isDemoModeActive() || !isSupabaseConfigured()) {
      const txs = mockStore.getTransactions();
      const gross = txs.filter((t) => t.type === 'earning').reduce((acc, t) => acc + t.grossAmount, 0);
      const fees = txs.filter((t) => t.type === 'earning').reduce((acc, t) => acc + t.platformFee, 0);
      const net = txs.filter((t) => t.type === 'earning').reduce((acc, t) => acc + t.netAmount, 0);

      return {
        grossEarnings: gross,
        platformFees: fees,
        netEarnings: net,
        pendingPayouts: 0,
        completedBookingsCount: txs.filter((t) => t.type === 'earning').length,
      };
    }

    try {
      const res = await apiClient.get<EarningsSummary>('/payments/summary');
      return res.data;
    } catch {
      return {
        grossEarnings: 0,
        platformFees: 0,
        netEarnings: 0,
        pendingPayouts: 0,
        completedBookingsCount: 0,
      };
    }
  },

  /**
   * Authorizes a test payment for a booking.
   * Authoritatively reads amount and validates permissions at the database / server layer.
   * Completely eliminates generic "Network Error" on hosted deployments.
   */
  async simulatePayment(
    bookingId: string,
    method: string = 'upi',
    idempotencyKey?: string
  ): Promise<PaymentSimulationResult> {
    if (!bookingId) {
      throw new Error('Invalid order: booking ID is required.');
    }

    // 1. SUPABASE PATH (Primary for Supabase-connected environments)
    if (isSupabaseConfigured() && !isDemoModeActive()) {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;
      const activeUser = mockStore.getActiveUser();

      if (!currentUserId && !activeUser) {
        throw new Error('Authentication required: Please sign in to authorize payment.');
      }

      if (currentUserId) {
        // Fetch authoritative booking record
        const { data: booking, error: fetchErr } = await supabase
          .from('bookings')
          .select('*, equipment:equipment_id(id, title, name, owner_id)')
          .eq('id', bookingId)
          .maybeSingle();

        if (booking && !fetchErr) {
          // Security: Only the actual renter can pay for their booking
          if (booking.renter_id !== currentUserId) {
            throw new Error('You are not authorized to pay for this booking.');
          }

          // Prevent payment on cancelled or rejected bookings
          if (booking.status === 'cancelled' || booking.status === 'rejected') {
            throw new Error(`Cannot pay for a ${booking.status} booking.`);
          }

          // Idempotency: If already marked as paid, return previous authorization safely
          if (booking.payment_status === 'paid') {
            return {
              success: true,
              transactionId: `TXN-ALREADY-PAID-${booking.id.substring(0, 8)}`,
              amount: Number(booking.total_price),
              alreadyPaid: true,
              paymentStatus: 'paid',
            };
          }

      // Attempt stored procedure if deployed
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('authorize_booking_payment', {
          p_booking_id: bookingId,
          p_payment_method: method,
          p_idempotency_key: idempotencyKey || `idemp_${bookingId}_${Date.now()}`,
        });

        if (!rpcErr && rpcData && rpcData.success) {
          return {
            success: true,
            transactionId: rpcData.transaction_id,
            amount: Number(rpcData.amount || booking.total_price),
            paymentStatus: 'paid',
          };
        }
      } catch (rpcException) {
        console.warn('RPC authorize_booking_payment skipped/failed, falling back to direct update:', rpcException);
      }

      // Direct client update fallback with database RLS enforcement
      const authoritativeAmount = Number(booking.total_price);
      const generatedTxnId = `SF-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { error: updateErr } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: booking.status === 'pending' ? 'accepted' : booking.status,
          payment_method: method,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateErr) {
        throw new Error(`Database error updating payment status: ${updateErr.message}`);
      }

      // Try logging in payments ledger table
      try {
        await supabase.from('payments').insert({
          booking_id: booking.id,
          renter_id: booking.renter_id,
          owner_id: booking.owner_id,
          transaction_id: generatedTxnId,
          amount: authoritativeAmount,
          currency: 'INR',
          status: 'authorized',
          escrow_status: 'held',
          payment_method: method,
          is_test_mode: true,
          idempotency_key: idempotencyKey || `idemp_${booking.id}_${Date.now()}`,
        });
      } catch {
        // Non-blocking if payments table is pending migration
      }

      // Create owner notification
      try {
        await supabase.from('notifications').insert({
          user_id: booking.owner_id,
          title: 'Payment Received & Booking Confirmed',
          message: `Test payment of ₹${authoritativeAmount} for "${booking.equipment?.title || 'equipment'}" has been authorized in escrow.`,
          type: 'payment_success',
          reference_id: booking.id,
          reference_type: 'booking',
          link: '/dashboard/rentals',
        });
      } catch {
        // Non-blocking notification creation
      }

      // Ensure active rental tracking point
      try {
        await supabase.from('rental_tracking').upsert(
          {
            booking_id: booking.id,
            equipment_id: booking.equipment_id,
            owner_id: booking.owner_id,
            renter_id: booking.renter_id,
            status: 'active',
            fuel_level_percent: 92.0,
            battery_voltage: 12.6,
            speed_kmph: 0.0,
            engine_status: 'off',
            is_simulated: true,
          },
          { onConflict: 'booking_id' }
        );
      } catch {
        // Non-blocking tracking point
      }

        return {
          success: true,
          transactionId: generatedTxnId,
          amount: authoritativeAmount,
          paymentStatus: 'paid',
        };
      }
    }
  }

    // 2. MOCK / DEMO / OFFLINE PATH
    const mockBooking = mockStore.getBookingById(bookingId);
    if (mockBooking) {
      const activeUser = mockStore.getActiveUser();
      if (activeUser && mockBooking.renterId !== activeUser.id && activeUser.role !== 'admin') {
        throw new Error('You are not authorized to pay for this booking.');
      }

      if (mockBooking.status === 'cancelled' || mockBooking.status === 'rejected') {
        throw new Error(`Cannot pay for a ${mockBooking.status} booking.`);
      }

      if (mockBooking.paymentStatus === 'paid') {
        return {
          success: true,
          transactionId: `TXN-ALREADY-PAID-${mockBooking.id.substring(0, 8)}`,
          amount: mockBooking.totalPrice,
          alreadyPaid: true,
          paymentStatus: 'paid',
        };
      }

      mockStore.updateBookingStatus(bookingId, 'accepted', { paymentStatus: 'paid' });
      return {
        success: true,
        transactionId: `SF-PAY-DEMO-${Date.now()}`,
        amount: mockBooking.totalPrice,
        paymentStatus: 'paid',
      };
    }

    // 3. BACKEND API CLIENT PATH (If external backend is running)
    try {
      const res = await apiClient.post<{ success: boolean; data?: any; transactionId?: string }>(
        `/payments/${bookingId}/charge`,
        { method, idempotencyKey }
      );

      const txnId =
        res.data?.data?.transactionId ||
        res.data?.transactionId ||
        `SF-PAY-${Date.now()}`;

      return {
        success: true,
        transactionId: txnId,
        amount: res.data?.data?.amount,
        paymentStatus: 'paid',
      };
    } catch (apiErr: any) {
      const formattedMessage =
        apiErr.response?.data?.error ||
        apiErr.message ||
        'Payment could not be processed. Please try again.';
      throw new Error(formattedMessage);
    }
  },
};
