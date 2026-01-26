-- Cron job to send Sunday reflection reminders
-- Runs every Sunday at 6:00 PM UTC (12:00 PM CST)

-- PREREQUISITE: Store the service role key in Supabase Vault first:
-- SELECT vault.create_secret(
--   'YOUR_SERVICE_ROLE_KEY',
--   'service_role_key',
--   'Service role key for edge function authentication'
-- );

SELECT cron.schedule(
  'send-sunday-reflection-reminders',
  '0 18 * * 0', -- Every Sunday at 6:00 PM UTC
  $$
  SELECT
    net.http_post(
      url:='https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/send-reflection-reminders',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- To check if the cron job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'send-sunday-reflection-reminders';

-- To unschedule the cron job (if needed):
-- SELECT cron.unschedule('send-sunday-reflection-reminders');

-- To verify the vault secret exists:
-- SELECT name, description, created_at FROM vault.secrets WHERE name = 'service_role_key';
