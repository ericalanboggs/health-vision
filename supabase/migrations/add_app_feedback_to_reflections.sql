-- Add app_feedback column to weekly_reflections table
ALTER TABLE weekly_reflections
ADD COLUMN IF NOT EXISTS app_feedback TEXT;
