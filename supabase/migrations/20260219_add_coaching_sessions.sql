-- Coaching sessions table for tracking 1:1 coaching sessions per billing period
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  logged_by TEXT NOT NULL DEFAULT 'admin',
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_billing_period ON coaching_sessions(user_id, billing_period_start, billing_period_end);

ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own coaching sessions
DO $$ BEGIN
  CREATE POLICY "Users can view own coaching sessions"
    ON coaching_sessions FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role (edge functions / admin) can do everything
DO $$ BEGIN
  CREATE POLICY "Service role full access to coaching sessions"
    ON coaching_sessions
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
