# TODOS

## Testing infrastructure

### Stand up a Deno edge-function test harness
- **What:** Add a test setup for the Supabase edge functions (`supabase/functions/*`). The repo
  currently only tests the frontend (`src/` via vitest); the Deno edge functions have no harness.
- **Why:** Several functions have eligibility/branching logic (who gets an SMS, session state machines,
  timezone math) that is currently only verifiable by reading or by manual DB checks. A harness lets us
  write real regression tests.
- **Deferred from:** Motivation Mode build (2026-06-15). The Motivation Mode `motivation_mode=false`
  guards on the 7 action-stage senders (`send-sms-reminders`, `habit-sms-followup`,
  `send-reflection-reminders`, `send-all-weekly-digests`, `generate-all-weekly-digests`,
  `send-weekly-synthesis-sms`, `send-welcome-tour-sms`) were verified by code review + a manual DB
  check instead of automated tests, because no harness exists yet.
- **Where to start:** Deno's built-in test runner (`deno test`) with a mocked Supabase client, or a
  thin integration layer against a local Supabase. First targets: the 7 sender guards above + the new
  `sms-motivation-checkin` state machine.
- **Depends on:** nothing. Standalone.
