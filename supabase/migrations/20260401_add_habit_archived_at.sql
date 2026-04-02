-- Add archived_at column to weekly_habits for soft-archive ("shelved") support.
-- NULL = active habit, timestamp = archived/shelved.
ALTER TABLE weekly_habits
  ADD COLUMN archived_at timestamptz DEFAULT NULL;

-- Index for efficient filtering of active habits
CREATE INDEX idx_weekly_habits_archived_at ON weekly_habits (archived_at)
  WHERE archived_at IS NULL;
