-- FINAL FIX FOR ADMIN LOGS VISIBILITY
-- Run this in Supabase SQL Editor

-- 1. Disable RLS on core logging tables to allow Admin Panel (anon key) to read data
-- This is consistent with other admin-managed tables in the project.
ALTER TABLE IF EXISTS public.chat_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session_logs DISABLE ROW LEVEL SECURITY;

-- 2. Ensure Realtime is enabled for these tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;

-- 3. Verify Foreign Keys (Aliases used in JS depend on these names)
-- If they differ, the JS must be updated to match the actual DB constraint name.
-- These names are typically chat_logs_user1_id_fkey and chat_logs_user2_id_fkey.
