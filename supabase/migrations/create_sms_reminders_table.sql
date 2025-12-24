-- Create table to track sent SMS reminders
CREATE TABLE IF NOT EXISTS sms_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES weekly_habits(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_reminders_user_id ON sms_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_habit_id ON sms_reminders(habit_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_scheduled_for ON sms_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_status ON sms_reminders(status);

-- Enable Row Level Security
ALTER TABLE sms_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to view their own reminders
CREATE POLICY "Users can view their own reminders"
  ON sms_reminders FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update reminders (for Edge Function)
CREATE POLICY "Service role can manage all reminders"
  ON sms_reminders FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
