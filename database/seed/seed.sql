-- ==============================================================================
-- Demo Seed Data: Shared Farm Platform
-- Features Rahul (owner/renter) and Amit (renter/owner)
-- ==============================================================================

-- 1. Users
-- Passwords hashed with bcrypt: 'password123' -> $2b$10$w6B3rVj79.6y25RzL5q1z.e29d4g0E7pIeM6bY9h3wX2tM4p3mZ3K (or demo token supported)
INSERT INTO users (id, email, password_hash, full_name, phone, is_admin)
VALUES 
    ('user_rahul', 'rahul@example.com', '$2b$10$3euPkWf8e.bQ1u7Y6.Hwve47k0rU6c5sJ0qUqV9cW1zT4uG0jL7.K', 'Rahul Sharma', '+91 9876543210', false),
    ('user_amit', 'amit@example.com', '$2b$10$3euPkWf8e.bQ1u7Y6.Hwve47k0rU6c5sJ0qUqV9cW1zT4uG0jL7.K', 'Amit Patel', '+91 9123456780', false),
    ('user_admin', 'admin@sharedfarm.org', '$2b$10$3euPkWf8e.bQ1u7Y6.Hwve47k0rU6c5sJ0qUqV9cW1zT4uG0jL7.K', 'Farm Admin', '+91 9999900000', true)
ON CONFLICT (id) DO NOTHING;

-- 2. User Profiles
INSERT INTO user_profiles (id, user_id, location_name, farm_size_acres, address, bio)
VALUES
    ('prof_rahul', 'user_rahul', 'Nashik, Maharashtra', 12.5, 'Farm No. 4, Dindori Road, Nashik', 'Progressive farmer with tractor and harvester available for local sharing.'),
    ('prof_amit', 'user_amit', 'Nashik, Maharashtra', 6.0, 'Village Niphad, Nashik', 'Organic vegetable grower; frequently rents high-power machinery.')
ON CONFLICT (id) DO NOTHING;

-- 3. Categories
INSERT INTO equipment_categories (id, name, description)
VALUES
    ('cat_tractor', 'Tractors', 'Heavy and utility tractors for plowing and hauling'),
    ('cat_harvester', 'Harvesters', 'Combine harvesters for grain and paddy'),
    ('cat_rotavator', 'Rotavators', 'Tillage machinery for soil conditioning')
ON CONFLICT (id) DO NOTHING;

-- 4. Equipment
INSERT INTO equipment (id, owner_id, category_id, title, description, hourly_rate, daily_rate, location_name, approx_lat, approx_lng, status, rating_avg, rating_count, image_url)
VALUES
    ('eq_tractor_rahul', 'user_rahul', 'cat_tractor', 'Mahindra 575 DI (45 HP Tractor)', 'Reliable 45 HP Mahindra tractor with modern fuel efficiency. Perfect for tilling and haulage. Operator available.', 900.00, 6500.00, 'Dindori, Nashik', 20.198300, 73.834200, 'active', 4.8, 5, 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80'),
    ('eq_rotavator_amit', 'user_amit', 'cat_rotavator', 'Shaktiman 7ft Rotavator', 'Heavy duty multi-speed rotavator, well-maintained blades for smooth seedbed preparation.', 450.00, 3200.00, 'Niphad, Nashik', 20.080000, 74.110000, 'active', 4.9, 3, 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80')
ON CONFLICT (id) DO NOTHING;

-- 5. Sample Bookings for Demonstration
-- Booking 1: Confirmed and ready for rental tracking (Rahul's tractor booked by Amit)
INSERT INTO bookings (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate, base_price, platform_fee, total_price, status, notes)
VALUES
    ('booking_demo_confirmed', 'user_amit', 'eq_tractor_rahul', NOW(), NOW() + INTERVAL '4 hours', 4.0, 900.00, 3600.00, 180.00, 3780.00, 'confirmed', 'Field preparation for wheat sowing.')
ON CONFLICT (id) DO NOTHING;

-- Booking 2: Completed booking ready for reviews
INSERT INTO bookings (id, renter_id, equipment_id, start_date, end_date, total_hours, hourly_rate, base_price, platform_fee, total_price, status, notes)
VALUES
    ('booking_demo_completed', 'user_amit', 'eq_tractor_rahul', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 20 hours', 4.0, 900.00, 3600.00, 180.00, 3780.00, 'completed', 'Completed soil leveling work.')
ON CONFLICT (id) DO NOTHING;
