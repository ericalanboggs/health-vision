-- Add email and last_login_at columns to profiles table for admin dashboard

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Create index for last_login_at
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login_at);
