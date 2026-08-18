-- Let the coach app (signed in as eric@summithealth.app) read the tables behind
-- the user profile sheet. The base admin SELECT policies on these were gmail-only
-- (add_admin_policies.sql); RLS policies are permissive/OR, so these ADDITIVE
-- two-email policies grant summithealth.app access without touching the originals.
-- Matches the app-layer isAdmin() allowlist and the SMS/media policies.
--
-- Idempotent: drop-if-exists before create so a re-run (e.g. after a partially
-- applied push) doesn't fail with "policy already exists" (SQLSTATE 42710).

drop policy if exists "Coach app admin read profiles" on profiles;
create policy "Coach app admin read profiles"
  on profiles for select to authenticated
  using (auth.jwt()->>'email' in ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

drop policy if exists "Coach app admin read health_journeys" on health_journeys;
create policy "Coach app admin read health_journeys"
  on health_journeys for select to authenticated
  using (auth.jwt()->>'email' in ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

drop policy if exists "Coach app admin read weekly_habits" on weekly_habits;
create policy "Coach app admin read weekly_habits"
  on weekly_habits for select to authenticated
  using (auth.jwt()->>'email' in ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

drop policy if exists "Coach app admin read weekly_reflections" on weekly_reflections;
create policy "Coach app admin read weekly_reflections"
  on weekly_reflections for select to authenticated
  using (auth.jwt()->>'email' in ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));

drop policy if exists "Coach app admin read habit_tracking_entries" on habit_tracking_entries;
create policy "Coach app admin read habit_tracking_entries"
  on habit_tracking_entries for select to authenticated
  using (auth.jwt()->>'email' in ('eric.alan.boggs@gmail.com', 'eric@summithealth.app'));
