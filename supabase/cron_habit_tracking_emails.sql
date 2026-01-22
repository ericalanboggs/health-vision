-- Cron job to send habit tracking prompt emails
-- Sends to users who have habits set up but haven't enabled tracking
-- Runs every Wednesday at 3:00 PM UTC (9:00 AM CST)

-- To install this cron job, run in Supabase SQL Editor:

SELECT cron.schedule(
  'send-habit-tracking-prompts',
  '0 15 * * 3', -- Every Wednesday at 3:00 PM UTC
  $$
  SELECT
    net.http_post(
      url:='https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/send-habit-tracking-emails',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- To check if the cron job exists:
-- SELECT * FROM cron.job WHERE jobname = 'send-habit-tracking-prompts';

-- To remove the cron job:
-- SELECT cron.unschedule('send-habit-tracking-prompts');

-- To manually trigger for testing:
-- SELECT net.http_post(
--   url:='https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/send-habit-tracking-emails',
--   headers:=jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--   ),
--   body:='{}'::jsonb
-- );
