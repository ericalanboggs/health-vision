-- =====================================================
-- Cron Job: Delivery Completeness Check
-- =====================================================
--
-- Runs daily at 3PM UTC (9AM CST) to detect missing deliveries.
--
-- Why 3PM UTC?
-- - SMS reminders: All US timezone morning habits (including Pacific 7am = 15:00 UTC) have fired
-- - Weekly digests: Monday digest sending runs at 2PM UTC, so 3PM gives 1hr margin
-- - Daily health report runs at 1PM UTC — too early for these checks
--
-- This catches OMISSIONS (expected deliveries that never happened),
-- while the daily-health-report catches FAILURES (deliveries that errored).
--
-- Prerequisites:
-- - app_config table with service_role_key (see cron_setup.sql)
-- - call_edge_function() helper (see cron_setup.sql)

-- Schedule the job
SELECT cron.schedule(
  'delivery-completeness-check',
  '0 15 * * *',
  $$SELECT call_edge_function('delivery-completeness-check')$$
);

-- Verify it was created:
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'delivery-completeness-check';

-- Manually trigger:
-- SELECT call_edge_function('delivery-completeness-check');

-- Unschedule if needed:
-- SELECT cron.unschedule('delivery-completeness-check');
