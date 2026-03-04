-- Add trial_started_at to profiles for internal trial tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

-- Backfill existing onboarded users without subscriptions
UPDATE profiles
SET trial_started_at = created_at,
    trial_ends_at = created_at + interval '7 days'
WHERE onboarding_completed = true
  AND trial_started_at IS NULL
  AND subscription_status IS NULL
  AND deleted_at IS NULL;

-- Extend sent_by_type CHECK for trial SMS/email types
ALTER TABLE sms_messages DROP CONSTRAINT IF EXISTS sms_messages_sent_by_type_check;
ALTER TABLE sms_messages ADD CONSTRAINT sms_messages_sent_by_type_check
  CHECK (sent_by_type IN ('admin', 'system', 'coach', 'synthesis', 'trial_reminder', 'trial_drip'));
