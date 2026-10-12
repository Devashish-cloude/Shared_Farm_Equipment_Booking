-- ==============================================================================
-- Migration 001: Initial Core Schema (Users, Equipment, Bookings)
-- Baseline Foundation for Shared Farm Platform
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    location_name VARCHAR(255),
    farm_size_acres NUMERIC(8, 2),
    address TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Equipment Categories
CREATE TABLE IF NOT EXISTS equipment_categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 4. Equipment Listings (approximate public location only; exact coordinates never exposed here)
CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(64) REFERENCES equipment_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    daily_rate NUMERIC(10, 2),
    location_name VARCHAR(255) NOT NULL,
    approx_lat NUMERIC(9, 6),
    approx_lng NUMERIC(9, 6),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'reserved', 'in_use', 'maintenance', 'inactive')),
    rating_avg NUMERIC(3, 2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(64) PRIMARY KEY,
    renter_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    equipment_id VARCHAR(64) NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_hours NUMERIC(6, 2) NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) DEFAULT 0.0,
    total_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'accepted',
        'payment_pending',
        'confirmed',
        'in_progress',
        'completed',
        'rejected',
        'cancelled',
        'payment_failed',
        'disputed'
    )),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_renter ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_equipment ON bookings(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
