-- Persist a reference to media attached to an outbound message so the coach app
-- can re-render sent photos in the thread. We store the STORAGE PATH (e.g.
-- "uuid.jpg" in the coach-media bucket), not the ephemeral signed URL — the app
-- mints a fresh signed URL on demand when displaying.
alter table sms_messages add column if not exists media_url text;
