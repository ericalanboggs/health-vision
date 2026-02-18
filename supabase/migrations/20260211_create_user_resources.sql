-- Create user_resources table for persistent content library
CREATE TABLE IF NOT EXISTS user_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  source TEXT,
  resource_type TEXT DEFAULT 'link',
  topic TEXT,
  duration_minutes INTEGER,
  thumbnail_url TEXT,
  origin TEXT NOT NULL DEFAULT 'digest',
  week_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_resources_user ON user_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resources_topic ON user_resources(user_id, topic);

ALTER TABLE user_resources ENABLE ROW LEVEL SECURITY;

-- Users see their own + admin-added resources
DO $$ BEGIN
  CREATE POLICY "Users can view own and admin resources" ON user_resources
    FOR SELECT USING (auth.uid() = user_id OR origin = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own resources" ON user_resources
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own resources" ON user_resources
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access" ON user_resources
    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill user_resources from existing weekly_digests recommendations
INSERT INTO user_resources (user_id, title, url, description, source, resource_type, topic, duration_minutes, thumbnail_url, origin, week_number)
SELECT
  wd.user_id,
  rec->>'title',
  rec->>'url',
  rec->>'brief_description',
  rec->>'source',
  rec->>'type',
  NULL,
  (rec->>'duration_minutes')::integer,
  rec->>'thumbnail_url',
  'digest',
  wd.week_number
FROM weekly_digests wd,
     jsonb_array_elements(wd.recommendations) AS rec
WHERE wd.status = 'sent'
  AND wd.recommendations IS NOT NULL
ON CONFLICT DO NOTHING;
