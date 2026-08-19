# Summit Health

Habit coaching platform: React + Vite frontend, Supabase Edge Functions (Deno) backend,
Postgres with RLS, Stripe subscriptions, Twilio SMS, Resend email, OpenAI (gpt-4o-mini).

## Two sites, two repos

| | Repo | Domain | Stack |
|---|---|---|---|
| **Product app** | `health-vision` (this one) | `go.summithealth.app` | React + Vite SPA |
| **Marketing site** | `summit-web` (sibling dir, [GitHub](https://github.com/ericalanboggs/summit-web)) | `summithealth.app` | Astro, static |

**Framer is retired** (cut over 2026-08-19). The marketing site, blog and all
`/use-cases/*` pages now live in `summit-web`. Anything referring to Framer as the
marketing site is stale. Marketing copy changes go in `summit-web/src/data/*.ts`;
blog posts are markdown in `summit-web/src/content/posts/`.

Two slugs changed in the move — both 308 at the edge, but link to the new ones:

- `/use-cases/lifestyle-changes` → **`/use-cases/warning-signs`**
- `/category/all` → **`/resources`**

## Read these first

- **[`marketing/STRATEGIC_DIRECTION.md`](./marketing/STRATEGIC_DIRECTION.md)** — current
  growth strategy and **build HOLDS** (as of 2026-07-30, review ~2026-09-21). Read before
  proposing or building anything growth-related. It documents what is deliberately **on
  hold** (LinkedIn, paid, new lead-capture surfaces, new landing pages) — don't "helpfully"
  build past a hold. Supersedes the weekly-playbook assumptions in `marketing/growth-strategy.md`
  and the paid/funnel plans below it.
- **[`SUMMIT_HANDOFF.md`](./SUMMIT_HANDOFF.md)** — developer handoff guide. Read before
  any architecture, backend, SMS, challenges, or deployment work.
- **[`SUMMIT_COACH_VOICE.md`](./SUMMIT_COACH_VOICE.md)** — the Summit *coach* voice. Read
  before writing in-product copy where Summit speaks (SMS, system email, AI prompts, challenge content).
- **[`ERIC_VOICE.md`](./ERIC_VOICE.md)** — *Eric's* personal voice. Read before writing
  anything where Eric speaks as himself: ad hooks, marketing copy, landing pages, social
  posts, founder scripts/video, newsletters. Marketing assets live in `marketing/`.

  **Which voice?** Summit-the-product talking to a user → `SUMMIT_COACH_VOICE.md`. Eric-the-founder
  talking to an audience → `ERIC_VOICE.md`. When in doubt for marketing/acquisition work, it's Eric's.

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
