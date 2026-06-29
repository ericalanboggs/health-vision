-- Drop the dead send-welcome-email DB triggers (from 20260123_welcome_email_trigger.sql).
--
-- These resolve the function URL/key via current_setting('app.settings.*'), GUCs that
-- are NOT set on this project, so they have never actually fired (current_setting throws,
-- the EXCEPTION WHEN OTHERS swallows it — see SUMMIT_HANDOFF gotcha #6). The founder
-- welcome email is really delivered by the frontend fire-and-forget call in
-- ProfileSetup.jsx (send-welcome-email), which is the live path.
--
-- Removing them is pure cleanup AND removes a latent landmine: if anyone ever sets the
-- app.settings.* GUCs, these dead triggers would spring to life and double-send the
-- welcome email alongside the frontend call.

DROP TRIGGER IF EXISTS trigger_welcome_email_on_profile_complete ON profiles;
DROP TRIGGER IF EXISTS trigger_welcome_email_on_profile_insert ON profiles;
DROP FUNCTION IF EXISTS send_welcome_email_on_profile_complete();
DROP FUNCTION IF EXISTS send_welcome_email_on_profile_insert();
