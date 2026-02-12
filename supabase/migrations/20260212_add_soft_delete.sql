-- Add soft-delete support to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of active users
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles (deleted_at);
