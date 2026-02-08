-- Migration: Create sms_pending_clarification table
-- Description: Tracks pending clarifying questions for smart habit logging via SMS

CREATE TABLE IF NOT EXISTS sms_pending_clarification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pending_type TEXT NOT NULL CHECK (pending_type IN ('unit_conversion', 'habit_selection', 'metric_needed', 'boolean_needed')),
  context JSONB NOT NULL DEFAULT '{}',
  -- Context examples:
  -- unit_conversion: { "matched_habit": "Water", "user_value": 8, "user_unit": "glasses", "target_unit": "oz" }
  -- habit_selection: { "possible_habits": ["Morning run", "Evening walk"], "user_input": "exercised" }
  -- metric_needed: { "matched_habit": "Meditation", "metric_unit": "minutes" }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_sms_pending_clarification_user ON sms_pending_clarification(user_id);

-- Index for cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_sms_pending_clarification_expires ON sms_pending_clarification(expires_at);

-- Enable Row Level Security
ALTER TABLE sms_pending_clarification ENABLE ROW LEVEL SECURITY;

-- Service role can manage all records (edge functions use service role)
CREATE POLICY "Service role can manage all pending clarifications"
  ON sms_pending_clarification FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE sms_pending_clarification IS 'Tracks pending clarifying questions for smart habit logging via SMS. Records auto-expire after 10 minutes.';
