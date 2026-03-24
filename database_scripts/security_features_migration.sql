-- ============================================================
-- SECURITY FEATURES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strike_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_strike_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_expiry timestamptz;

-- 2. Session Logs Table (extended chat session detail)
CREATE TABLE IF NOT EXISTS public.session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_log_id uuid REFERENCES public.chat_logs(id) ON DELETE SET NULL,
  user_a_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_b_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_a_ip text,
  user_b_ip text,
  user_a_location jsonb,
  user_b_location jsonb,
  room_id text,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  duration integer DEFAULT 0,
  disconnected_by text CHECK (disconnected_by IN ('user_a', 'user_b', 'system')),
  connection_quality text,
  reports_filed jsonb DEFAULT '[]'::jsonb,
  flagged_keywords text[],
  created_at timestamptz DEFAULT now()
);

-- 3. User Strikes Table
CREATE TABLE IF NOT EXISTS public.user_strikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  strike_number integer NOT NULL DEFAULT 1,
  reason text,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_taken text CHECK (action_taken IN ('warning', '24hr_ban', 'permanent_ban')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. Geo Blocks Table
CREATE TABLE IF NOT EXISTS public.geo_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  reason text,
  blocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 5. Admin Action Logs Table
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email text,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_entity_id text,
  target_entity_type text,
  reason text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 6. Enable Row Level Security for new tables
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies — allow full access for authenticated users (admin access controlled in app layer)
CREATE POLICY "Allow all for authenticated" ON public.session_logs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON public.user_strikes
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON public.geo_blocks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON public.admin_action_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- 8. Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_strikes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geo_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_action_logs;

-- 9. Index for performance
CREATE INDEX IF NOT EXISTS idx_user_strikes_user_id ON public.user_strikes(user_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_user_a ON public.session_logs(user_a_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_user_b ON public.session_logs(user_b_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin ON public.admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target ON public.admin_action_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_geo_blocks_code ON public.geo_blocks(country_code);

-- 10. Add chat_log_id to reports table
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS chat_log_id uuid REFERENCES public.chat_logs(id) ON DELETE SET NULL;
