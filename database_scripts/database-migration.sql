-- 1. Create Team Members Table
CREATE TABLE IF NOT EXISTS public.admin_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text,
  role text DEFAULT 'moderator',
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- 2. Create Filter Costs Table
CREATE TABLE IF NOT EXISTS public.filter_coin_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_name text UNIQUE NOT NULL,
  coin_cost integer DEFAULT 0,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Initial filter data
INSERT INTO public.filter_coin_costs (filter_name, coin_cost) VALUES
  ('gender', 15), 
  ('country', 30), 
  ('age', 10), 
  ('interests', 20)
ON CONFLICT (filter_name) DO NOTHING;

-- 3. Modify Profiles Table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_country text,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS safety_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS match_preferences jsonb DEFAULT '{}'::jsonb;

-- 4. Modify Chat Logs Table
ALTER TABLE public.chat_logs
  ADD COLUMN IF NOT EXISTS room_id text,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS duration integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_count integer DEFAULT 0;

-- 5. Modify Subscription Plans Table
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS coins integer DEFAULT 0;

-- 6. Setup System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.system_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('daily_coins', '10'),
  ('premium_match_priority', 'true'),
  ('streak_rewards', '[100,500,1000,5000,10000,50000,100000]')
ON CONFLICT (key) DO NOTHING;

-- 7. Add Realtime publications for the new elements
-- Note: Replace these if Supabase Studio is used for Realtime enabling
alter publication supabase_realtime add table chat_logs;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table system_settings;
