-- Admin "pause all SMS" for a user, WITHOUT touching consent (sms_opt_in stays true).
-- sms_paused is the intent / UI source of truth. Enforcement piggybacks on the existing
-- admin-hold machinery: the pause action also sets admin_sms_hold_until far in the future,
-- which every automated sender already honors (isAdminHoldActive), so no sender needs a
-- code change. Cleared by the resume-ai action (which nulls both fields).
alter table profiles add column if not exists sms_paused boolean not null default false;

comment on column profiles.sms_paused is
  'Admin has indefinitely paused ALL outbound SMS for this user (consent sms_opt_in untouched). Enforced via a far-future admin_sms_hold_until; this flag is the intent/UI source of truth. Cleared by Resume.';
