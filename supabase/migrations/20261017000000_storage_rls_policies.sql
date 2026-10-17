-- ==============================================================================
-- SHARED FARM EQUIPMENT BOOKING PLATFORM — STORAGE RLS POLICIES FIX
-- Migration: 20261017000000_storage_rls_policies.sql
-- Description: Configures storage buckets ('equipment-images' and 'avatars')
--              and adds comprehensive Row Level Security (RLS) policies on
--              storage.objects to resolve "new row violates row-level security policy"
-- ==============================================================================

-- 1. Ensure storage buckets exist and are marked as public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'equipment-images', 
    'equipment-images', 
    true, 
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
  ),
  (
    'avatars', 
    'avatars', 
    true, 
    2097152, -- 2 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
  )
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Clean up any existing conflicting storage policies
DROP POLICY IF EXISTS "Equipment images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploaded equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to equipment-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Allow update equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to equipment-images" ON storage.objects;

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to avatars" ON storage.objects;

-- 3. SELECT (Public Read) Policies
CREATE POLICY "Equipment images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'equipment-images');

CREATE POLICY "Avatars are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- 4. INSERT (Upload) Policies
-- Allow uploads to equipment-images (authenticated and anon/demo)
CREATE POLICY "Allow uploads to equipment-images"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'equipment-images');

-- Allow uploads to avatars
CREATE POLICY "Allow uploads to avatars"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'avatars');

-- 5. UPDATE Policies
CREATE POLICY "Allow update equipment images"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'equipment-images');

CREATE POLICY "Allow update avatars"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'avatars');

-- 6. DELETE Policies
CREATE POLICY "Allow delete equipment images"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id = 'equipment-images');

CREATE POLICY "Allow delete avatars"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id = 'avatars');
