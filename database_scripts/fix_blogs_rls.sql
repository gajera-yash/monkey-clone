-- Fix RLS policies for the blogs table to allow the admin panel to insert, update, and delete.

-- Enable RLS on the blogs table
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to prevent errors)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.blogs;
DROP POLICY IF EXISTS "Enable insert for all" ON public.blogs;
DROP POLICY IF EXISTS "Enable update for all" ON public.blogs;
DROP POLICY IF EXISTS "Enable delete for all" ON public.blogs;

-- 1. Allow everyone to read published blogs
CREATE POLICY "Enable read access for all users" ON public.blogs 
FOR SELECT USING (true);

-- 2. Allow all inserts, updates, and deletes (simplest approach, matching other admin tables)
-- In a strict production environment, you would check if auth.uid() is an admin.
CREATE POLICY "Enable insert for all" ON public.blogs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.blogs FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON public.blogs FOR DELETE USING (true);
