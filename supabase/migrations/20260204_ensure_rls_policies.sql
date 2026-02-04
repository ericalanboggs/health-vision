-- Migration: Ensure RLS policies exist on core tables
-- Description: Verifies RLS is enabled and adds policies for health_journeys, weekly_habits tables
-- Created: 2026-02-04

-- ============================================================================
-- Enable RLS on health_journeys (if not already enabled)
-- ============================================================================
ALTER TABLE IF EXISTS health_journeys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own journeys" ON health_journeys;
DROP POLICY IF EXISTS "Users can insert their own journeys" ON health_journeys;
DROP POLICY IF EXISTS "Users can update their own journeys" ON health_journeys;
DROP POLICY IF EXISTS "Users can delete their own journeys" ON health_journeys;
DROP POLICY IF EXISTS "Service role can manage all journeys" ON health_journeys;

-- RLS Policies for health_journeys
CREATE POLICY "Users can view their own journeys"
  ON health_journeys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journeys"
  ON health_journeys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journeys"
  ON health_journeys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journeys"
  ON health_journeys FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all journeys"
  ON health_journeys FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Enable RLS on weekly_habits (if not already enabled)
-- ============================================================================
ALTER TABLE IF EXISTS weekly_habits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own habits" ON weekly_habits;
DROP POLICY IF EXISTS "Users can insert their own habits" ON weekly_habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON weekly_habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON weekly_habits;
DROP POLICY IF EXISTS "Service role can manage all habits" ON weekly_habits;

-- RLS Policies for weekly_habits
CREATE POLICY "Users can view their own habits"
  ON weekly_habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON weekly_habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON weekly_habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON weekly_habits FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all habits"
  ON weekly_habits FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
