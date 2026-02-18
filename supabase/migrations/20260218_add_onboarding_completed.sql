ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Backfill existing subscribed users
UPDATE profiles SET onboarding_completed = true
WHERE profile_completed = true
  AND subscription_status IN ('trialing', 'active');
