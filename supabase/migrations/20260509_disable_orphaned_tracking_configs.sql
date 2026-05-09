-- Disable habit_tracking_config rows whose habit_name has no active
-- (non-archived) weekly_habits row for that user.
--
-- These configs accumulate when a user changes habits or archives challenge
-- habits without their config being cleaned up. They pollute the smart-parse
-- AI's habit menu in habit-sms-response and lead to misidentified logs.
--
-- Idempotent: subsequent runs just re-disable the same set (or nothing if
-- already disabled).

UPDATE habit_tracking_config tc
SET tracking_enabled = false
WHERE tc.tracking_enabled = true
  AND NOT EXISTS (
    SELECT 1
    FROM weekly_habits wh
    WHERE wh.user_id = tc.user_id
      AND wh.habit_name = tc.habit_name
      AND wh.archived_at IS NULL
  );
