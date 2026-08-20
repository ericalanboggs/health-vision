-- Phase 4 — APNs device tokens for the Summit Coach iOS app.
--
-- Apply in the health-vision backend (dashboard SQL editor, or copy into
-- health-vision/supabase/migrations/ and `supabase db push`). ADDITIVE — no
-- existing behavior changes.
--
-- The coach app upserts its APNs token here after sign-in. `notify-coach-inbound`
-- reads every row and pushes to each device on a new inbound SMS.

create table if not exists public.admin_push_tokens (
  token       text primary key,          -- APNs device token (hex), dedup key
  platform    text not null default 'ios',
  user_email  text,                       -- optional: which admin registered it
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.admin_push_tokens enable row level security;

-- Only the two coach admin emails may read/write tokens — mirrors the
-- sms_messages allowlist (COACH_ADMIN_APP.md §2.6). `auth.jwt() ->> 'email'`
-- is the signed-in identity presented by the app's bearer token.
drop policy if exists "coach admin manages push tokens" on public.admin_push_tokens;
create policy "coach admin manages push tokens"
  on public.admin_push_tokens
  for all
  using (
    (auth.jwt() ->> 'email') in ('eric@summithealth.app', 'eric.alan.boggs@gmail.com')
  )
  with check (
    (auth.jwt() ->> 'email') in ('eric@summithealth.app', 'eric.alan.boggs@gmail.com')
  );

-- ---------------------------------------------------------------------------
-- OPTIONAL trigger path (self-contained). If you'd rather NOT edit twilio-webhook,
-- fire the edge function straight from an inbound insert via pg_net. Requires the
-- `pg_net` extension. Prefer storing the service-role key in Vault over inlining.
--
-- Recommended alternative: extend `twilio-webhook` to call notify-coach-inbound
-- right after it inserts the inbound row (one fetch, no trigger, no key in SQL).
-- ---------------------------------------------------------------------------
--
-- create extension if not exists pg_net;
--
-- create or replace function public.notify_coach_on_inbound()
-- returns trigger language plpgsql security definer as $$
-- begin
--   if NEW.direction = 'inbound' then
--     perform net.http_post(
--       url     := 'https://oxszevplpzmzmeibjtdz.functions.supabase.co/notify-coach-inbound',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
--       ),
--       body    := jsonb_build_object('message_id', NEW.id)
--     );
--   end if;
--   return NEW;
-- end;
-- $$;
--
-- drop trigger if exists trg_notify_coach_on_inbound on public.sms_messages;
-- create trigger trg_notify_coach_on_inbound
--   after insert on public.sms_messages
--   for each row execute function public.notify_coach_on_inbound();
