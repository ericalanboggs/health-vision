-- Admin can view all lite challenge enrollments
CREATE POLICY "Admin can view all lite enrollments"
  ON lite_challenge_enrollments FOR SELECT
  USING (
    auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'
  );
