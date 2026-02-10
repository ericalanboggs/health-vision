-- Migration: Create backup plan tables
-- Description: Tables for the SMS BACKUP feature that lets users adjust habit plans mid-week

-- ============================================================================
-- Table: sms_backup_sessions
-- Tracks multi-step coaching conversation state for the BACKUP SMS flow
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_backup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL DEFAULT 'start',
  context JSONB NOT NULL DEFAULT '{}',
  -- Context stores conversation state:
  -- habits_presented: [{habit_name, current_target, current_unit, current_days_count}]
  -- selected_habit: the habit user chose
  -- suggested_target: what AI suggested
  -- suggested_days: how many days AI suggested
  -- original_target: so we can log what changed
  -- original_days: original day count
  -- ai_reasoning: the evidence/encouragement given
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_sms_backup_sessions_user ON sms_backup_sessions(user_id);

-- Index for cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_sms_backup_sessions_expires ON sms_backup_sessions(expires_at);

-- Enable Row Level Security
ALTER TABLE sms_backup_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can manage all records (edge functions use service role)
CREATE POLICY "Service role can manage all backup sessions"
  ON sms_backup_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE sms_backup_sessions IS 'Tracks multi-step coaching conversation state for the SMS BACKUP plan adjustment flow. Sessions auto-expire after 30 minutes.';

-- ============================================================================
-- Table: backup_plan_log
-- Audit trail of all plan adjustments made via the BACKUP feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS backup_plan_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'reduce_target', 'reduce_days', 'both'
  original_value JSONB NOT NULL, -- {target: 30, unit: 'minutes', days: 5}
  new_value JSONB NOT NULL,      -- {target: 10, unit: 'minutes', days: 3}
  ai_reasoning TEXT,             -- the evidence/encouragement given
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups by user
CREATE INDEX IF NOT EXISTS idx_backup_plan_log_user ON backup_plan_log(user_id);

-- Enable Row Level Security
ALTER TABLE backup_plan_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage all records
CREATE POLICY "Service role can manage all backup plan logs"
  ON backup_plan_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can view their own backup logs
CREATE POLICY "Users can view their own backup plan logs"
  ON backup_plan_log FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE backup_plan_log IS 'Audit trail of all habit plan adjustments made via the SMS BACKUP feature.';
