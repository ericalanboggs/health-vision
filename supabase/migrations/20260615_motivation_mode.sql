-- Migration: Motivation Mode
-- Description: A pre-action-stage track (TTM contemplation) that sends a daily curated
--   piece of inspiration (short video / quote / article) aligned to a user's Vision +
--   coach-authored steering prompt, plus a weekly readiness check-in that can hand the
--   user off into habit-tracking when they're ready. Admin-flag enabled (no user UI for MVP).
--
-- Adds:
--   * profiles columns: motivation_mode, motivation_prompt, motivation_cadence, motivation_checkin_day
--   * motivation_content_queue        (the weekly batch + sent-history log)
--   * motivation_checkins             (permanent readiness-ruler record)
--   * sms_motivation_checkin_sessions (transient multi-turn check-in conversation state)

-- ============================================================================
-- profiles: Motivation Mode flags
-- ============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS motivation_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivation_prompt TEXT,
  ADD COLUMN IF NOT EXISTS motivation_cadence TEXT,          -- NULL until set; e.g. 'daily' | 'weekly_x3'
  ADD COLUMN IF NOT EXISTS motivation_checkin_day INTEGER;   -- 0-6 (0=Sunday), user's local week day

COMMENT ON COLUMN profiles.motivation_mode IS 'When true, user is in the pre-action-stage Motivation Mode track and is excluded from all action-stage senders (reminders, followups, reflections, digests).';
COMMENT ON COLUMN profiles.motivation_prompt IS 'Coach-authored steering prompt injected into every content-batch generation. The personalized thesis for what motivation this user wants.';
COMMENT ON COLUMN profiles.motivation_cadence IS 'Send cadence: daily | weekly_x3. NULL until configured.';
COMMENT ON COLUMN profiles.motivation_checkin_day IS 'Day of week (0=Sun..6=Sat, user local) the weekly readiness check-in is sent.';

-- ============================================================================
-- Table: motivation_content_queue
-- The weekly batch of curated content AND the permanent sent-history log.
-- Generation reads prior rows for this user so the content "builds on itself".
-- ============================================================================
CREATE TABLE IF NOT EXISTS motivation_content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'quote', 'article')),
  title TEXT,
  url TEXT,                 -- NULL for quotes
  body TEXT,                -- quote text, or short description for video/article
  coach_framing TEXT,       -- the coach-voice line sent alongside the link
  week_batch INTEGER NOT NULL,
  scheduled_date DATE,      -- the day this item is intended to send
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'sent', 'skipped')),
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
  -- manual items are coach-added and skip link-verification
  feedback TEXT,            -- lightweight user feedback captured on the sent item
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily send picks the next approved row for a user; admin review lists pending rows.
CREATE INDEX IF NOT EXISTS idx_motivation_queue_user_status_date
  ON motivation_content_queue(user_id, status, scheduled_date);

-- De-dup / history lookups during generation
CREATE INDEX IF NOT EXISTS idx_motivation_queue_user_created
  ON motivation_content_queue(user_id, created_at);

ALTER TABLE motivation_content_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all motivation content"
  ON motivation_content_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admin can read/edit/add/approve content from the admin composer (browser, admin JWT).
-- Mirrors the admin pattern used for user_resources (20260312) and health_journeys (20260519).
CREATE POLICY "Admin can manage all motivation content"
  ON motivation_content_queue FOR ALL
  USING (auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'))
  WITH CHECK (auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

COMMENT ON TABLE motivation_content_queue IS 'Weekly batch of curated Motivation Mode content plus the sent-history log. Generation reads prior rows so content builds on itself. source=manual items are coach-added and skip link verification.';

-- ============================================================================
-- Table: motivation_checkins
-- Permanent record of the weekly readiness ruler (the "conveyor belt" metric).
-- ============================================================================
CREATE TABLE IF NOT EXISTS motivation_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  readiness_score INTEGER CHECK (readiness_score BETWEEN 1 AND 10),
  content_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_motivation_checkins_user_created
  ON motivation_checkins(user_id, created_at);

ALTER TABLE motivation_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all motivation checkins"
  ON motivation_checkins FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admin can view a user's readiness history in the admin composer.
CREATE POLICY "Admin can read all motivation checkins"
  ON motivation_checkins FOR SELECT
  USING (auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

COMMENT ON TABLE motivation_checkins IS 'Weekly readiness-ruler responses (1-10) + content feedback. Two consecutive scores >= 7 triggers the habit handoff offer.';

-- ============================================================================
-- Table: sms_motivation_checkin_sessions
-- Transient multi-turn check-in conversation state. Mirrors sms_reflection_sessions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_motivation_checkin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL DEFAULT 'awaiting_reply',
  -- Steps: awaiting_reply (ruler) -> awaiting_feedback -> done
  context JSONB NOT NULL DEFAULT '{}',
  -- Context stores:
  --   week: the check-in week number
  --   messages: [{role: 'assistant'|'user', content: '...'}]
  --   exchange_count: number of user replies received
  --   readiness_score: parsed 1-10 once captured
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours')
);

CREATE INDEX IF NOT EXISTS idx_motivation_sessions_user_expires
  ON sms_motivation_checkin_sessions(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_motivation_sessions_expires
  ON sms_motivation_checkin_sessions(expires_at);

ALTER TABLE sms_motivation_checkin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all motivation checkin sessions"
  ON sms_motivation_checkin_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE sms_motivation_checkin_sessions IS 'Transient multi-turn state for the weekly Motivation Mode readiness check-in SMS flow. Sessions expire after 2 hours.';
