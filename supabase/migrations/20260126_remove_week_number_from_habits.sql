-- Migration: Remove week_number concept from habits
-- Habits become persistent entities that exist until explicitly deleted
-- Tracking uses habit_name + entry_date, so this simplifies the model

-- Step 1: Allow NULL values in week_number column
ALTER TABLE weekly_habits ALTER COLUMN week_number DROP NOT NULL;

-- Step 2: Deduplicate existing habits
-- Keep the latest version of each unique habit per user+name+day
CREATE TEMP TABLE habits_deduplicated AS
SELECT DISTINCT ON (user_id, habit_name, day_of_week)
  id, user_id, habit_name, day_of_week, reminder_time, time_of_day, timezone, created_at
FROM weekly_habits
ORDER BY user_id, habit_name, day_of_week, week_number DESC NULLS LAST, created_at DESC;

-- Step 3: Clear existing habits
DELETE FROM weekly_habits;

-- Step 4: Re-insert deduplicated habits with week_number set to NULL
INSERT INTO weekly_habits (id, user_id, habit_name, day_of_week, reminder_time, time_of_day, timezone, created_at, week_number)
SELECT id, user_id, habit_name, day_of_week, reminder_time, time_of_day, timezone, created_at, NULL
FROM habits_deduplicated;

-- Step 5: Drop the temp table
DROP TABLE habits_deduplicated;

-- Step 6: Add unique constraint to prevent future duplicates
-- This ensures each user can only have one habit with a given name on a given day
ALTER TABLE weekly_habits ADD CONSTRAINT unique_user_habit_day
  UNIQUE (user_id, habit_name, day_of_week);
