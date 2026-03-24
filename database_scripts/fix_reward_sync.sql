-- 8. Fix Daily Reward Sync
-- Move daily reward tracking to the database to prevent per-device duplicates

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reward_streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reward_claim timestamptz;

-- Commentary: Users will now have their reward status synced 
-- across all devices linked to the same email.
