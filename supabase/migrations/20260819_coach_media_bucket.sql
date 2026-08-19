-- Storage bucket for coach-sent media (MMS attachments).
--
-- The bucket is PRIVATE: the iOS app uploads a downscaled image, then creates a
-- short-lived signed URL that Twilio fetches within seconds at send time. Nothing
-- is publicly enumerable. Bucket-level guards cap size and restrict to images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coach-media',
  'coach-media',
  false,
  5242880,  -- 5 MB (Twilio MMS hard cap)
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Admin (coach) can upload, read (needed to sign), and delete their media.
-- Two-email allowlist, matching the SMS-table policies.
drop policy if exists "Admin upload coach-media" on storage.objects;
create policy "Admin upload coach-media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'coach-media'
    and auth.jwt()->>'email' in ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  );

drop policy if exists "Admin read coach-media" on storage.objects;
create policy "Admin read coach-media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'coach-media'
    and auth.jwt()->>'email' in ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  );

drop policy if exists "Admin delete coach-media" on storage.objects;
create policy "Admin delete coach-media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'coach-media'
    and auth.jwt()->>'email' in ('eric.alan.boggs@gmail.com', 'eric@summithealth.app')
  );

-- OPTIONAL housekeeping (run separately if pg_cron is enabled): purge media older
-- than 7 days. The recipient already has their copy; ours is only a send-time stage.
--
--   select cron.schedule(
--     'purge-coach-media', '0 3 * * *',
--     $$ delete from storage.objects
--        where bucket_id = 'coach-media' and created_at < now() - interval '7 days' $$
--   );
