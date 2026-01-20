-- Rollback Migration: Remove Habit Tracking Tables
-- Description: Removes all habit tracking tables and related changes
-- Use this script to revert the 20260118_add_habit_tracking.sql migration

-- ============================================================================
-- Drop Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS update_habit_tracking_entries_updated_at ON habit_tracking_entries;
DROP TRIGGER IF EXISTS update_habit_tracking_config_updated_at ON habit_tracking_config;

-- ============================================================================
-- Drop Tables (order matters due to potential dependencies)
-- ============================================================================
DROP TABLE IF EXISTS sms_followup_log;
DROP TABLE IF EXISTS habit_tracking_entries;
DROP TABLE IF EXISTS habit_tracking_config;

-- ============================================================================
-- Remove column from profiles (only if it exists)
-- ============================================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS tracking_followup_time;

-- ============================================================================
-- Note: We don't drop the update_updated_at_column() function as it may be
-- used by other tables. If you need to remove it:
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- ============================================================================
