-- SMS Manage Habit Sessions: confirm-first state machine for managing existing habits via SMS
-- (archive / pause / resume / edit-schedule / add). The LLM only extracts intent; this session
-- stores the RESOLVED, concrete plan between the "confirm?" turn and the "YES" that executes it.
CREATE TABLE IF NOT EXISTS sms_manage_habit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL DEFAULT 'awaiting_confirm',
  -- context.plan = normalized [{op, habit_name, days?, time?, tracking_type?}], built by code from
  -- the LLM extraction + DB resolution, so the confirmation and execution use trusted data.
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_sms_manage_habit_sessions_user ON sms_manage_habit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_manage_habit_sessions_expires ON sms_manage_habit_sessions(expires_at);

ALTER TABLE sms_manage_habit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on manage habit sessions"
  ON sms_manage_habit_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
