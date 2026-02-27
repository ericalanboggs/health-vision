-- Track challenge enrollments
CREATE TABLE challenge_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  current_week INT NOT NULL DEFAULT 1 CHECK (current_week BETWEEN 1 AND 4),
  survey_scores JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_slug, started_at)
);

-- Track which focus area habits were added per week
CREATE TABLE challenge_habit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  focus_area_slug TEXT NOT NULL,
  habit_name TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tag challenge habits in existing tables
ALTER TABLE weekly_habits
  ADD COLUMN challenge_slug TEXT DEFAULT NULL;

ALTER TABLE habit_tracking_config
  ADD COLUMN challenge_slug TEXT DEFAULT NULL;

-- RLS policies
ALTER TABLE challenge_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_habit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own enrollments"
  ON challenge_enrollments FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access enrollments"
  ON challenge_enrollments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can manage own challenge habit logs"
  ON challenge_habit_log FOR ALL
  USING (
    enrollment_id IN (
      SELECT id FROM challenge_enrollments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access challenge habit log"
  ON challenge_habit_log FOR ALL
  USING (auth.role() = 'service_role');
