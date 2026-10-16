-- ==============================================================================
-- SHARED FARM EQUIPMENT BOOKING PLATFORM — SUPABASE DATABASE MIGRATION
-- Migration: 20261016000000_supabase_schema.sql
-- Description: Comprehensive relational schema, automated profile triggers,
--              Row Level Security (RLS) policies, storage bucket configuration,
--              and atomic double-booking prevention functions.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked directly to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'equipment_owner', 'administrator')),
    avatar_url TEXT,
    village TEXT,
    district TEXT,
    state TEXT,
    farm_size_acres NUMERIC(8, 2),
    primary_crops TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_language TEXT DEFAULT 'English',
    rating NUMERIC(3, 2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5.0),
    review_count INTEGER DEFAULT 0,
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index on role & email
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ------------------------------------------------------------------------------
-- 2. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        role,
        village,
        district,
        state,
        avatar_url,
        verification_status
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        CASE 
            WHEN NEW.raw_user_meta_data->>'role' IN ('farmer', 'equipment_owner') THEN NEW.raw_user_meta_data->>'role'
            ELSE 'farmer'
        END,
        NEW.raw_user_meta_data->>'village',
        NEW.raw_user_meta_data->>'district',
        NEW.raw_user_meta_data->>'state',
        NEW.raw_user_meta_data->>'avatar_url',
        'unverified'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent users from escalating their own role to administrator
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'administrator' AND OLD.role != 'administrator' THEN
        -- Only existing administrators can promote another user to administrator
        IF auth.uid() IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot grant themselves administrator privileges.';
        END IF;
    END IF;
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ------------------------------------------------------------------------------
-- 3. EQUIPMENT TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    name TEXT,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'Tractors', 'Harvesters', 'Rotavators', 'Seed Drills', 
        'Sprayers', 'Cultivators', 'Threshers', 'Ploughs'
    )),
    make TEXT,
    model TEXT,
    year INTEGER,
    power_hp NUMERIC(6, 2),
    condition TEXT DEFAULT 'Good' CHECK (condition IN ('Excellent', 'Good', 'Fair')),
    price_per_hour NUMERIC(10, 2) NOT NULL CHECK (price_per_hour > 0),
    hourly_rate NUMERIC(10, 2),
    price_per_day NUMERIC(10, 2),
    daily_rate NUMERIC(10, 2),
    security_deposit NUMERIC(10, 2) DEFAULT 0 CHECK (security_deposit >= 0),
    operator_available BOOLEAN DEFAULT FALSE,
    operator_cost_per_hour NUMERIC(10, 2) DEFAULT 0 CHECK (operator_cost_per_hour >= 0),
    min_rental_hours INTEGER DEFAULT 1 CHECK (min_rental_hours >= 1),
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    location_village TEXT,
    location_district TEXT,
    location_state TEXT,
    location_name TEXT,
    approx_lat NUMERIC(9, 6),
    approx_lng NUMERIC(9, 6),
    status TEXT DEFAULT 'available',
    availability_status TEXT NOT NULL DEFAULT 'available' CHECK (
        availability_status IN ('available', 'in-use', 'maintenance', 'paused', 'draft')
    ),
    rating NUMERIC(3, 2) DEFAULT 5.0,
    rating_avg NUMERIC(3, 2) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    completed_rentals_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Equipment indexes
CREATE INDEX IF NOT EXISTS idx_equipment_owner_id ON public.equipment(owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment(availability_status);
CREATE INDEX IF NOT EXISTS idx_equipment_hourly_rate ON public.equipment(price_per_hour);

-- Sync synonym fields on equipment
CREATE OR REPLACE FUNCTION public.sync_equipment_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name := COALESCE(NEW.name, NEW.title);
    NEW.title := COALESCE(NEW.title, NEW.name);
    NEW.hourly_rate := COALESCE(NEW.hourly_rate, NEW.price_per_hour);
    NEW.price_per_hour := COALESCE(NEW.price_per_hour, NEW.hourly_rate);
    NEW.daily_rate := COALESCE(NEW.daily_rate, NEW.price_per_day, NEW.price_per_hour * 8);
    NEW.price_per_day := COALESCE(NEW.price_per_day, NEW.daily_rate);
    IF array_length(NEW.image_urls, 1) > 0 AND array_length(NEW.images, 1) IS NULL THEN
        NEW.images := NEW.image_urls;
    ELSIF array_length(NEW.images, 1) > 0 AND array_length(NEW.image_urls, 1) IS NULL THEN
        NEW.image_urls := NEW.images;
    END IF;
    NEW.status := COALESCE(NEW.status, NEW.availability_status);
    NEW.availability_status := COALESCE(NEW.availability_status, NEW.status);
    NEW.updated_at := TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_equipment_fields ON public.equipment;
CREATE TRIGGER trg_sync_equipment_fields
    BEFORE INSERT OR UPDATE ON public.equipment
    FOR EACH ROW EXECUTE FUNCTION public.sync_equipment_fields();

-- ------------------------------------------------------------------------------
-- 4. BOOKINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_hours NUMERIC(8, 2) NOT NULL CHECK (duration_hours > 0),
    hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
    daily_rate NUMERIC(10, 2),
    with_operator BOOLEAN DEFAULT FALSE,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    operator_price NUMERIC(10, 2) DEFAULT 0 CHECK (operator_price >= 0),
    platform_fee NUMERIC(10, 2) DEFAULT 0 CHECK (platform_fee >= 0),
    security_deposit NUMERIC(10, 2) DEFAULT 0 CHECK (security_deposit >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'rejected', 'active', 'completed', 'cancelled')
    ),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'refunded')
    ),
    payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('upi', 'card', 'netbanking', 'pay_on_delivery')),
    renter_notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT check_booking_dates CHECK (end_date > start_date)
);

-- Booking indexes
CREATE INDEX IF NOT EXISTS idx_bookings_equipment_id ON public.bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(start_date, end_date);

-- ------------------------------------------------------------------------------
-- 5. RENTAL TRACKING TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rental_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    pickup_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    expected_return_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    last_latitude NUMERIC(9, 6),
    last_longitude NUMERIC(9, 6),
    speed_kmph NUMERIC(6, 2) DEFAULT 0,
    fuel_level_percent NUMERIC(5, 2) DEFAULT 90,
    engine_status TEXT DEFAULT 'off' CHECK (engine_status IN ('running', 'idle', 'off')),
    battery_voltage NUMERIC(5, 2) DEFAULT 12.6,
    hours_worked_today NUMERIC(6, 2) DEFAULT 0,
    is_simulated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tracking_booking_id ON public.rental_tracking(booking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_equipment_id ON public.rental_tracking(equipment_id);

-- ------------------------------------------------------------------------------
-- 6. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'booking' CHECK (type IN ('booking', 'payment', 'rental', 'system')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    reference_id TEXT,
    reference_type TEXT,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

-- ------------------------------------------------------------------------------
-- 7. REVIEWS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating NUMERIC(3, 2) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_equipment_id ON public.reviews(equipment_id);

-- ------------------------------------------------------------------------------
-- 8. ATOMIC DOUBLE-BOOKING PREVENTION & VERIFIED PRICE CALCULATION FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
    p_equipment_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_with_operator BOOLEAN DEFAULT FALSE,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_renter_id UUID;
    v_equipment RECORD;
    v_hours NUMERIC(8, 2);
    v_base_price NUMERIC(10, 2);
    v_operator_price NUMERIC(10, 2) := 0;
    v_platform_fee NUMERIC(10, 2);
    v_total_price NUMERIC(10, 2);
    v_new_booking RECORD;
BEGIN
    -- Verify authenticated user
    v_renter_id := auth.uid();
    IF v_renter_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create a booking request.';
    END IF;

    -- Validate date boundaries (Inclusive start, exclusive end timestamp)
    IF p_end_date <= p_start_date THEN
        RAISE EXCEPTION 'Booking end date must be strictly later than start date.';
    END IF;

    -- Lock the equipment row to prevent concurrent race conditions
    SELECT id, owner_id, title, price_per_hour, operator_available, operator_cost_per_hour, 
           security_deposit, availability_status
    INTO v_equipment
    FROM public.equipment
    WHERE id = p_equipment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipment not found.';
    END IF;

    IF v_equipment.owner_id = v_renter_id THEN
        RAISE EXCEPTION 'You cannot book your own equipment listing.';
    END IF;

    IF v_equipment.availability_status NOT IN ('available', 'in-use') THEN
        RAISE EXCEPTION 'Equipment is not currently available for booking.';
    END IF;

    -- Concurrency check: Reject if overlapping active or accepted reservation exists
    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE equipment_id = p_equipment_id
          AND status IN ('accepted', 'active')
          AND start_date < p_end_date
          AND end_date > p_start_date
    ) THEN
        RAISE EXCEPTION 'Selected rental dates conflict with an existing confirmed booking.';
    END IF;

    -- Calculate verified duration and pricing from server-side equipment rates
    v_hours := ROUND(EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 3600.0, 2);
    IF v_hours <= 0 THEN
        RAISE EXCEPTION 'Booking duration must be greater than zero.';
    END IF;

    v_base_price := ROUND(v_hours * v_equipment.price_per_hour, 2);
    IF p_with_operator AND v_equipment.operator_available THEN
        v_operator_price := ROUND(v_hours * COALESCE(v_equipment.operator_cost_per_hour, 0), 2);
    END IF;
    v_platform_fee := ROUND((v_base_price + v_operator_price) * 0.05, 2); -- 5% platform fee
    v_total_price := v_base_price + v_operator_price + v_platform_fee + COALESCE(v_equipment.security_deposit, 0);

    -- Insert new booking
    INSERT INTO public.bookings (
        equipment_id,
        renter_id,
        owner_id,
        start_date,
        end_date,
        duration_hours,
        hourly_rate,
        with_operator,
        base_price,
        operator_price,
        platform_fee,
        security_deposit,
        total_price,
        status,
        payment_status,
        renter_notes
    ) VALUES (
        p_equipment_id,
        v_renter_id,
        v_equipment.owner_id,
        p_start_date,
        p_end_date,
        v_hours,
        v_equipment.price_per_hour,
        p_with_operator,
        v_base_price,
        v_operator_price,
        v_platform_fee,
        COALESCE(v_equipment.security_deposit, 0),
        v_total_price,
        'pending',
        'pending',
        p_notes
    ) RETURNING * INTO v_new_booking;

    -- Create notification for equipment owner
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        reference_id,
        reference_type,
        link
    ) VALUES (
        v_equipment.owner_id,
        'New Booking Request',
        'You have received a new booking request for "' || v_equipment.title || '" (' || v_hours || ' hours).',
        'booking',
        v_new_booking.id::TEXT,
        'booking',
        '/dashboard/bookings'
    );

    RETURN row_to_json(v_new_booking)::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- --- Profiles RLS ---
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- --- Equipment RLS ---
DROP POLICY IF EXISTS "Public can view active equipment listings" ON public.equipment;
CREATE POLICY "Public can view active equipment listings"
    ON public.equipment FOR SELECT
    USING (availability_status IN ('available', 'in-use', 'maintenance', 'paused') OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Authenticated users can create equipment" ON public.equipment;
CREATE POLICY "Authenticated users can create equipment"
    ON public.equipment FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own equipment" ON public.equipment;
CREATE POLICY "Owners can update own equipment"
    ON public.equipment FOR UPDATE
    USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own equipment" ON public.equipment;
CREATE POLICY "Owners can delete own equipment"
    ON public.equipment FOR DELETE
    USING (auth.uid() = owner_id);

-- --- Bookings RLS ---
DROP POLICY IF EXISTS "Users can view their own bookings as renter or owner" ON public.bookings;
CREATE POLICY "Users can view their own bookings as renter or owner"
    ON public.bookings FOR SELECT
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Renters can create booking requests" ON public.bookings;
CREATE POLICY "Renters can create booking requests"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = renter_id AND auth.uid() != owner_id);

DROP POLICY IF EXISTS "Participants can update booking status according to role" ON public.bookings;
CREATE POLICY "Participants can update booking status according to role"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- --- Rental Tracking RLS ---
DROP POLICY IF EXISTS "Booking participants can view telemetry tracking" ON public.rental_tracking;
CREATE POLICY "Booking participants can view telemetry tracking"
    ON public.rental_tracking FOR SELECT
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Booking participants can update telemetry tracking" ON public.rental_tracking;
CREATE POLICY "Booking participants can update telemetry tracking"
    ON public.rental_tracking FOR UPDATE
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- --- Notifications RLS ---
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- --- Reviews RLS ---
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews"
    ON public.reviews FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can write reviews" ON public.reviews;
CREATE POLICY "Authenticated users can write reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

-- ------------------------------------------------------------------------------
-- 10. SUPABASE STORAGE BUCKET & STORAGE POLICIES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for equipment images
DROP POLICY IF EXISTS "Equipment images are publicly accessible" ON storage.objects;
CREATE POLICY "Equipment images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'equipment-images');

-- Authenticated upload policy
DROP POLICY IF EXISTS "Authenticated users can upload equipment images" ON storage.objects;
CREATE POLICY "Authenticated users can upload equipment images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'equipment-images' AND auth.role() = 'authenticated');

-- User delete policy for own uploads
DROP POLICY IF EXISTS "Users can delete own uploaded equipment images" ON storage.objects;
CREATE POLICY "Users can delete own uploaded equipment images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'equipment-images' AND auth.uid() = owner);
