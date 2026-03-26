-- ADD MISSING UPDATED_AT COLUMN
-- Run this in Supabase SQL Editor

-- Ensure updated_at column exists in payouts table
ALTER TABLE public.payouts 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Refresh cache by doing a small dummy update (optional but helps)
COMMENT ON TABLE public.payouts IS 'Withdrawal payout requests';
