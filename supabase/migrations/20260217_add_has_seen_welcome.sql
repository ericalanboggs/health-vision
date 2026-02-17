ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE;

-- Backfill all existing users so they don't see it again
UPDATE profiles SET has_seen_welcome = true
WHERE profile_completed = true;
