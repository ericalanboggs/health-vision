-- Create table to track sent email reminders
CREATE TABLE IF NOT EXISTS email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'habit_setup', -- 'habit_setup', 'weekly_digest', etc.
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  resend_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_email_reminders_user_id ON email_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_email_type ON email_reminders(email_type);
CREATE INDEX IF NOT EXISTS idx_email_reminders_sent_at ON email_reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_reminders_status ON email_reminders(status);

-- Enable Row Level Security
ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to view their own email reminders
CREATE POLICY "Users can view their own email reminders"
  ON email_reminders FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all email reminders (for Edge Function)
CREATE POLICY "Service role can manage all email reminders"
  ON email_reminders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
