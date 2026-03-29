-- Migration: Create SMS reflection session table + update weekly_reflections
-- Description: Supports multi-turn conversational reflections via SMS

-- ============================================================================
-- Table: sms_reflection_sessions
-- Tracks multi-step reflection conversation state for the Sunday SMS flow
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_reflection_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  step TEXT NOT NULL DEFAULT 'awaiting_reply',
  -- Steps: awaiting_reply -> conversing -> wrapping_up
  context JSONB NOT NULL DEFAULT '{}',
  -- Context stores:
  --   opener_message: the AI synopsis sent
  --   messages: [{role: 'assistant'|'user', content: '...'}]
  --   exchange_count: number of user replies received
  --   tracking_data: habit completion summary or null
  --   challenge_context: {slug, week} or null
  --   habit_names: ['habit1', 'habit2', ...]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours')
);

-- Index for fast lookups by user + expiry (used by session checks)
CREATE INDEX IF NOT EXISTS idx_sms_reflection_sessions_user_expires
  ON sms_reflection_sessions(user_id, expires_at);

-- Index for cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_sms_reflection_sessions_expires
  ON sms_reflection_sessions(expires_at);

-- Enable Row Level Security
ALTER TABLE sms_reflection_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can manage all records (edge functions use service role)
CREATE POLICY "Service role can manage all reflection sessions"
  ON sms_reflection_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE sms_reflection_sessions IS 'Tracks multi-step reflection conversation state for the Sunday SMS reflection flow. Sessions expire after 2 hours.';

-- ============================================================================
-- Add source column to weekly_reflections
-- Tracks whether reflection came from web form or SMS conversation
-- ============================================================================
ALTER TABLE weekly_reflections
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';

COMMENT ON COLUMN weekly_reflections.source IS 'Where the reflection was submitted from: web or sms';

-- ============================================================================
-- Add service role policy to weekly_reflections
-- Edge functions need to insert/update reflections on behalf of users
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_reflections'
    AND policyname = 'Service role can manage all reflections'
  ) THEN
    CREATE POLICY "Service role can manage all reflections"
      ON weekly_reflections FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
