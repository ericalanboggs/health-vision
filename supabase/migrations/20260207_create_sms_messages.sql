-- Migration: Create sms_messages table for 2-way SMS tracking
-- This table stores both inbound (user → Summit) and outbound (Summit → user) messages

-- Create the sms_messages table
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Direction: 'inbound' (user → Summit) or 'outbound' (Summit → user)
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- User association (can be NULL if we can't match phone to user)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,  -- User's phone number (E.164 format)
  user_name TEXT,       -- Cached for display

  -- Message content
  body TEXT NOT NULL,

  -- For outbound: who sent it (admin user ID, or NULL for system/automated)
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_by_type TEXT CHECK (sent_by_type IN ('admin', 'system', NULL)),

  -- Twilio metadata
  twilio_sid TEXT,
  twilio_status TEXT,  -- 'queued', 'sent', 'delivered', 'failed', 'received'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For failed messages
  error_message TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_phone ON sms_messages(phone);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction ON sms_messages(direction);

-- Composite index for conversation view (user's messages sorted by time)
CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation ON sms_messages(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin can read all messages
CREATE POLICY "Admin can read all sms_messages"
  ON sms_messages FOR SELECT
  USING (auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com');

-- Admin can insert messages (for sending)
CREATE POLICY "Admin can insert sms_messages"
  ON sms_messages FOR INSERT
  WITH CHECK (auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com');

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access to sms_messages"
  ON sms_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users can read their own messages (for potential future user-facing conversation view)
CREATE POLICY "Users can read own sms_messages"
  ON sms_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON sms_messages TO authenticated;
GRANT ALL ON sms_messages TO service_role;
