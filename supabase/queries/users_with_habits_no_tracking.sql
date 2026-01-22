-- Users with habits but no tracking enabled
-- Run this query to see who would receive the habit tracking prompt email

SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.created_at as profile_created,
  COUNT(DISTINCT wh.habit_name) as habit_count,
  STRING_AGG(DISTINCT wh.habit_name, ', ' ORDER BY wh.habit_name) as habits
FROM profiles p
INNER JOIN weekly_habits wh ON p.id = wh.user_id
WHERE
  p.profile_completed = true
  AND p.email IS NOT NULL
  -- Exclude users who have ANY tracking enabled
  AND NOT EXISTS (
    SELECT 1 FROM habit_tracking_config htc
    WHERE htc.user_id = p.id
    AND htc.tracking_enabled = true
  )
GROUP BY p.id, p.first_name, p.last_name, p.email, p.created_at
ORDER BY p.created_at DESC;


-- Alternative: Show each habit's tracking status per user
-- Useful for seeing which specific habits lack tracking

SELECT
  p.id as user_id,
  p.first_name,
  p.email,
  wh.habit_name,
  CASE
    WHEN htc.id IS NULL THEN 'Not configured'
    WHEN htc.tracking_enabled = false THEN 'Disabled'
    ELSE 'Enabled'
  END as tracking_status,
  htc.tracking_type,
  htc.metric_unit,
  htc.metric_target
FROM profiles p
INNER JOIN weekly_habits wh ON p.id = wh.user_id
LEFT JOIN habit_tracking_config htc
  ON p.id = htc.user_id
  AND wh.habit_name = htc.habit_name
WHERE
  p.profile_completed = true
  AND p.email IS NOT NULL
GROUP BY p.id, p.first_name, p.email, wh.habit_name, htc.id, htc.tracking_enabled, htc.tracking_type, htc.metric_unit, htc.metric_target
ORDER BY p.created_at DESC, wh.habit_name;


-- Quick count summary
SELECT
  (SELECT COUNT(DISTINCT user_id) FROM weekly_habits) as total_users_with_habits,
  (SELECT COUNT(DISTINCT user_id) FROM habit_tracking_config WHERE tracking_enabled = true) as users_with_tracking,
  (
    SELECT COUNT(DISTINCT wh.user_id)
    FROM weekly_habits wh
    INNER JOIN profiles p ON wh.user_id = p.id
    WHERE p.profile_completed = true
    AND p.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM habit_tracking_config htc
      WHERE htc.user_id = wh.user_id
      AND htc.tracking_enabled = true
    )
  ) as users_without_tracking;
