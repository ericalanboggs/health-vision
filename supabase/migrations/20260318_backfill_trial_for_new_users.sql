-- Backfill trial_ends_at for users who signed up after the 20260304 migration
-- but before the frontend fix that sets trial on profile completion.
UPDATE profiles
SET trial_started_at = created_at,
    trial_ends_at = created_at + interval '7 days'
WHERE (profile_completed = true OR onboarding_completed = true)
  AND trial_started_at IS NULL
  AND trial_ends_at IS NULL
  AND subscription_status IS NULL
  AND deleted_at IS NULL;
