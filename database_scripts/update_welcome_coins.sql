-- Update the default value for the coins column in the profiles table
ALTER TABLE public.profiles 
ALTER COLUMN coins SET DEFAULT 50;

-- Optional: Update any existing users who still have 0 coins if needed
-- UPDATE public.profiles SET coins = 50 WHERE coins = 0;

-- Commentary: This ensures that new users created via any method (frontend or direct DB)
-- will receive 50 coins by default.
