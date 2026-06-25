-- FIX: the onboarding-fork triggers never actually invoked their edge functions.
--
-- They resolved the URL/key via current_setting('app.settings.supabase_url') /
-- ('app.settings.service_role_key'), but those GUCs are NOT set on this project.
-- current_setting() then throws, the EXCEPTION WHEN OTHERS swallows it, and the
-- http_post is never made — so notify-new-signup, generate-motivation-batch, and
-- send-motivation-welcome were silently never called (no pg_net rows, no logs).
--
-- The working pattern (used by every cron via call_edge_function) reads the
-- service-role key from the app_config table and uses the hardcoded project URL.
-- Re-point all three trigger functions at that pattern. Triggers are unchanged
-- (they reference these functions by name); CREATE OR REPLACE updates the bodies.

CREATE OR REPLACE FUNCTION notify_new_signup_on_onboarding_complete()
RETURNS TRIGGER AS $$
DECLARE
  auth_token TEXT;
BEGIN
  IF (NEW.onboarding_completed = true AND (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = false)) THEN
    BEGIN
      SELECT value INTO auth_token FROM app_config WHERE key = 'service_role_key';
      PERFORM net.http_post(
        url := 'https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/notify-new-signup',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || auth_token
        ),
        body := jsonb_build_object('userId', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_new_signup_on_onboarding_complete failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_motivation_batch_on_enroll()
RETURNS TRIGGER AS $$
DECLARE
  auth_token TEXT;
BEGIN
  IF (NEW.motivation_mode = true AND (OLD.motivation_mode IS NULL OR OLD.motivation_mode = false)) THEN
    BEGIN
      SELECT value INTO auth_token FROM app_config WHERE key = 'service_role_key';
      PERFORM net.http_post(
        url := 'https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/generate-motivation-batch',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || auth_token
        ),
        body := jsonb_build_object('userId', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'generate_motivation_batch_on_enroll failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION send_motivation_welcome_on_enroll()
RETURNS TRIGGER AS $$
DECLARE
  auth_token TEXT;
BEGIN
  IF (NEW.motivation_mode = true AND (OLD.motivation_mode IS NULL OR OLD.motivation_mode = false)) THEN
    BEGIN
      SELECT value INTO auth_token FROM app_config WHERE key = 'service_role_key';
      PERFORM net.http_post(
        url := 'https://oxszevplpzmzmeibjtdz.supabase.co/functions/v1/send-motivation-welcome',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || auth_token
        ),
        body := jsonb_build_object('userId', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'send_motivation_welcome_on_enroll failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
