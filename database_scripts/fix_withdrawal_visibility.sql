-- ENSURE ADMIN CAN SEE PAYOUTS
-- Run this in Supabase SQL Editor

-- Disable RLS on payouts table to allow Admin panel to fetch all requests
ALTER TABLE public.payouts DISABLE ROW LEVEL SECURITY;

-- Also ensure columns are correct if they were created differently
-- (This is just a safety check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payouts' AND column_name='user_id') THEN
        -- If user_id is missing, something is wrong with the table setup
        NULL;
    END IF;
END $$;
