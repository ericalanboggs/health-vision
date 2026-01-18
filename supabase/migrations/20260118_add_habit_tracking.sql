-- Migration: Add Habit Tracking Tables
-- Description: Adds tables for optional detailed habit tracking (boolean/metric)
-- Created: 2026-01-18

-- ============================================================================
-- Table: habit_tracking_config
-- Stores configuration for each unique habit name per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS habit_tracking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_enabled BOOLEAN DEFAULT false,
  tracking_type TEXT CHECK (tracking_type IN ('boolean', 'metric')),
  metric_unit TEXT,
  metric_target NUMERIC,
  ai_suggested_unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, habit_name)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_habit_tracking_config_user ON habit_tracking_config(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_tracking_config_habit ON habit_tracking_config(habit_name);

-- Enable Row Level Security
ALTER TABLE habit_tracking_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_tracking_config
CREATE POLICY "Users can view their own tracking config"
  ON habit_tracking_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracking config"
  ON habit_tracking_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking config"
  ON habit_tracking_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking config"
  ON habit_tracking_config FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tracking config"
  ON habit_tracking_config FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Table: habit_tracking_entries
-- Stores individual tracking entries (one per habit per day)
-- ============================================================================
CREATE TABLE IF NOT EXISTS habit_tracking_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  completed BOOLEAN,
  metric_value NUMERIC,
  entry_source TEXT CHECK (entry_source IN ('app', 'sms')) DEFAULT 'app',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, habit_name, entry_date),
  CHECK (entry_date >= '2026-01-12'),
  CHECK (
    (completed IS NOT NULL AND metric_value IS NULL) OR
    (completed IS NULL AND metric_value IS NOT NULL) OR
    (completed IS NULL AND metric_value IS NULL)
  )
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_habit_tracking_entries_user ON habit_tracking_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_tracking_entries_date ON habit_tracking_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_habit_tracking_entries_lookup ON habit_tracking_entries(user_id, habit_name, entry_date);

-- Enable Row Level Security
ALTER TABLE habit_tracking_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_tracking_entries
CREATE POLICY "Users can view their own tracking entries"
  ON habit_tracking_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracking entries"
  ON habit_tracking_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking entries"
  ON habit_tracking_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking entries"
  ON habit_tracking_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tracking entries"
  ON habit_tracking_entries FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Table: sms_followup_log
-- Tracks follow-up SMS messages sent for habit tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_followup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_name TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  message_sent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_followup_log_user_sent ON sms_followup_log(user_id, sent_at DESC);

-- Enable Row Level Security
ALTER TABLE sms_followup_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_followup_log
CREATE POLICY "Users can view their own followup logs"
  ON sms_followup_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all followup logs"
  ON sms_followup_log FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Alter profiles table to add tracking_followup_time
-- ============================================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tracking_followup_time TIME DEFAULT '17:00:00';

-- ============================================================================
-- Function to auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_habit_tracking_config_updated_at
  BEFORE UPDATE ON habit_tracking_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_tracking_entries_updated_at
  BEFORE UPDATE ON habit_tracking_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
