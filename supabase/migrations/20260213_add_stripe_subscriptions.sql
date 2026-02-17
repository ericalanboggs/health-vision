-- Add Stripe subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ DEFAULT NULL;

-- subscription_status: 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
-- subscription_tier: 'core', 'plus', 'premium'

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
