-- Add admin policies for eric.alan.boggs@gmail.com to read all user data

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can view all health journeys
CREATE POLICY "Admin can view all journeys"
  ON health_journeys FOR SELECT
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can view all weekly habits
CREATE POLICY "Admin can view all habits"
  ON weekly_habits FOR SELECT
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );

-- Admin can view all weekly reflections
CREATE POLICY "Admin can view all reflections"
  ON weekly_reflections FOR SELECT
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );
