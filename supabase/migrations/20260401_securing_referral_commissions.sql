-- =============================================
-- REFERRAL COMMISSION SYSTEM - Database Trigger
-- =============================================
-- This trigger fires AFTER any coin_transaction of type 'earned' is inserted.
-- It automatically credits the referrer 5% of the earned amount.
-- It is excluded from running during Daily Bonus claims to avoid compounding.
-- =============================================

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION process_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
    referrer_id UUID;
    commission   INT;
    new_referrer_balance INT;
BEGIN
    -- Only process 'earned' transactions (not 'purchase', 'spent', or referral commissions themselves)
    IF NEW.transaction_type != 'earned' THEN
        RETURN NEW;
    END IF;

    -- Exclude daily bonus and referral commissions to avoid infinite loops / compounding
    IF NEW.description ILIKE '%daily bonus%' 
    OR NEW.description ILIKE '%referral commission%'
    OR NEW.description ILIKE '%streak%'
    THEN
        RETURN NEW;
    END IF;

    -- Only process positive amounts
    IF NEW.coins_amount IS NULL OR NEW.coins_amount <= 0 THEN
        RETURN NEW;
    END IF;

    -- Lookup whether this earning user was referred by someone
    SELECT referred_by INTO referrer_id
    FROM profiles
    WHERE id = NEW.user_id;

    -- If no referrer, do nothing
    IF referrer_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate 5% commission (integer floor to avoid fractions)
    commission := FLOOR(NEW.coins_amount * 0.05);

    -- Only proceed if commission is at least 1 coin
    IF commission < 1 THEN
        RETURN NEW;
    END IF;

    -- Atomically update referrer's balance
    UPDATE profiles
    SET coins = COALESCE(coins, 0) + commission
    WHERE id = referrer_id
    RETURNING coins INTO new_referrer_balance;

    -- Log in coin_transactions for referrer (shows up in their earnings history)
    INSERT INTO coin_transactions (
        user_id,
        transaction_type,
        coins_amount,
        coins_balance_after,
        description,
        payment_status
    ) VALUES (
        referrer_id,
        'earned',
        commission,
        new_referrer_balance,
        'Referral commission from ' || (SELECT COALESCE(username, 'a creator') FROM profiles WHERE id = NEW.user_id),
        'completed'
    );

    -- Log in referral_earnings for the dashboard
    INSERT INTO referral_earnings (
        referrer_id,
        referred_user_id,
        amount,
        earnings_type
    ) VALUES (
        referrer_id,
        NEW.user_id,
        commission,
        'commission'
    );

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Silently fail: never block the original earning transaction
    RAISE WARNING '[Referral] commission failed for referrer %: %', referrer_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the trigger if it already exists (idempotent migration)
DROP TRIGGER IF EXISTS trigger_referral_commission ON coin_transactions;

-- 3. Attach the trigger to the coin_transactions table
CREATE TRIGGER trigger_referral_commission
    AFTER INSERT ON coin_transactions
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_commission();

-- =============================================
-- END OF MIGRATION
-- =============================================
