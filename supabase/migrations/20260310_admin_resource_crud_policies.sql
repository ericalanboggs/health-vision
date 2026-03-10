-- Admin CRUD policies for user_resources
-- (SELECT already covered by "Users can view own and admin resources")

CREATE POLICY "Admin can insert all resources" ON user_resources FOR INSERT
  WITH CHECK (auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com');

CREATE POLICY "Admin can update all resources" ON user_resources FOR UPDATE
  USING (auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com');

CREATE POLICY "Admin can delete all resources" ON user_resources FOR DELETE
  USING (auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com');
