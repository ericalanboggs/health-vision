-- Localization Phase 0 (Workstream A1): per-user language preference.
-- Drives the language of the AI coaching loop + localized static strings. Defaults to 'en'
-- so every existing user is unaffected. Mirrors the single-column shape of acquisition_source.
-- Values constrained to the supported set (en / es / pt-BR).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_language_chk;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_preferred_language_chk
  CHECK (preferred_language IN ('en', 'es', 'pt-BR'));
