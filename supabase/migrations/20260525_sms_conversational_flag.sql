-- Per-user opt-in for conversational SMS coaching tone.
-- Phase 1: changes prompts in send-sms-reminders and habit-sms-followup only.
-- Future phases (per-habit timing, threaded followups, habit_kind logic,
-- trend nudges) will branch on this same flag.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sms_conversational BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin needs UPDATE on profiles to toggle this from the admin user detail
-- page. Today only SELECT and DELETE admin policies exist, which silently
-- blocks tracking_followup_time edits too — this fixes that as well.
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (
    auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  )
  WITH CHECK (
    auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  );
