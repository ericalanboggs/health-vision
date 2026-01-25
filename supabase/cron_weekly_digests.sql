-- Cron jobs for weekly digest generation and sending
-- Two-step process:
-- 1. Generate digests at 7:00 AM CST (1:00 PM UTC)
-- 2. Send digests at 8:00 AM CST (2:00 PM UTC)

-- Step 1: Generate all weekly digests
SELECT cron.schedule(
  'generate-weekly-digests',
  '0 13 * * 1', -- Every Monday at 1:00 PM UTC (7:00 AM CST)
  $$
  SELECT
    net.http_post(
      url:='https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/generate-all-weekly-digests',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Step 2: Send all weekly digests
SELECT cron.schedule(
  'send-weekly-digests',
  '0 14 * * 1', -- Every Monday at 2:00 PM UTC (8:00 AM CST)
  $$
  SELECT
    net.http_post(
      url:='https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/send-all-weekly-digests',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- To check scheduled cron jobs:
-- SELECT * FROM cron.job WHERE jobname IN ('generate-weekly-digests', 'send-weekly-digests');

-- To unschedule (if needed):
-- SELECT cron.unschedule('generate-weekly-digests');
-- SELECT cron.unschedule('send-weekly-digests');

-- To manually trigger generation:
-- SELECT net.http_post(
--   url:='https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/generate-all-weekly-digests',
--   headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
--   body:='{}'::jsonb
-- );

-- To manually trigger sending:
-- SELECT net.http_post(
--   url:='https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/send-all-weekly-digests',
--   headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
--   body:='{}'::jsonb
-- );
