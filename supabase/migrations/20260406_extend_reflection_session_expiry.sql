-- Extend reflection session expiry from 2 hours to 18 hours.
-- Users often receive the Sunday evening reflection opener and respond
-- the next morning. 2 hours was too short — sessions expired overnight
-- and replies fell through to habit-sms-response instead.
ALTER TABLE sms_reflection_sessions
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '18 hours');
