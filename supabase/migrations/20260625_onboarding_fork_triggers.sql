-- Onboarding fork (Motivation Mode vs Habit Mode) — backend triggers.
--
-- (1) Move the admin "new signup" notification from profile_completed to
--     onboarding_completed. It used to fire at profile setup (name/phone), before
--     the user had set any vision/habits OR chosen a mode — so the email was empty
--     and couldn't say which track they picked. Firing on onboarding completion
--     gives one fully-populated, mode-aware email (notify-new-signup reads
--     motivation_mode to render the right template).
--
-- (2) Auto-generate a Motivation Mode content batch when a user self-enrolls
--     (motivation_mode flips false→true). The frontend only flips the flag; this
--     trigger calls generate-motivation-batch server-side with the service role,
--     since that function rejects non-admin client calls. The first batch lands
--     'pending_review' (hybrid approval — admin approves batch #1).

-- ── (1) Notification now fires on onboarding completion ──────────────────────

-- Retire the old profile_completed-based notification triggers + functions.
DROP TRIGGER IF EXISTS trigger_notify_new_signup_on_profile_complete ON profiles;
DROP TRIGGER IF EXISTS trigger_notify_new_signup_on_profile_insert ON profiles;
DROP FUNCTION IF EXISTS notify_new_signup_on_profile_complete();
DROP FUNCTION IF EXISTS notify_new_signup_on_profile_insert();

CREATE OR REPLACE FUNCTION notify_new_signup_on_onboarding_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.onboarding_completed = true AND (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = false)) THEN
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
      RAISE WARNING 'notify_new_signup_on_onboarding_complete failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_signup_on_onboarding_complete ON profiles;

CREATE TRIGGER trigger_notify_new_signup_on_onboarding_complete
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_signup_on_onboarding_complete();

-- ── (2) Auto-generate a content batch when a user enrolls in Motivation Mode ──

CREATE OR REPLACE FUNCTION generate_motivation_batch_on_enroll()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.motivation_mode = true AND (OLD.motivation_mode IS NULL OR OLD.motivation_mode = false)) THEN
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-motivation-batch',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
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

DROP TRIGGER IF EXISTS trigger_generate_motivation_batch_on_enroll ON profiles;

CREATE TRIGGER trigger_generate_motivation_batch_on_enroll
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_motivation_batch_on_enroll();
