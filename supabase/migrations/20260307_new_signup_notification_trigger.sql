-- Trigger to send admin notification email when a new user completes their profile
-- Mirrors the welcome email trigger pattern in 20260123_welcome_email_trigger.sql

-- AFTER UPDATE trigger: fires when profile_completed changes from false/null to true
CREATE OR REPLACE FUNCTION notify_new_signup_on_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.profile_completed = true AND (OLD.profile_completed IS NULL OR OLD.profile_completed = false)) THEN
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-new-signup',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object('userId', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_new_signup_on_profile_complete failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_signup_on_profile_complete ON profiles;

CREATE TRIGGER trigger_notify_new_signup_on_profile_complete
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_signup_on_profile_complete();

-- AFTER INSERT trigger: fires when profile is created with profile_completed = true
CREATE OR REPLACE FUNCTION notify_new_signup_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.profile_completed = true) THEN
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-new-signup',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object('userId', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_new_signup_on_profile_insert failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_signup_on_profile_insert ON profiles;

CREATE TRIGGER trigger_notify_new_signup_on_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_signup_on_profile_insert();
