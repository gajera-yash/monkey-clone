-- MASTER SCHEMA & POLICY FIX FOR FACE VERIFICATION (v2)
-- Run this to fix: Schema Cache, RLS Database, and Storage Voice Upload Issues.

-- 1. VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    face_url TEXT,
    voice_url TEXT,
    status TEXT DEFAULT 'pending',
    ai_confidence FLOAT,
    ai_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Schema Integrity Check
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS ai_notes TEXT;
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS face_url TEXT;
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS voice_url TEXT;

-- Unique Constraint Check (Critical for Upsert)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'verifications_user_id_key') THEN
        ALTER TABLE public.verifications ADD CONSTRAINT verifications_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 2. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. STORAGE BUCKET (verifications)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verifications', 'verifications', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES (Comprehensive: Insert, Select, Update, Delete)
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

DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
CREATE POLICY "Allow public update" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'verifications');

DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;
CREATE POLICY "Allow public delete" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'verifications');

-- 4. DATABASE POLICIES
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
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can select notifications" ON public.notifications;
CREATE POLICY "Anyone can select notifications" ON public.notifications FOR SELECT USING (true);
