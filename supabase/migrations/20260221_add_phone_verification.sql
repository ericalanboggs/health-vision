-- Migration: Add phone verification support
-- Description: Adds phone_verified flag to profiles and creates phone_verifications table

-- Add phone_verified flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

-- Create phone_verifications table for storing verification codes
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user ON phone_verifications(user_id);

-- Index for rate limiting checks by phone
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone, created_at);

-- Index for cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);

-- Enable Row Level Security
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own verification records
CREATE POLICY "Users can read own phone verifications"
  ON phone_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all records (edge functions use service role)
CREATE POLICY "Service role can manage all phone verifications"
  ON phone_verifications FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE phone_verifications IS 'Stores phone verification codes with 10-minute expiry. Used during onboarding to confirm phone ownership.';
