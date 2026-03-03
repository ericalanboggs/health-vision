-- Add deleted_at column to profiles for soft-delete support
-- Referenced by send-sms-reminders and habit-sms-followup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
