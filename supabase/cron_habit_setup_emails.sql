-- Cron job to send "Set up your habits" reminder emails
-- Runs every Monday at 3:00 PM UTC (9:00 AM CST)
-- Targets users with completed profiles but no habits configured

-- PREREQUISITE: Store the service role key in Supabase Vault first:
-- SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key', 'Service role key for edge function authentication');

SELECT cron.schedule(
  'send-habit-setup-emails',
  '0 15 * * 1', -- Every Monday at 3:00 PM UTC (9:00 AM CST)
  $$
  SELECT
    net.http_post(
      url:='https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/send-habit-setup-emails',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- To check if the cron job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'send-habit-setup-emails';

-- To unschedule the cron job (if needed):
-- SELECT cron.unschedule('send-habit-setup-emails');

-- To manually trigger the function (for testing):
-- curl -X POST 'https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/send-habit-setup-emails' \
--   -H 'Authorization: Bearer YOUR_ANON_KEY' \
--   -H 'Content-Type: application/json'
