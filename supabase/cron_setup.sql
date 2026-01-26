-- =====================================================
-- Cron Job Setup for Edge Functions
-- =====================================================
--
-- This file documents how to set up cron jobs that call
-- Supabase Edge Functions with proper authentication.
--
-- IMPORTANT: Run these steps in order in the Supabase SQL Editor.

-- =====================================================
-- STEP 1: Create the app_config table (one-time setup)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- =====================================================
-- STEP 2: Store the service role key (split to avoid line breaks)
-- =====================================================
-- Get your service_role key from: Supabase Dashboard > Settings > API
-- Split into parts and concatenate to avoid SQL Editor line wrapping

DELETE FROM app_config WHERE key = 'service_role_key';

INSERT INTO app_config (key, value)
VALUES (
  'service_role_key',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' ||
  'YOUR_PAYLOAD_PART_HERE.' ||
  'YOUR_SIGNATURE_PART_HERE'
);

-- Verify: length should be 219 for a standard Supabase JWT
SELECT length(value) FROM app_config WHERE key = 'service_role_key';

-- =====================================================
-- STEP 3: Create the helper function
-- =====================================================
CREATE OR REPLACE FUNCTION call_edge_function(function_name TEXT)
RETURNS BIGINT AS $$
DECLARE
  auth_token TEXT;
BEGIN
  SELECT value INTO auth_token FROM app_config WHERE key = 'service_role_key';

  RETURN net.http_post(
    url := 'https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || auth_token
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- Test it:
-- SELECT call_edge_function('send-reflection-reminders');
-- SELECT status_code, content FROM net._http_response WHERE id = <returned_id>;

-- =====================================================
-- STEP 4: Schedule the cron jobs
-- =====================================================

-- Reflection reminders - Sundays 6PM UTC (12PM CST)
SELECT cron.schedule('send-sunday-reflection-reminders', '0 18 * * 0', $$SELECT call_edge_function('send-reflection-reminders')$$);

-- Habit setup emails - Mondays 3PM UTC (9AM CST)
SELECT cron.schedule('send-habit-setup-emails', '0 15 * * 1', $$SELECT call_edge_function('send-habit-setup-emails')$$);

-- Habit tracking prompts - Wednesdays 3PM UTC (9AM CST)
SELECT cron.schedule('send-habit-tracking-prompts', '0 15 * * 3', $$SELECT call_edge_function('send-habit-tracking-emails')$$);

-- Weekly digest generation - Mondays 1PM UTC (7AM CST)
SELECT cron.schedule('generate-weekly-digests', '0 13 * * 1', $$SELECT call_edge_function('generate-all-weekly-digests')$$);

-- Weekly digest sending - Mondays 2PM UTC (8AM CST)
SELECT cron.schedule('send-weekly-digests', '0 14 * * 1', $$SELECT call_edge_function('send-all-weekly-digests')$$);

-- =====================================================
-- Useful commands
-- =====================================================

-- View all scheduled jobs:
-- SELECT jobname, schedule, active FROM cron.job;

-- Unschedule a job:
-- SELECT cron.unschedule('job-name-here');

-- Check HTTP response for a request:
-- SELECT status_code, content FROM net._http_response WHERE id = <request_id>;

-- Manually trigger a function:
-- SELECT call_edge_function('function-name-here');
