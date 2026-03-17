-- Admin can read all tracking configs (needed for admin user detail page)
DROP POLICY IF EXISTS "Admin can view all tracking config" ON habit_tracking_config;
CREATE POLICY "Admin can view all tracking config"
  ON habit_tracking_config FOR SELECT
  USING (
    auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  );

-- Admin can insert/update all tracking configs (needed for admin habit editing)
DROP POLICY IF EXISTS "Admin can manage all tracking config" ON habit_tracking_config;
CREATE POLICY "Admin can manage all tracking config"
  ON habit_tracking_config FOR ALL
  USING (
    auth.jwt()->>'email' IN ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  );
