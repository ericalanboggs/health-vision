-- Daily health report cron job
-- Runs at 7:00 AM CST (13:00 UTC) every day
-- Uses the existing call_edge_function() helper

SELECT cron.schedule(
  'daily-health-report',
  '0 13 * * *',
  $$
  SELECT call_edge_function('daily-health-report');
  $$
);
