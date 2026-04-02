-- Extend sent_by_type CHECK to include onboarding SMS types
ALTER TABLE sms_messages DROP CONSTRAINT IF EXISTS sms_messages_sent_by_type_check;
ALTER TABLE sms_messages ADD CONSTRAINT sms_messages_sent_by_type_check
  CHECK (sent_by_type IN (
    'admin', 'system', 'coach', 'synthesis',
    'trial_reminder', 'trial_drip', 'challenge_completion',
    'onboarding_sms_day_2', 'onboarding_sms_day_3', 'onboarding_sms_day_4',
    'onboarding_sms_day_5', 'onboarding_sms_day_6', 'onboarding_sms_day_7'
  ));
