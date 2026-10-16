-- ==============================================================================
-- SHARED FARM EQUIPMENT BOOKING PLATFORM — PAYMENTS & ESCROW MIGRATION
-- Migration: 20261016000002_payments_and_escrow.sql
-- Description: Creates payments schema, RLS policies, indexes, and an atomic
--              stored procedure for idempotent test payment authorizations.
-- ==============================================================================

-- 1. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    transaction_id TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'authorized' CHECK (
        status IN ('created', 'authorized', 'captured', 'failed', 'refunded')
    ),
    escrow_status TEXT NOT NULL DEFAULT 'held' CHECK (
        escrow_status IN ('held', 'released', 'refunded')
    ),
    payment_method TEXT NOT NULL CHECK (
        payment_method IN ('upi', 'netbanking', 'card', 'pay_on_delivery')
    ),
    is_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
    idempotency_key TEXT UNIQUE,
    payment_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_renter_id ON public.payments(renter_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 2. ROW LEVEL SECURITY (RLS) FOR PAYMENTS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Renters and owners can view payment records associated with their bookings
DROP POLICY IF EXISTS "Participants can view their booking payments" ON public.payments;
CREATE POLICY "Participants can view their booking payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Only authenticated renters can insert their payment authorizations
DROP POLICY IF EXISTS "Renters can record payment authorizations" ON public.payments;
CREATE POLICY "Renters can record payment authorizations"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = renter_id);

-- Prevent unauthorized updates or deletes to payment audit logs
DROP POLICY IF EXISTS "Payment records cannot be altered" ON public.payments;
CREATE POLICY "Payment records cannot be altered"
    ON public.payments FOR UPDATE
    USING (false);

-- 3. ATOMIC AUTHORIZE PAYMENT FUNCTION
CREATE OR REPLACE FUNCTION public.authorize_booking_payment(
    p_booking_id UUID,
    p_payment_method TEXT DEFAULT 'upi',
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_equipment RECORD;
    v_caller_id UUID;
    v_existing_payment RECORD;
    v_transaction_id TEXT;
    v_new_payment RECORD;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to authorize payment.';
    END IF;

    -- Lock the booking row for update to prevent concurrent payment race conditions
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found.';
    END IF;

    -- Security: Only the actual renter can pay for their booking
    IF v_booking.renter_id <> v_caller_id THEN
        RAISE EXCEPTION 'Unauthorized: Only the booking renter can authorize payment.';
    END IF;

    -- Reject payment for cancelled or rejected bookings
    IF v_booking.status IN ('cancelled', 'rejected') THEN
        RAISE EXCEPTION 'Cannot pay for a booking in status "%"', v_booking.status;
    END IF;

    -- Idempotency check: If already paid, return the existing payment record safely
    IF v_booking.payment_status = 'paid' THEN
        SELECT * INTO v_existing_payment
        FROM public.payments
        WHERE booking_id = p_booking_id AND status IN ('authorized', 'captured')
        ORDER BY created_at DESC
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'transaction_id', COALESCE(v_existing_payment.transaction_id, 'TXN-ALREADY-PAID-' || substring(p_booking_id::text, 1, 8)),
            'amount', v_booking.total_price,
            'payment_status', 'paid',
            'is_idempotent', true
        );
    END IF;

    -- Generate stable transaction reference
    v_transaction_id := 'SF-TEST-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || upper(substring(md5(random()::text), 1, 6));

    -- Update booking status to paid and accepted
    UPDATE public.bookings
    SET payment_status = 'paid',
        status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END,
        payment_method = p_payment_method,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_booking_id;

    -- Insert payment ledger record
    INSERT INTO public.payments (
        booking_id,
        renter_id,
        owner_id,
        transaction_id,
        amount,
        currency,
        status,
        escrow_status,
        payment_method,
        is_test_mode,
        idempotency_key,
        payment_details
    ) VALUES (
        v_booking.id,
        v_booking.renter_id,
        v_booking.owner_id,
        v_transaction_id,
        v_booking.total_price,
        'INR',
        'authorized',
        'held',
        p_payment_method,
        TRUE,
        COALESCE(p_idempotency_key, 'idemp_' || v_booking.id || '_' || extract(epoch from now())),
        jsonb_build_object('client_platform', 'web', 'environment', 'test_sandbox')
    ) RETURNING * INTO v_new_payment;

    -- Fetch equipment title for notification
    SELECT title INTO v_equipment FROM public.equipment WHERE id = v_booking.equipment_id;

    -- Send notification to equipment owner
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        reference_id,
        reference_type,
        link
    ) VALUES (
        v_booking.owner_id,
        'Payment Received & Booking Confirmed',
        'Test payment of ₹' || v_booking.total_price || ' has been authorized for "' || COALESCE(v_equipment.title, 'equipment') || '" and held in escrow.',
        'payment_success',
        v_booking.id::text,
        'booking',
        '/dashboard/rentals'
    );

    -- Ensure telemetry rental_tracking row exists
    INSERT INTO public.rental_tracking (
        booking_id,
        equipment_id,
        owner_id,
        renter_id,
        status,
        fuel_level_percent,
        battery_voltage,
        speed_kmph,
        engine_status,
        is_simulated
    ) VALUES (
        v_booking.id,
        v_booking.equipment_id,
        v_booking.owner_id,
        v_booking.renter_id,
        'active',
        92.0,
        12.6,
        0.0,
        'off',
        TRUE
    ) ON CONFLICT (booking_id) DO UPDATE SET
        status = 'active',
        updated_at = TIMEZONE('utc'::text, NOW());

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'amount', v_booking.total_price,
        'payment_status', 'paid',
        'is_idempotent', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
