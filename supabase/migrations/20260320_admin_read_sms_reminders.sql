-- Add admin SELECT policy for sms_reminders
-- Without this, admin can only see their own reminders (via user_id match)
-- but not other users' reminders in the conversation view.

CREATE POLICY "Admin can read all sms_reminders"
  ON sms_reminders FOR SELECT
  USING (auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com');
