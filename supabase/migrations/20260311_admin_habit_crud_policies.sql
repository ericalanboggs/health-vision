-- Admin CRUD policies for weekly_habits (SELECT + DELETE already exist)

CREATE POLICY "Admin can insert all habits" ON weekly_habits FOR INSERT
  WITH CHECK (auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com');

CREATE POLICY "Admin can update all habits" ON weekly_habits FOR UPDATE
  USING (auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com');
