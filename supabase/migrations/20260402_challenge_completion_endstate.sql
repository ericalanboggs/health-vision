-- Challenge completion end-state: SMS dedup + celebration modal guard

-- Idempotency guard for congratulations SMS cron
ALTER TABLE challenge_enrollments
  ADD COLUMN completion_sms_sent_at TIMESTAMPTZ DEFAULT NULL;

-- One-time celebration modal guard
ALTER TABLE challenge_enrollments
  ADD COLUMN celebration_seen_at TIMESTAMPTZ DEFAULT NULL;

-- Extend sent_by_type CHECK for challenge_completion SMS
ALTER TABLE sms_messages DROP CONSTRAINT IF EXISTS sms_messages_sent_by_type_check;
ALTER TABLE sms_messages ADD CONSTRAINT sms_messages_sent_by_type_check
  CHECK (sent_by_type IN ('admin', 'system', 'coach', 'synthesis', 'trial_reminder', 'trial_drip', 'challenge_completion'));
