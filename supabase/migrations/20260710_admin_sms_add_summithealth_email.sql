-- Add eric@summithealth.app as an admin on the SMS tables.
--
-- The sms_messages / sms_reminders admin policies were originally scoped to
-- eric.alan.boggs@gmail.com only (migrations 20260207, 20260209, 20260320),
-- while newer tables use the two-email IN (...) allowlist. This brings the SMS
-- tables in line so the iOS coach app (and web admin) work when signed in as
-- eric@summithealth.app. Additive — gmail access is preserved.

-- ---------- sms_messages ----------

-- SELECT (read all conversations)
DROP POLICY IF EXISTS "Admin can read all sms_messages" ON sms_messages;
CREATE POLICY "Admin can read all sms_messages"
  ON sms_messages FOR SELECT
  USING (auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

-- INSERT (manual sends; edge functions use service_role and are unaffected)
DROP POLICY IF EXISTS "Admin can insert sms_messages" ON sms_messages;
CREATE POLICY "Admin can insert sms_messages"
  ON sms_messages FOR INSERT
  WITH CHECK (auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

-- DELETE
DROP POLICY IF EXISTS "Admin can delete all sms messages" ON sms_messages;
CREATE POLICY "Admin can delete all sms messages"
  ON sms_messages FOR DELETE
  USING (auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

-- ---------- sms_reminders ----------

-- SELECT (needed for the merged conversation view)
DROP POLICY IF EXISTS "Admin can read all sms_reminders" ON sms_reminders;
CREATE POLICY "Admin can read all sms_reminders"
  ON sms_reminders FOR SELECT
  USING (auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

-- DELETE
DROP POLICY IF EXISTS "Admin can delete all sms reminders" ON sms_reminders;
CREATE POLICY "Admin can delete all sms reminders"
  ON sms_reminders FOR DELETE
  USING (auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));
