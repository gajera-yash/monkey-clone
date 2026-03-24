-- 1. Ensure Profiles Table has necessary columns for engagement tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_chats integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_chat_duration integer DEFAULT 0, -- in seconds
  ADD COLUMN IF NOT EXISTS avg_chat_duration integer DEFAULT 0; -- in seconds

-- 2. Create function to recalculate user engagement stats
CREATE OR REPLACE FUNCTION public.sync_user_engagement_stats(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_chats integer;
    v_total_duration integer;
    v_avg_duration integer;
BEGIN
    -- Count chats where user is either participant 1 or 2 AND the chat has ended
    SELECT 
        COUNT(*),
        COALESCE(SUM(duration), 0)
    INTO 
        v_total_chats,
        v_total_duration
    FROM public.chat_logs
    WHERE (user1_id = user_uuid OR user2_id = user_uuid)
      AND end_time IS NOT NULL;

    -- Calculate average
    IF v_total_chats > 0 THEN
        v_avg_duration := v_total_duration / v_total_chats;
    ELSE
        v_avg_duration := 0;
    END IF;

    -- Update the profile
    UPDATE public.profiles
    SET 
        total_chats = v_total_chats,
        total_chat_duration = v_total_duration,
        avg_chat_duration = v_avg_duration
    WHERE id = user_uuid;
END;
$$;

-- 3. Create Trigger Function for Chat Logs
CREATE OR REPLACE FUNCTION public.on_chat_log_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update stats for both users involved in the chat
    -- We only care about NEW inserts or UPDATES that set end_time/duration
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.end_time IS NOT NULL) THEN
            PERFORM public.sync_user_engagement_stats(NEW.user1_id);
            PERFORM public.sync_user_engagement_stats(NEW.user2_id);
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If end_time was just set, update stats
        IF (NEW.end_time IS NOT NULL AND (OLD.end_time IS NULL OR NEW.duration <> OLD.duration)) THEN
            PERFORM public.sync_user_engagement_stats(NEW.user1_id);
            PERFORM public.sync_user_engagement_stats(NEW.user2_id);
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        PERFORM public.sync_user_engagement_stats(OLD.user1_id);
        PERFORM public.sync_user_engagement_stats(OLD.user2_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. Apply Triggers to Chat Logs
DROP TRIGGER IF EXISTS trigger_update_engagement_on_chat_log_change ON public.chat_logs;
CREATE TRIGGER trigger_update_engagement_on_chat_log_change
AFTER INSERT OR UPDATE OR DELETE ON public.chat_logs
FOR EACH ROW EXECUTE FUNCTION public.on_chat_log_change();

-- 5. Force a one-time sync for existing users
-- Uncomment the following line if you want to sync all users immediately after running this script
-- DO $$ 
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN SELECT id FROM public.profiles LOOP
--     PERFORM public.sync_user_engagement_stats(r.id);
--   END LOOP;
-- END $$;
