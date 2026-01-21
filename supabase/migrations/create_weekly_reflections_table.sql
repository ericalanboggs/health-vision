-- Migration: Create weekly_reflections table
-- Description: Stores user reflections for each week of the pilot

CREATE TABLE IF NOT EXISTS weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  went_well TEXT,
  friction TEXT,
  adjustment TEXT,
  app_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_number)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_user ON weekly_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_week ON weekly_reflections(week_number);

-- Enable Row Level Security
ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reflections"
  ON weekly_reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections"
  ON weekly_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
  ON weekly_reflections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
  ON weekly_reflections FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policy (for coach access)
CREATE POLICY "Admins can view all reflections"
  ON weekly_reflections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
