-- Add referral tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Function to generate a default referral code for existing users
-- Using substring of ID for simplicity as seen in CreatorSettings.jsx
UPDATE profiles SET referral_code = substring(id::text, 1, 8) WHERE referral_code IS NULL;

-- Create referral_earnings table
CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES profiles(id),
    referred_user_id UUID REFERENCES profiles(id),
    amount FLOAT DEFAULT 0,
    earnings_type TEXT DEFAULT 'commission', -- e.g. 'commission' from creator earnings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings(referrer_id);
