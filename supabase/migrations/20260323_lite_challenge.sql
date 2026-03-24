-- Lite Tech Neck Challenge tables
-- 5-day SMS/email lead funnel ($1 one-time payment)

-- Enrollment table
CREATE TABLE lite_challenge_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_slug TEXT NOT NULL DEFAULT 'tech-neck',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'active', 'completed')),
  delivery_track TEXT NOT NULL DEFAULT 'sms'
    CHECK (delivery_track IN ('sms', 'email_only')),
  cohort_start_date DATE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  paid_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_slug)
);

-- SMS/email send log (dedup via UNIQUE constraint)
CREATE TABLE lite_challenge_sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES lite_challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  challenge_day INT NOT NULL CHECK (challenge_day BETWEEN 1 AND 5),
  message_slot TEXT NOT NULL
    CHECK (message_slot IN ('8am','10am','12pm','3pm','5pm','daily_email','summary_email')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('sms', 'email')),
  twilio_sid TEXT,
  resend_id TEXT,
  UNIQUE(enrollment_id, challenge_day, message_slot)
);

-- Add challenge_type to profiles for routing lite users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS challenge_type TEXT DEFAULT NULL;

-- RLS
ALTER TABLE lite_challenge_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lite_challenge_sms_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on lite_challenge_enrollments"
  ON lite_challenge_enrollments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on lite_challenge_sms_log"
  ON lite_challenge_sms_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users can read own enrollments
CREATE POLICY "Users can read own enrollments"
  ON lite_challenge_enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_lite_enrollments_status ON lite_challenge_enrollments(status);
CREATE INDEX idx_lite_enrollments_user_id ON lite_challenge_enrollments(user_id);
CREATE INDEX idx_lite_sms_log_enrollment ON lite_challenge_sms_log(enrollment_id);
