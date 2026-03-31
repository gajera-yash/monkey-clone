-- MASTER SCHEMA & POLICY FIX FOR FACE VERIFICATION
-- Run this in your Supabase SQL Editor to solve all 'schema cache' and 'RLS' errors.

-- 1. VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    face_url TEXT,
    status TEXT DEFAULT 'pending',
    ai_confidence FLOAT,
    ai_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist (Fixes: "could not find ai_confidence column")
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS ai_notes TEXT;
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS face_url TEXT;

-- 2. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STORAGE BUCKET (Fixes: "Bucket not found")
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verifications', 'verifications', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES (Fixes: "RLS policy violation" on upload)
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
CREATE POLICY "Allow public upload" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'verifications');

DROP POLICY IF EXISTS "Allow public view" ON storage.objects;
CREATE POLICY "Allow public view" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'verifications');

-- 4. DATABASE POLICIES (Fixes: "RLS policy violation" on save)
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own verification" ON public.verifications;
CREATE POLICY "Users can view their own verification"
ON public.verifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own verification" ON public.verifications;
CREATE POLICY "Users can insert their own verification"
ON public.verifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own verification" ON public.verifications;
CREATE POLICY "Users can update their own verification"
ON public.verifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications"
ON public.notifications FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
CREATE POLICY "Users can view notifications"
ON public.notifications FOR SELECT 
USING (true);
