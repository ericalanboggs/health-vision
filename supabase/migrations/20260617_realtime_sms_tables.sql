-- Enable Supabase Realtime for the admin SMS conversation view.
--
-- ConversationView.jsx subscribes to postgres_changes on sms_messages and
-- sms_reminders, but Realtime only broadcasts changes for tables that belong
-- to the supabase_realtime publication. Without this, the admin conversation
-- only updates on a manual page refresh.
--
-- REPLICA IDENTITY FULL ensures UPDATE/DELETE events carry full row data so
-- the user_id filter resolves correctly (e.g. Twilio delivery-status updates).

ALTER TABLE public.sms_messages REPLICA IDENTITY FULL;
ALTER TABLE public.sms_reminders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'sms_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'sms_reminders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_reminders;
  END IF;
END $$;
