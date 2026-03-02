-- RPC function to query failed cron job responses from net._http_response
-- Used by the daily-health-report edge function
CREATE OR REPLACE FUNCTION get_failed_cron_responses(since_ts timestamptz)
RETURNS TABLE (
  id bigint,
  created timestamptz,
  status_code int,
  url text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    r.id,
    r.created,
    r.status_code,
    -- Extract URL from the request message content
    m.url
  FROM net._http_response r
  LEFT JOIN LATERAL (
    SELECT
      (regexp_match(r.content::text, '"url"\s*:\s*"([^"]+)"'))[1] AS url
  ) m ON true
  WHERE r.created >= since_ts
    AND (r.status_code < 200 OR r.status_code >= 300)
  ORDER BY r.created DESC
  LIMIT 50;
$$;
