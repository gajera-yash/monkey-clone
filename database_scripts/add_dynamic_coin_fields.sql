ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS coins integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_label text,
ADD COLUMN IF NOT EXISTS icon text DEFAULT '🪙',
ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Drop constraints that might block the simplified form
ALTER TABLE public.subscription_plans 
DROP CONSTRAINT IF EXISTS subscription_plans_tier_key,
ALTER COLUMN tier SET DEFAULT 'standard',
ALTER COLUMN features DROP NOT NULL,
ALTER COLUMN coins_per_month DROP NOT NULL;

-- Adjust seed to include tier and use 'coins' column
DELETE FROM public.subscription_plans;
INSERT INTO public.subscription_plans (name, coins, price_monthly_inr, icon, discount_label, is_popular, sort_order, tier)
VALUES 
('Starter', 100, 99, '🪙', NULL, false, 1, 'standard'),
('Popular', 500, 449, '💰', '10% OFF', true, 2, 'standard'),
('Best Value', 1000, 799, '💎', '20% OFF', false, 3, 'standard'),
('Pro', 5000, 3499, '👑', '30% OFF', false, 4, 'standard');
