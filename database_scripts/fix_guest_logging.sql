-- ============================================================
-- GUEST LOGGING SUPPORT MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ensure user columns are nullable to support guests
ALTER TABLE public.chat_logs 
  ALTER COLUMN user1_id DROP NOT NULL,
  ALTER COLUMN user2_id DROP NOT NULL;

-- 2. Add columns to store guest identifiers
ALTER TABLE public.chat_logs 
  ADD COLUMN IF NOT EXISTS user1_guest_id text,
  ADD COLUMN IF NOT EXISTS user2_guest_id text;

-- 3. Add index for guest ID lookups if needed
CREATE INDEX IF NOT EXISTS idx_chat_logs_guest1 ON public.chat_logs(user1_guest_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_guest2 ON public.chat_logs(user2_guest_id);

-- Optional: Update session_logs too if you use both
ALTER TABLE public.session_logs 
  ALTER COLUMN user_a_id DROP NOT NULL,
  ALTER COLUMN user_b_id DROP NOT NULL;

ALTER TABLE public.session_logs 
  ADD COLUMN IF NOT EXISTS user_a_guest_id text,
  ADD COLUMN IF NOT EXISTS user_b_guest_id text;
