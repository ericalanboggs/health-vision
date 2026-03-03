-- Extend sent_by_type CHECK constraint to support coach and synthesis messages
-- Must be applied before deploying updated habit-sms-response and send-weekly-synthesis-sms

ALTER TABLE sms_messages DROP CONSTRAINT IF EXISTS sms_messages_sent_by_type_check;
ALTER TABLE sms_messages ADD CONSTRAINT sms_messages_sent_by_type_check
  CHECK (sent_by_type IN ('admin', 'system', 'coach', 'synthesis'));

-- Partial index for efficient synthesis deduplication (one per user per week)
CREATE INDEX IF NOT EXISTS idx_sms_messages_synthesis_dedup
  ON sms_messages(user_id, created_at DESC)
  WHERE sent_by_type = 'synthesis' AND direction = 'outbound';
