-- SMS Add Habit Sessions: state machine for creating habits via SMS
CREATE TABLE IF NOT EXISTS sms_add_habit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL DEFAULT 'describe_habit',
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_sms_add_habit_sessions_user ON sms_add_habit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_add_habit_sessions_expires ON sms_add_habit_sessions(expires_at);

ALTER TABLE sms_add_habit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on add habit sessions"
  ON sms_add_habit_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
