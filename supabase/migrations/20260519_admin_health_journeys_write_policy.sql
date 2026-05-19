-- Admin can insert/update/delete all health_journeys rows.
-- Needed so admins can fill in a user's vision from the admin user detail
-- page when the user dropped off before completing onboarding.
-- Mirrors the pattern used for habit_tracking_config (20260319) and
-- user_resources (20260312).

DROP POLICY IF EXISTS "Admin can manage all journeys" ON health_journeys;
CREATE POLICY "Admin can manage all journeys"
  ON health_journeys FOR ALL
  USING (
    auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  )
  WITH CHECK (
    auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  );
