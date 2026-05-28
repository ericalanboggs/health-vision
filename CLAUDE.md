# Summit Health

Habit coaching platform: React + Vite frontend, Supabase Edge Functions (Deno) backend,
Postgres with RLS, Stripe subscriptions, Twilio SMS, Resend email, OpenAI (gpt-4o-mini).

## Read these first

- **[`SUMMIT_HANDOFF.md`](./SUMMIT_HANDOFF.md)** — developer handoff guide. Read before
  any architecture, backend, SMS, challenges, or deployment work.
- **[`SUMMIT_COACH_VOICE.md`](./SUMMIT_COACH_VOICE.md)** — voice and tone guide. Read
  before writing or editing any user-facing copy (SMS, email, AI prompts, challenge content).

## Non-negotiable rules

- **Frontend uses the `@summit/design-system` workspace by default** — its components and
  color tokens (`summit-forest`, `summit-emerald`, `summit-sage`, `summit-mint`,
  `summit-lime`, `summit-moss`). Don't introduce ad-hoc colors or raw one-off styled
  elements unless explicitly asked.
- **Deploy internal-only edge functions with `--no-verify-jwt`.** Any redeploy strips the
  flag — always re-include it. See the deployment section of the handoff for the full list.
- **Migration files need unique `YYYYMMDD` prefixes** — duplicate dates break `supabase db push`.
- **Always filter `.is('archived_at', null)`** when querying `weekly_habits` for active
  habits (reminders, tracking, followups, AI context).
- **Never filter timestamps at midnight UTC** — convert the user's local midnight to UTC first.

The handoff documents the full set of gotchas; the above are the ones easiest to violate by accident.
