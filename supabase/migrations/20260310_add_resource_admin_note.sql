-- Add admin_note column to user_resources for coach's notes
ALTER TABLE user_resources ADD COLUMN IF NOT EXISTS admin_note TEXT;
