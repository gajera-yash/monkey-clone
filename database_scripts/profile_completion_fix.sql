-- Add is_profile_completed column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_profile_completed boolean DEFAULT false;

-- One-time update for existing users who already have birthdate and gender
UPDATE public.profiles
SET is_profile_completed = true
WHERE birthdate IS NOT NULL AND gender IS NOT NULL;
