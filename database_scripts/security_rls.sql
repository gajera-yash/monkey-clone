-- Phase 7 & 8: Database & Storage Security (Row Level Security)
-- This file contains the recommended RLS policies for Strangy.in

-- 1. Profiles Table Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read all profiles (if public app) or only specific ones.
-- Assuming public app, everyone can read:
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- Users can only insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Prevent Mass Assignment on Profiles (e.g. users shouldn't be able to update 'is_premium' or 'strike_count' directly)
-- NOTE: In Supabase, you either handle this by using a separate secure table for admin-only fields, 
-- or by restricting column updates via a trigger.
CREATE OR REPLACE FUNCTION check_profile_update() RETURNS trigger AS $$
BEGIN
    -- Prevent users from modifying critical fields
    IF (auth.role() = 'authenticated') THEN
        IF NEW.is_premium IS DISTINCT FROM OLD.is_premium OR
           NEW.strike_count IS DISTINCT FROM OLD.strike_count OR
           NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Not authorized to modify restricted fields';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restrict_profile_updates ON public.profiles;
CREATE TRIGGER restrict_profile_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION check_profile_update();


-- 3. File Uploads (Storage Security) - Phase 8
-- Assuming avatars are stored in an 'avatars' bucket
-- Bucket must have RLS enabled in Supabase Storage.

-- Allow public read access to avatars
-- CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload only their own avatar and enforce size/type
-- CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (
--    bucket_id = 'avatars' AND 
--    auth.role() = 'authenticated' AND 
--    (storage.foldername(name))[1] = auth.uid()::text AND
--    (lower(storage.extension(name)) = 'jpg' OR lower(storage.extension(name)) = 'png' OR lower(storage.extension(name)) = 'jpeg')
-- );

-- 4. Admin Team Members Security (EXTREME SECURITY)
-- Prevent any normal user from making themselves an admin
ALTER TABLE public.admin_team_members ENABLE ROW LEVEL SECURITY;

-- 3. Extreme Security: Admin Team Members Table
-- ONLY the backend service key can insert/update. Frontend cannot.
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_team_members;
DROP POLICY IF EXISTS "Users can view own admin role" ON public.admin_team_members;
CREATE POLICY "Users can view own admin role" ON public.admin_team_members 
FOR SELECT USING (
    auth.uid() = user_id
);

-- Absolutely NO inserts or updates from the frontend (Extreme Security)s table from the frontend API
-- Only the backend Node.js server (using SUPABASE_SERVICE_KEY) can add/remove admins
DROP POLICY IF EXISTS "Block frontend insert for admins" ON public.admin_team_members;
CREATE POLICY "Block frontend insert for admins" ON public.admin_team_members FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Block frontend update for admins" ON public.admin_team_members;
CREATE POLICY "Block frontend update for admins" ON public.admin_team_members FOR UPDATE USING (false);
