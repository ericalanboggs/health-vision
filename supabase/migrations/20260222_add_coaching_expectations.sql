-- Add coaching expectations acceptance timestamp to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coaching_expectations_accepted_at TIMESTAMPTZ DEFAULT NULL;
