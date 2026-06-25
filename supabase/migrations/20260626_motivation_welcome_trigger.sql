-- Send an immediate welcome SMS when a user enrolls in Motivation Mode
-- (motivation_mode false→true). Separate from the auto-generate-batch trigger so
-- the two concerns stay independent. Fires send-motivation-welcome via service role.

CREATE OR REPLACE FUNCTION send_motivation_welcome_on_enroll()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.motivation_mode = true AND (OLD.motivation_mode IS NULL OR OLD.motivation_mode = false)) THEN
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-motivation-welcome',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
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

DROP TRIGGER IF EXISTS trigger_send_motivation_welcome_on_enroll ON profiles;

CREATE TRIGGER trigger_send_motivation_welcome_on_enroll
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_motivation_welcome_on_enroll();
