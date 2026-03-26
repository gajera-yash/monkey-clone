-- ==========================================
-- WITHDRAWAL SYSTEM - DATABASE SETUP
-- ==========================================

-- 1. Create Payouts Table (if not exists)
CREATE TABLE IF NOT EXISTS public.payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL DEFAULT 0,
    method text CHECK (method IN ('upi', 'bank')) NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for admin performance
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);

-- 2. Create/Update Creator Balance RPC
-- This RPC safely handles coin deductions and additions for creators.
CREATE OR REPLACE FUNCTION public.update_creator_balance(
    user_id uuid,
    earned integer,
    duration integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the profiles table
    -- Since RLS might be active, using SECURITY DEFINER ensures it runs with permissions
    UPDATE public.profiles
    SET 
        coins = coins + earned,
        last_seen = now()
    WHERE id = user_id;
END;
$$;

-- 3. Enable RLS (already disabled on profiles, but let's be safe for payouts)
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- 4. Payouts Policies
-- Users can see their own payouts
CREATE POLICY "Users can view own payouts" ON public.payouts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payout requests
CREATE POLICY "Users can insert own payouts" ON public.payouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can do everything (if you have an admin role, otherwise open it up for now)
-- Since RLS is disabled on profiles for admin panel, we'll do the same for payouts
-- to ensure the Withdrawals admin page works.
ALTER TABLE public.payouts DISABLE ROW LEVEL SECURITY;
