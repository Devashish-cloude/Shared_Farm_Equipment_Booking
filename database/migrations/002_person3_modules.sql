-- ==============================================================================
-- Migration 002: Person 3 Subsystems
-- Rental Sessions, Equipment Tracking, Payments, Notifications & Reviews
-- ==============================================================================

-- 1. Rental Sessions Table
-- Tracks active rental session lifecycle (Start Rental / End Rental)
CREATE TABLE IF NOT EXISTS rental_sessions (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    started_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    session_status VARCHAR(50) DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rental_sessions_booking ON rental_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_rental_sessions_status ON rental_sessions(session_status);

-- 2. Equipment Tracking Points Table
-- Location telemetry during active sessions; strictly restricted to authorized participants
CREATE TABLE IF NOT EXISTS equipment_tracking (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES rental_sessions(id) ON DELETE CASCADE,
    booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('simulated_gps', 'device_gps', 'manual')),
    speed_kmh NUMERIC(5, 2) DEFAULT 0.0,
    heading_deg NUMERIC(5, 2) DEFAULT 0.0,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_session ON equipment_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_booking ON equipment_tracking(booking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_recorded_at ON equipment_tracking(recorded_at DESC);

-- 3. Payments Table
-- Secure records of Razorpay transactions
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    razorpay_signature VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    error_code VARCHAR(100),
    error_description TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(razorpay_payment_id);

-- 4. Notifications Table
-- In-app notifications for bookings, payments, rental status, and tracking alerts
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'booking_request',
        'booking_accepted',
        'booking_rejected',
        'payment_success',
        'payment_failed',
        'rental_started',
        'rental_completed',
        'tracking_alert'
    )),
    reference_id VARCHAR(64),
    reference_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 5. Reviews Table
-- Two-sided feedback after completed rentals
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    equipment_id VARCHAR(64) NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewee_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    review_type VARCHAR(50) NOT NULL CHECK (review_type IN ('renter_to_owner', 'owner_to_renter')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate reviews by the same user for the same booking
    CONSTRAINT uq_booking_reviewer UNIQUE (booking_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_equipment ON reviews(equipment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
