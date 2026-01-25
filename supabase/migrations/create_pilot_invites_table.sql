-- Create pilot_invites table for storing invited emails
CREATE TABLE IF NOT EXISTS pilot_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by TEXT,
  email_sent_at TIMESTAMPTZ,
  resend_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_pilot_invites_email ON pilot_invites(email);

-- Enable RLS
ALTER TABLE pilot_invites ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role has full access to pilot_invites"
  ON pilot_invites
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow authenticated admins to read/write
CREATE POLICY "Admins can manage pilot_invites"
  ON pilot_invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'eric.alan.boggs@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'eric.alan.boggs@gmail.com'
    )
  );
