-- Durable, evolving content-preference note for Motivation Mode.
--
-- Previously, a user's mid-week reply ("send half-marathon-specific guidance, not 101")
-- was stored on motivation_content_queue.feedback — a column generation never reads — so
-- the ask was captured but never acted on. This column is the single source of truth for
-- "what the user wants from their content", written by both mid-week feedback and the
-- weekly check-in (merged, so successive asks accumulate), and read by
-- generate-motivation-batch as high-priority steering alongside the steering prompt.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS motivation_pref TEXT;
