-- 1. STORAGE BUCKET AND POLICIES
-- Ensure the storage bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verifications', 'verifications', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload photos to 'verifications' bucket (INSERT permission)
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'verifications');

-- Allow anyone to view photos (SELECT permission)
DROP POLICY IF EXISTS "Allow public view" ON storage.objects;
CREATE POLICY "Allow public view"
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'verifications');


-- 2. DATABASE TABLE POLICIES (Double ensuring they are applied)
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- 1. Allow users to select their own verification
DROP POLICY IF EXISTS "Users can view their own verification" ON public.verifications;
CREATE POLICY "Users can view their own verification"
ON public.verifications FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Allow users to insert their own verification
DROP POLICY IF EXISTS "Users can insert their own verification" ON public.verifications;
CREATE POLICY "Users can insert their own verification"
ON public.verifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to update their own verification
DROP POLICY IF EXISTS "Users can update their own verification" ON public.verifications;
CREATE POLICY "Users can update their own verification"
ON public.verifications FOR UPDATE 
USING (auth.uid() = user_id);


-- 3. NOTIFICATIONS POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Allow any user to insert a notification for the admin
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications"
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- 2. Allow reading notifications
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
CREATE POLICY "Users can view notifications"
ON public.notifications FOR SELECT 
USING (true);
