-- Trigger to send welcome email when a user completes their profile
-- This uses Supabase's pg_net extension to call the edge function

-- Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION send_welcome_email_on_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when profile_completed changes from false/null to true
  IF (NEW.profile_completed = true AND (OLD.profile_completed IS NULL OR OLD.profile_completed = false)) THEN
    -- Call the edge function via pg_net
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('userId', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the profiles table
DROP TRIGGER IF EXISTS trigger_welcome_email_on_profile_complete ON profiles;

CREATE TRIGGER trigger_welcome_email_on_profile_complete
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_on_profile_complete();

-- Also trigger on INSERT if profile is created with profile_completed = true
CREATE OR REPLACE FUNCTION send_welcome_email_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.profile_completed = true) THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('userId', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_welcome_email_on_profile_insert ON profiles;

CREATE TRIGGER trigger_welcome_email_on_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_on_profile_insert();

-- Note: You may need to configure the app settings if not already done:
-- ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://oxszevplpzmzmeibjtdz.supabase.co';
-- ALTER DATABASE postgres SET "app.settings.service_role_key" = 'your-service-role-key';
