-- CLEAN RECREATION OF RPC FUNCTION
-- Run this in Supabase SQL Editor

-- 1. Drop the function first to avoid signature conflicts
DROP FUNCTION IF EXISTS public.update_creator_balance(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.update_creator_balance(text, integer, integer);
DROP FUNCTION IF EXISTS public.update_creator_balance(uuid, integer);

-- 2. Create the function with the precise signature expected by the app
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
    UPDATE public.profiles
    SET 
        coins = COALESCE(coins, 0) + earned,
        last_seen = now()
    WHERE id = user_id;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.update_creator_balance(uuid, integer, integer) TO anon, authenticated, service_role;
