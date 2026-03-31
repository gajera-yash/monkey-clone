-- Enable RLS for verifications table
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


-- Enable RLS for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Allow any authenticated user to insert a notification (for the admin)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 2. Allow admins (or everyone for now) to read notifications
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
CREATE POLICY "Users can view notifications"
ON public.notifications FOR SELECT 
USING (true);
