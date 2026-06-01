-- Acquisition attribution: which marketing landing page / campaign a user came
-- in from (e.g. 'burnout', 'postpartum', 'mens-health'). Captured from the
-- inbound Framer link's ?source= / utm_* params and written at profile creation.
-- Used to tailor onboarding. Mirrors the simple single-column shape of
-- challenge_type.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS acquisition_source TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_acquisition_source ON profiles(acquisition_source);
