-- Add admin DELETE policies for eric.alan.boggs@gmail.com

-- Admin can delete all profiles
DROP POLICY IF EXISTS "Admin can delete all profiles" ON profiles;
CREATE POLICY "Admin can delete all profiles"
  ON profiles FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all health journeys
DROP POLICY IF EXISTS "Admin can delete all journeys" ON health_journeys;
CREATE POLICY "Admin can delete all journeys"
  ON health_journeys FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all weekly habits
DROP POLICY IF EXISTS "Admin can delete all habits" ON weekly_habits;
CREATE POLICY "Admin can delete all habits"
  ON weekly_habits FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all weekly reflections
DROP POLICY IF EXISTS "Admin can delete all reflections" ON weekly_reflections;
CREATE POLICY "Admin can delete all reflections"
  ON weekly_reflections FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all SMS messages
DROP POLICY IF EXISTS "Admin can delete all sms messages" ON sms_messages;
CREATE POLICY "Admin can delete all sms messages"
  ON sms_messages FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all SMS reminders
DROP POLICY IF EXISTS "Admin can delete all sms reminders" ON sms_reminders;
CREATE POLICY "Admin can delete all sms reminders"
  ON sms_reminders FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all pilot feedback
DROP POLICY IF EXISTS "Admin can delete all pilot feedback" ON pilot_feedback;
CREATE POLICY "Admin can delete all pilot feedback"
  ON pilot_feedback FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all habit tracking config
DROP POLICY IF EXISTS "Admin can delete all tracking config" ON habit_tracking_config;
CREATE POLICY "Admin can delete all tracking config"
  ON habit_tracking_config FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all habit tracking entries
DROP POLICY IF EXISTS "Admin can delete all tracking entries" ON habit_tracking_entries;
CREATE POLICY "Admin can delete all tracking entries"
  ON habit_tracking_entries FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can delete all SMS followup log
DROP POLICY IF EXISTS "Admin can delete all sms followup log" ON sms_followup_log;
CREATE POLICY "Admin can delete all sms followup log"
  ON sms_followup_log FOR DELETE
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );
