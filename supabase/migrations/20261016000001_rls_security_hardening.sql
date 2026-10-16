-- ==============================================================================
-- SHARED FARM EQUIPMENT BOOKING PLATFORM — SECURITY HARDENING MIGRATION
-- Migration: 20261016000001_rls_security_hardening.sql
-- Description: Hardens Row Level Security (RLS) policies, adds strict WITH CHECK
--              clauses, prevents ID impersonation and role escalation on profiles,
--              configures dedicated avatars storage bucket, and isolates user records.
-- ==============================================================================

-- 1. Ensure avatar storage bucket exists with appropriate policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for user avatars
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update/delete their own avatars
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- 2. Profiles Table Hardening: Prevent ID alteration and unauthorized role escalation
CREATE OR REPLACE FUNCTION public.validate_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent changing the primary key ID to impersonate another user
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Security Violation: Profile ID cannot be altered.';
    END IF;

    -- Prevent self-escalation to administrator unless caller is already an administrator
    IF NEW.role = 'administrator' AND OLD.role <> 'administrator' THEN
        IF auth.uid() IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator'
        ) THEN
            RAISE EXCEPTION 'Security Violation: Users cannot grant themselves administrator privileges.';
        END IF;
    END IF;

    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_profile_updates ON public.profiles;
CREATE TRIGGER trg_validate_profile_updates
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profile_updates();


-- 3. Strict Profile Update RLS
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);


-- 4. Strict Equipment RLS: Enforce owner_id matching on INSERT, UPDATE, and DELETE
DROP POLICY IF EXISTS "Authenticated users can create equipment" ON public.equipment;
CREATE POLICY "Authenticated users can create equipment"
    ON public.equipment FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own equipment" ON public.equipment;
CREATE POLICY "Owners can update own equipment"
    ON public.equipment FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own equipment" ON public.equipment;
CREATE POLICY "Owners can delete own equipment"
    ON public.equipment FOR DELETE
    USING (auth.uid() = owner_id);


-- 5. Strict Bookings RLS: Ensure only renters can insert and cannot book their own equipment
DROP POLICY IF EXISTS "Renters can create booking requests" ON public.bookings;
CREATE POLICY "Renters can create booking requests"
    ON public.bookings FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = renter_id 
        AND auth.uid() <> owner_id
    );

DROP POLICY IF EXISTS "Participants can update booking status according to role" ON public.bookings;
CREATE POLICY "Participants can update booking status according to role"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = renter_id OR auth.uid() = owner_id)
    WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Disallow altering participant identities or equipment references during updates via trigger
CREATE OR REPLACE FUNCTION public.prevent_booking_identity_tamper()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.renter_id IS DISTINCT FROM OLD.renter_id 
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id 
       OR NEW.equipment_id IS DISTINCT FROM OLD.equipment_id THEN
        RAISE EXCEPTION 'Cannot modify booking participants or equipment reference during an update.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_booking_identity_tamper ON public.bookings;
CREATE TRIGGER trg_prevent_booking_identity_tamper
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_identity_tamper();


-- 6. Strict Rental Tracking RLS
DROP POLICY IF EXISTS "Booking participants can view telemetry tracking" ON public.rental_tracking;
CREATE POLICY "Booking participants can view telemetry tracking"
    ON public.rental_tracking FOR SELECT
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Booking participants can update telemetry tracking" ON public.rental_tracking;
CREATE POLICY "Booking participants can update telemetry tracking"
    ON public.rental_tracking FOR UPDATE
    USING (auth.uid() = renter_id OR auth.uid() = owner_id)
    WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Booking participants can insert telemetry tracking" ON public.rental_tracking;
CREATE POLICY "Booking participants can insert telemetry tracking"
    ON public.rental_tracking FOR INSERT
    WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);
