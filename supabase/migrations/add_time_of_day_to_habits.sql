-- Add time_of_day column to weekly_habits table for SMS reminders
ALTER TABLE weekly_habits
ADD COLUMN IF NOT EXISTS time_of_day TEXT;

-- Add index for faster queries by time
CREATE INDEX IF NOT EXISTS idx_weekly_habits_time_of_day ON weekly_habits(time_of_day);
