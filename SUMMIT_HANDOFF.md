# Summit Health — Developer Handoff Guide

> Living document. Last updated: 2026-04-02.

---

## 1. System Overview

**Summit Health** is a habit coaching platform with SMS-based tracking, AI-powered responses, Stripe subscriptions, and structured multi-week challenges.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Design System | `@summit/design-system` (monorepo workspace, Tailwind + CVA, Storybook) |
| Backend | Supabase Edge Functions (Deno runtime) |
| Database | PostgreSQL (Supabase-hosted), RLS on all tables |
| Auth | Supabase Auth (magic links, OAuth, password) with PKCE flow |
| Payments | Stripe (subscriptions + one-time payments) |
| SMS | Twilio (two accounts: main Summit + lite challenge) |
| Email | Resend (transactional + drip) |
| AI | OpenAI gpt-4o-mini (habit tracking parsing, coaching) |
| Analytics | PostHog (events, session recording) |
| Hosting | Vercel (auto-deploy on push to `main`) |

### Repository Structure
```
health-vision/
├── src/                          # React frontend
│   ├── pages/                    # Route components
│   ├── services/                 # Data layer (Supabase queries)
│   ├── components/               # Shared UI components
│   │   ├── admin/                # Admin dashboard components
│   │   └── steps/                # Onboarding journey steps
│   ├── data/                     # Hardcoded config (challengeConfig.js)
│   └── lib/                      # Supabase client, PostHog
├── design-system/                # @summit/design-system workspace
│   ├── components/               # Button, Card, Modal, Input, etc.
│   └── tokens/                   # Tailwind preset, design tokens
├── supabase/
│   ├── functions/                # Edge functions (Deno)
│   │   ├── _shared/              # Shared utilities (sms.ts, resend.ts)
│   │   └── [function-name]/      # One directory per function
│   └── migrations/               # SQL migrations (YYYYMMDD_name.sql)
└── vercel.json                   # SPA rewrites, domain redirects
```

---

## 2. Frontend Architecture

### Design System (`@summit/design-system`)

**All frontend work must use the design system by default.** The `design-system/` workspace provides shared components (Button, Card, Modal, Input, Toggle, Select, etc.), color tokens, and a Tailwind preset. When building or modifying UI:

1. **Use design system components** before reaching for raw HTML or one-off styled elements.
2. **Use design system color tokens** (`summit-forest`, `summit-emerald`, `summit-sage`, `summit-mint`, `summit-lime`, `summit-moss`) — never introduce ad-hoc colors (e.g., amber, orange, blue) unless explicitly requested.
3. **Use design system typography** (`text-h1`, `text-h2`, `text-h3`, `text-body`, `text-bodySmall`, `text-meta`) for consistent sizing and weight.
4. **If a needed component or token doesn't exist**, propose an addition or improvement to the design system rather than hardcoding a one-off solution.

Key files:
- `design-system/tokens/tailwind.preset.js` — Tailwind preset with all tokens
- `design-system/components/` — Shared React components
- Components are imported via `@summit/design-system` (workspace alias)

### Route Map (`src/App.jsx`)

**Public:**
- `/login` — Login page
- `/tech-neck` — Lite challenge landing page (signup form)
- `/privacy`, `/terms`, `/sms-consent` — Legal pages

**Auth Flow:**
- `/auth/callback` — OAuth/magic link callback
- `/profile-setup` — First-time profile setup
- `/verify-phone` — Phone OTP verification
- `/start` — Onboarding start
- `/vision` — Health vision builder

**Protected (require auth):**
- `/dashboard` — Main dashboard
- `/habits`, `/add-habit`, `/schedule-habits` — Habit management
- `/reflection` — Weekly reflection
- `/coaching` — Coaching page
- `/guides` — Resource library
- `/challenges`, `/challenges/:slug`, `/challenges/:slug/add-habit` — Challenge system
- `/tech-neck/status`, `/tech-neck/success` — Lite challenge status

**Subscription:**
- `/pricing` — Pricing page (subscription gate)
- `/subscription/success` — Post-checkout confirmation

**Admin:**
- `/admin` — User management dashboard
- `/admin/users/:userId` — User detail view

### Home.jsx Redirect Decision Tree

When a user hits `/`, `Home.jsx` determines where to send them:

```
1. Account soft-deleted?        → /welcome-back
2. Profile not completed?       → /profile-setup
3. Phone not verified + SMS on? → /verify-phone
4. challenge_type === 'lite'?   → /tech-neck/status
5. Onboarding not completed?    → /start
6. No active subscription?      → /pricing
7. Has subscription             → /dashboard
```

### Service Layer Pattern

All services in `src/services/` follow a consistent pattern:
```javascript
export const doSomething = async (params) => {
  try {
    const { data, error } = await supabase.from('table').select('*')
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**Key services:**
| Service | Purpose |
|---------|---------|
| `authService.js` | Auth, profile CRUD, soft delete |
| `habitService.js` | Habit CRUD + archive/unarchive (weekly_habits table) |
| `trackingService.js` | Tracking config + daily entries |
| `subscriptionService.js` | Stripe checkout, portal, subscription checks |
| `challengeService.js` | Challenge enrollment, week advancement, auto-completion, celebration |
| `reflectionService.js` | Weekly reflections |
| `adminService.js` | Admin operations (900+ lines) |
| `journeyService.js` | Health vision/journey (onboarding) |
| `resourceService.js` | User resource library |

### Auth Configuration

**`src/lib/supabase.js`** uses `flowType: 'pkce'`. This means:
- Server-generated magic links (`generateLink()`) **do not work** — the client has no `code_verifier` to exchange the auth code
- All auth flows must be client-initiated (sign in with password, OAuth, or client-side magic link)
- The lite challenge uses auto-confirm + `signInWithPassword` to work around this

---

## 3. Edge Functions Reference

### Shared Utilities (`supabase/functions/_shared/`)

**`sms.ts`** — Twilio SMS with exponential backoff retry (1s, 2s, 4s on 429)
- `sendSMS(payload, logOptions?)` — returns `{ success, sid?, error? }`
- Supports `accountSid`, `authToken`, `from` overrides for multi-account Twilio
- Optional logging to `sms_messages` or `sms_reminders` table

**`user_context.ts`** — Shared user context loader for AI calls
- `loadUserContext(supabase, userId, timezone?)` — parallel-loads profile, vision, habits + completion rates, challenge, reflections, SMS history
- `formatContextForPrompt(ctx)` — formats as a prompt-ready string for injection into AI system prompts
- Used by `habit-sms-response` and `sms-reflection-response` to give AI full user background

**`resend.ts`** — Resend email with retry
- `sendEmail({ to, subject, html })` — single email
- `sendEmailBatch(emails)` — batch up to 100
- `sendEmailsInBatches(emails)` — handles large lists with delays

### Function Reference

| Function | Trigger | `--no-verify-jwt` | Description |
|----------|---------|-------------------|-------------|
| `twilio-webhook` | Twilio inbound SMS | **YES** | Entry point for all inbound SMS; routes by keyword |
| `habit-sms-response` | Internal (from twilio-webhook) | **YES** | 3-step AI pipeline: pending clarification → followup context → smart parse |
| `sms-backup-plan` | Internal (from twilio-webhook) | **YES** | BACKUP keyword state machine for plan adjustment |
| `sms-reflection-response` | Internal (from twilio-webhook) | **YES** | Multi-turn Sunday reflection conversation (3 exchanges → parse → save) |
| `habit-sms-followup` | Cron (every 15 min) | **YES** | Sends habit tracking followup SMS (1 habit at a time) |
| `send-sms-reminders` | Cron | **YES** | Morning habit reminder SMS with vision-aligned messaging |
| `send-admin-sms` | Frontend POST | **YES** | Admin bulk SMS tool; sets 24h AI hold on recipients |
| `send-admin-email` | Frontend POST | **YES** | Admin email tool with `{{name}}` template support |
| `send-welcome-email` | DB trigger (pg_net) | **YES** | Day-1 founder letter; skips lite users |
| `notify-new-signup` | DB trigger (pg_net) | **YES** | Admin notification email on new signup |
| `send-onboarding-emails` | Cron | **YES** | Multi-day drip email campaign |
| `send-trial-drip-emails` | Cron | **YES** | Trial period education emails |
| `send-trial-expiry-sms` | Cron (daily 2PM UTC) | **YES** | Farewell SMS with SUMMIT50 promo code when 7-day trial expires |
| `send-habit-setup-emails` | Cron | **YES** | Habit setup confirmation emails |
| `send-habit-tracking-emails` | Cron | **YES** | Daily habit tracking reminder emails |
| `send-reflection-reminders` | Cron (Sunday 6PM UTC) | **YES** | AI-generated week synopsis opener → creates reflection session. Skips users who signed up Fri/Sat/Sun (too new for reflection). |
| `send-weekly-digest` | Cron | **YES** | Single-user weekly summary email |
| `send-all-weekly-digests` | Cron | **YES** | Batch runner for weekly digests |
| `generate-weekly-digest` | Internal | **YES** | Compute weekly digest data |
| `generate-all-weekly-digests` | Cron | **YES** | Batch digest generator |
| `send-challenge-completion-sms` | Cron (Monday 2PM UTC) | **YES** | AI congratulations SMS + archive prompt when challenge completed |
| `send-weekly-synthesis-sms` | Cron | **YES** | SMS weekly summary |
| `daily-health-report` | Cron | **YES** | Daily summary report |
| `delivery-completeness-check` | Cron/manual | **YES** | Audit SMS/email delivery |
| `send-phone-verification` | Frontend POST | NO | Sends OTP for phone verification |
| `verify-phone-code` | Frontend POST | NO | Verifies OTP, sends opt-in confirmation |
| `create-lite-enrollment` | Frontend POST | **YES** | Lite challenge signup (creates user + profile + enrollment) |
| `send-lite-challenge-sms` | Cron (every 15 min) | **YES** | 5x/day SMS for lite challenge |
| `send-lite-challenge-email` | Cron (daily) | **YES** | Daily email + end-of-challenge summary |
| `stripe-webhook` | Stripe webhook | **YES** | Handles checkout, subscription updates/deletes |
| `create-checkout-session` | Frontend POST | NO | Creates Stripe Checkout (subscription or payment) |
| `create-portal-session` | Frontend POST | NO | Creates Stripe Customer Portal |
| `ai-chat` | Frontend POST | NO | Proxy to OpenAI chat completions |
| `habit-ai-suggest` | Frontend POST | NO | AI habit suggestions based on vision |
| `send-invite-email` | Frontend POST | NO | Invitation emails |
| `sms-add-habit` | Internal (from twilio-webhook) | **YES** | SMS habit creation state machine (ADD keyword) |
| `cal-webhook` | External webhook | NO | Calendar integration |
| `send-march-update` | Manual POST | **YES** | One-time March 2026 product update email to all users |

### SMS Flow

```
Inbound SMS (Twilio)
  └→ twilio-webhook
       ├→ CRISIS keywords → 988 Lifeline resources
       ├→ STOP/UNSUBSCRIBE → Update sms_opt_in = false
       ├→ HELP → Info reply
       ├→ START/SUBSCRIBE/YES (not opted in) → Opt-in confirmation
       ├→ ARCHIVE → Archives completed challenge habits (inline handler)
       ├→ BACKUP → sms-backup-plan (state machine)
       ├→ ADD / NEW HABIT → sms-add-habit (state machine)
       ├→ Active reflection session → sms-reflection-response (AI conversation)
       └→ Everything else → habit-sms-response
            ├→ Step 0: Safety net check for backup/reflection/add-habit sessions
            ├→ Step 1: Check sms_pending_clarification (10 min expiry)
            ├→ Step 2: Check sms_followup_log for context (Y/N reply)
            └→ Step 3: OpenAI smart-parse (suppressed during admin hold)
                  ├→ If understood as habit log → process entries
                  ├→ If habits matched but no values → coaching fallback
                  └→ If not understood → coaching fallback (with smart routing, escalation, FAQ)
```

---

## 4. Database Schema

### Core Tables

**`profiles`** — User profile (1:1 with auth.users)
- Identity: `id`, `first_name`, `last_name`, `email`, `phone`, `timezone`
- State: `profile_completed`, `onboarding_completed`, `has_seen_welcome`, `phone_verified`
- SMS: `sms_opt_in`, `tracking_followup_time` (default 17:00), `admin_sms_hold_until`
- Stripe: `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `subscription_tier`, `trial_ends_at`, `subscription_current_period_end`
- Challenge: `challenge_type` ('lite' or NULL)
- Soft delete: `deleted_at`

**`health_journeys`** — Onboarding vision data
- `user_id`, `form_data` (JSONB: visionStatement, whyMatters, etc.)

**`weekly_habits`** — Persistent habit schedule
- `user_id`, `habit_name`, `day_of_week` (0-6), `reminder_time`, `timezone`, `time_of_day`
- `challenge_slug` (NULL for personal, slug for challenge habits)
- `archived_at` (NULL = active, timestamp = archived/shelved)
- UNIQUE(user_id, habit_name, day_of_week)

**`habit_tracking_config`** — Per-habit tracking settings
- `user_id`, `habit_name`, `tracking_type` ('boolean'|'metric'), `metric_unit`, `metric_target`
- `challenge_slug`, `tracking_enabled`
- UNIQUE(user_id, habit_name)

**`habit_tracking_entries`** — Daily tracking data
- `user_id`, `habit_name`, `entry_date`, `completed` (boolean), `metric_value` (numeric)
- `entry_source` ('app'|'sms')
- UNIQUE(user_id, habit_name, entry_date)

**`weekly_reflections`** — Weekly journal
- `user_id`, `week_number`, `went_well`, `friction`, `adjustment`, `app_feedback`, `source` ('web'|'sms')
- UNIQUE(user_id, week_number)

### SMS Tables

**`sms_messages`** — Complete 2-way SMS log
- `direction` ('inbound'|'outbound'), `user_id`, `phone`, `body`
- `sent_by_type` ('admin'|'system'|'coach'|'synthesis'|'trial_reminder'|'trial_drip'|'challenge_completion')
- `twilio_sid`, `twilio_status`

**`sms_followup_log`** — Followup tracking (dedup)
- `user_id`, `habit_name`, `sent_at`, `message_sent`

**`sms_pending_clarification`** — Conversation state (10 min expiry)
- `user_id`, `pending_type`, `context` (JSONB), `expires_at`

**`sms_backup_sessions`** — BACKUP flow state (30 min expiry)
- `user_id`, `step`, `context` (JSONB), `expires_at`

**`sms_add_habit_sessions`** — ADD habit flow state (30 min expiry)
- `user_id`, `step` (describe_habit|smart_refine), `context` (JSONB: proposed_habit_name, proposed_tracking_type, proposed_days, refinement_count, etc.), `expires_at`

**`sms_reflection_sessions`** — Sunday reflection conversation state (2 hr expiry)
- `user_id`, `week_number`, `step`, `context` (JSONB: opener, messages[], exchange_count, tracking_data, habit_names), `expires_at`

**`backup_plan_log`** — Audit trail for plan adjustments
- `user_id`, `habit_name`, `change_type`, `original_value`, `new_value`, `ai_reasoning`

### Challenge Tables

**`challenge_enrollments`** — Full 4-week challenges
- `user_id`, `challenge_slug`, `status` (active|completed|abandoned), `current_week` (1-4)
- `survey_scores` (JSONB: focus area ratings, `focusAreaOrder`, `week1StartDate`, `final_reflection`)
- `completion_sms_sent_at` (dedup guard for congratulations SMS)
- `celebration_seen_at` (one-time in-app celebration modal guard)

**`challenge_habit_log`** — Habits added per challenge week
- `enrollment_id`, `week_number`, `focus_area_slug`, `habit_name`

**`lite_challenge_enrollments`** — Lite 5-day challenges
- `user_id`, `challenge_slug`, `status` (pending|paid|active|completed)
- `delivery_track` ('sms'|'email_only'), `cohort_start_date`
- `stripe_payment_intent_id`, `paid_at`

**`lite_challenge_sms_log`** — Dedup for lite challenge delivery
- `enrollment_id`, `challenge_day` (1-5), `message_slot` ('8am'|'10am'|'12pm'|'3pm'|'5pm'|'daily_email'|'summary_email')
- UNIQUE(enrollment_id, challenge_day, message_slot)

### Other Tables

**`user_resources`** — Content library (admin-assigned or digest-generated)
**`coaching_sessions`** — 1:1 coaching session log per billing period
**`email_reminders`** — Email delivery log
**`sms_reminders`** — Legacy SMS reminder log
**`pilot_invites`** — Early access tracking
**`pilot_feedback`** — Pilot feedback collection
**`phone_verifications`** — OTP codes with 10-min expiry

### RLS Pattern

All tables have Row-Level Security enabled:
- **Service role**: Full access (edge functions use service role key)
- **Users**: Can read/write their own rows (`auth.uid() = user_id`)
- **Admin**: SELECT via `auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'`

### DB Triggers

- `trigger_welcome_email_on_profile_complete` → calls `send-welcome-email` via pg_net
- `trigger_notify_new_signup_on_profile_complete` → calls `notify-new-signup` via pg_net

---

## 5. SMS System Deep Dive

### Two Twilio Accounts

| | Main (Summit) | Lite (Tech Neck) |
|---|---|---|
| Env vars | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `TWILIO_ACCOUNT_SID_LITE`, `TWILIO_AUTH_TOKEN_LITE`, `TWILIO_PHONE_NUMBER_LITE` |
| Used for | All Summit habit tracking, reminders, admin SMS | Lite challenge enrollment verification, opt-in confirmation, challenge texts |

The shared `_shared/sms.ts` accepts optional `accountSid`, `authToken`, `from` overrides to route through either account.

### Habit Followup System

`habit-sms-followup` runs every 15 minutes via cron:
1. Get all users with `tracking_followup_time` matching current window
2. Get today's habits with tracking enabled
3. Skip habits already logged today
4. **If any habit has a pending followup (sent but unanswered) → skip entire user**
5. Send followup for the **first** unasked habit only
6. Wait for reply → `habit-sms-response` logs entry → next cron cycle sends next habit

### Admin SMS Hold

When admin sends SMS via `send-admin-sms`:
- Sets `admin_sms_hold_until = NOW() + 24h` on recipient profiles
- **Step 3 (AI coaching/smart-parse) suppressed** during hold
- **Steps 1-2 still work** — users can always reply to tracking prompts (Y/N, metric values)
- **Scheduled followups NOT blocked** — they're system-initiated, not AI auto-replies
- "Resume AI" button in admin clears the hold early

### Duplicate Phone Handling

When multiple profiles share the same phone number (e.g., Summit user + lite challenge user):
- `twilio-webhook` and `habit-sms-response` fetch ALL matching profiles
- Prefer the **non-lite** user (`challenge_type !== 'lite'`)
- Falls back to first result if all are lite

### SMS Habit Creation (ADD Keyword)

`sms-add-habit` is a state machine triggered by texting ADD or NEW HABIT:

```
ADD keyword → check habit cap (5 max)
  ↓ (if under cap)
Step 1: describe_habit
  Summit: "What habit do you want to build? Describe it in a sentence."
  User: "I want to start meditating"
  ↓
Step 2: smart_refine
  AI extracts: habit name, tracking type, frequency, target
  AI pressure-tests unrealistic plans (e.g., "7x/week is ambitious — try 4x?")
  Summit: "'10-minute morning meditation' 4x/week (Mon/Tue/Thu/Sat)? (Y/N or tell me what to change)"
  ↓ Y → write to DB    N → one re-refinement, then accept
  ↓
Write: Insert habit_tracking_config + weekly_habits rows
  Summit: "Done! Reminders set for Mon/Tue/Thu/Sat. Adjust in the app anytime."
```

Key details:
- Uses `sms_add_habit_sessions` table (30 min expiry)
- AI applies SMART goal principles (Specific, Measurable, Achievable, Relevant, Time-bound)
- Default reminder time: user's most common existing habit time, or 08:00
- Days assigned by AI based on frequency (evenly spread) — user adjusts in app
- Max 1 re-refinement round to keep exchanges under 4
- CANCEL/QUIT/EXIT exits at any step
- Duplicate habit names detected and flagged
- 5 personal habit cap enforced (challenge habits excluded)

### AI Coaching System

The coaching fallback in `habit-sms-response` → `generateCoachingResponse()` handles all non-tracking messages. It has several layers:

**User Context Bundle** (`_shared/user_context.ts`):
- Loaded via `loadUserContext()` — 11 parallel DB queries
- Includes: profile, health vision, all habits (with streaks, completion rates, last 4 weeks history, metric averages), active challenge, last 3 reflections, last 10 SMS messages, guides/resources, subscription tier, coaching sessions remaining
- Formatted via `formatContextForPrompt()` and injected into AI system prompts
- Used by `habit-sms-response` and `sms-reflection-response`

**Smart Routing** — AI detects intent and routes to existing features:
| User Intent | AI Suggests |
|------------|-------------|
| Add a new habit | "Text ADD" |
| Overwhelmed / reduce a habit | "Text BACKUP" |
| Clean up old challenge habits | "Text ARCHIVE" |
| Change schedule / times | go.summithealth.app/habits |
| Start a challenge | go.summithealth.app/challenges |
| Cancel / quit a habit | BACKUP first, then app for full removal |
| Needs more support | Coaching escalation (tier-aware) |

**Coaching Escalation** — tier-aware upsell:
- Helps directly first: 1-2 tips + relevant guide link from user's library
- After 3+ exchanges on same struggle OR user signals frustration → suggest coaching
- If user has sessions remaining (Plus/Premium): "Book at go.summithealth.app/coaching"
- If no sessions available (Core or used up): "Upgrade to Plus for 1-on-1 time — go.summithealth.app/pricing"
- Suggests coaching at most once per topic

**FAQ Block** — answers "how do I...?" questions about Summit features (ADD, BACKUP, ARCHIVE, challenges, reflections, guides, coaching, follow-up time, cancel/pause)

**Character limit**: 480 chars (3 SMS segments). Completeness over brevity.

---

## 6. Stripe & Subscriptions

### Subscription Tiers

| Tier | Price ID Env Var | Type |
|------|-----------------|------|
| Core | `STRIPE_PRICE_CORE` | Recurring |
| Plus | `STRIPE_PRICE_PLUS` | Recurring |
| Premium | `STRIPE_PRICE_PREMIUM` | Recurring |
| Lite Tech Neck | `STRIPE_PRICE_LITE_TECH_NECK` (frontend: `VITE_STRIPE_PRICE_LITE_TECH_NECK`) | One-time $1 |

### Checkout Flow

1. Frontend calls `create-checkout-session` with `priceId` and `mode` ('subscription' or 'payment')
2. Function looks up or creates Stripe customer
3. Returns Stripe Checkout URL → frontend redirects
4. After payment: `stripe-webhook` handles `checkout.session.completed`
   - **Subscription**: Updates profile with `subscription_status`, `subscription_tier`, period end
   - **Lite payment**: Updates `lite_challenge_enrollments` to `status: 'paid'`

### Trial
- 7-day free trial on all subscription tiers
- `trial_ends_at` set by `stripe-webhook` when checkout completes
- `send-trial-expiry-sms` fires daily at 2 PM UTC (8 AM Central) — catches trials that ended in the last 24h, sends farewell SMS with SUMMIT50 promo code

### Subscription Gate

`Home.jsx` checks `hasActiveSubscription(profile)` which returns true if:
- `subscription_status` is 'active' or 'trialing'
- `challenge_type === 'lite'` (bypasses gate → routes to `/tech-neck/status`)

---

## 7. Challenges

### Full Challenges (4-week programs)

5 challenges hardcoded in `src/data/challengeConfig.js`:
- `stress-free` — Breathwork → Movement → Digital Boundaries → Recovery
- `healthy-hearts` — Movement → Nutrition → BP Awareness → Cardio
- `sound-sleepers` — Hygiene → Wind-down → Light/Temp → Consistency
- `energy-masters` — Morning Activation → Nutrition Timing → Afternoon Reset → Movement
- `gut-health` — Fiber → Fermented Foods → Hydration → Mindful Eating

Rules:
- One active challenge at a time
- 4 weeks, one focus area per week
- Challenge habits are separate from the personal habit cap (5)
- After weekly reflection, modal prompts for next week's habit

### Challenge Completion Flow

Challenges **auto-complete** when the 4-week period ends (28 days from `week1StartDate`). This is handled in `getActiveEnrollment()` in `challengeService.js` — when it detects the period is over, it sets `status: 'completed'` and returns `null`. No manual button is required.

**Completion sequence:**
1. `getActiveEnrollment()` detects 28+ days elapsed → auto-completes enrollment
2. Dashboard, Habits, or Challenges page loads → checks for unseen completed enrollments
3. **Celebration modal** fires (confetti + habit journey summary + social sharing)
4. User dismisses → `celebration_seen_at` set (one-time only)
5. Completed challenge detail page shows: survey scores, habit log, final reflection, share buttons
6. **Monday cron** (`send-challenge-completion-sms`, 2PM UTC): AI congratulations SMS + ARCHIVE prompt
7. User replies **ARCHIVE** via SMS → `twilio-webhook` archives all challenge habits

**Week 4 reflection prompt:** During week 4, the reflection page shows a modal asking "What did you learn?" and "Which habit will you keep?". This saves optional reflection data to `survey_scores.final_reflection` but is **not required** for completion — the challenge auto-completes regardless.

### Habit Archiving

Habits can be **archived** (shelved) instead of deleted:
- `archived_at` column on `weekly_habits`: NULL = active, timestamp = archived
- Archived habits are excluded from SMS reminders, followups, tracking, and AI context
- Users archive/unarchive from the Habits page (archive button on each card, "View Archive" in overflow menu)
- **ARCHIVE SMS keyword** archives habits from the most recently completed challenge
- Service functions: `archiveHabit(name)`, `unarchiveHabit(name)`, `getArchivedHabits()`
- All edge functions that query `weekly_habits` filter with `.is('archived_at', null)`

### Challenge Config Duplication

The 5 challenges are hardcoded in `src/data/challengeConfig.js` (frontend). The `send-challenge-completion-sms` edge function duplicates the slug/title/focus-area mappings as a Deno const since it can't import the React module. **If challenges are added or renamed, update both locations.**

### Lite Challenge (Tech Neck, 5-day)

- $1 one-time payment via Stripe
- 25 pre-written SMS messages (5/day: 8am, 10am, 12pm, 3pm, 5pm)
- Separate Twilio number
- Cohort-based start date (currently hardcoded: 2026-03-30)
- Users who skip SMS get daily email with all 5 messages
- End-of-challenge summary email with 2-min routine + Summit CTA

---

## 8. Environment Variables

### Frontend (`VITE_*` — baked into build)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase API endpoint |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_STRIPE_PRICE_LITE_TECH_NECK` | Stripe price ID for lite challenge |
| `VITE_POSTHOG_API_KEY` | PostHog analytics key |
| `VITE_POSTHOG_HOST` | PostHog API host |
| `VITE_APP_URL` | App base URL (for SMS links) |
| `VITE_ADMIN_EMAIL` | Admin email for route access |
| `VITE_PILOT_START_DATE` | Pilot program start date |

### Supabase Secrets (edge functions)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Auto-injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase |
| `TWILIO_ACCOUNT_SID` | Main Twilio account |
| `TWILIO_AUTH_TOKEN` | Main Twilio auth |
| `TWILIO_PHONE_NUMBER` | Main outbound SMS number |
| `TWILIO_ACCOUNT_SID_LITE` | Lite challenge Twilio account |
| `TWILIO_AUTH_TOKEN_LITE` | Lite challenge Twilio auth |
| `TWILIO_PHONE_NUMBER_LITE` | Lite challenge outbound number |
| `OPENAI_API_KEY` | OpenAI API key (gpt-4o-mini) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature validation |
| `STRIPE_PRICE_CORE` | Core tier price ID |
| `STRIPE_PRICE_PLUS` | Plus tier price ID |
| `STRIPE_PRICE_PREMIUM` | Premium tier price ID |
| `STRIPE_PRICE_LITE_TECH_NECK` | Lite challenge price ID |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Sender address (default: Summit <hello@summithealth.app>) |
| `ADMIN_EMAILS` | Comma-separated admin email list |
| `FRONTEND_URL` | Frontend domain for email links (https://go.summithealth.app) |

---

## 9. Gotchas & Need-to-Knows

### Deployment

1. **`--no-verify-jwt` resets on EVERY redeploy.** Any redeploy — CLI, dashboard, or auto-deploy — strips this flag. Always include it:
   ```bash
   supabase functions deploy twilio-webhook --no-verify-jwt
   supabase functions deploy habit-sms-response --no-verify-jwt
   supabase functions deploy sms-backup-plan --no-verify-jwt
   supabase functions deploy habit-sms-followup --no-verify-jwt
   supabase functions deploy send-admin-sms --no-verify-jwt
   supabase functions deploy send-admin-email --no-verify-jwt
   supabase functions deploy notify-new-signup --no-verify-jwt
   supabase functions deploy send-welcome-email --no-verify-jwt
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy create-lite-enrollment --no-verify-jwt
   supabase functions deploy send-lite-challenge-sms --no-verify-jwt
   supabase functions deploy send-lite-challenge-email --no-verify-jwt
   supabase functions deploy sms-reflection-response --no-verify-jwt
   supabase functions deploy sms-add-habit --no-verify-jwt
   supabase functions deploy send-challenge-completion-sms --no-verify-jwt
   supabase functions deploy send-march-update --no-verify-jwt
   ```

2. **Migration file names must have unique YYYYMMDD prefixes.** Duplicate dates cause `duplicate key` errors in `supabase db push`. If two migrations land on the same day, use adjacent dates (e.g., 20260325 and 20260326).

3. **Cron functions must be deployed before scheduling.** If `send-lite-challenge-sms` isn't deployed but the cron is scheduled, you'll get 404 errors every 15 minutes. Deploy first, then schedule.

4. **Cron auth headers: use `jsonb_build_object`, never raw JSON strings.** Both vault concatenation (`'{"Authorization": "Bearer ' || secret || '"}'::jsonb`) and hardcoded JSON strings break — the SQL editor wraps long lines, injecting `\n` characters that are invalid in JSON. The only reliable approach is `jsonb_build_object('Authorization', 'Bearer <jwt>')` which builds JSON programmatically and is immune to line breaks. Always verify with `SELECT status FROM cron.job_run_details WHERE command LIKE '%function-name%' ORDER BY start_time DESC LIMIT 1;`

5. **Vercel caches aggressively.** After pushing frontend changes, users may need Cmd+Shift+R (hard refresh) to see updates. `VITE_*` env vars are baked into the JS bundle at build time — adding a new one requires a Vercel redeploy.

### Auth

6. **PKCE flow breaks server-generated links.** The Supabase client uses `flowType: 'pkce'`, so `generateLink({ type: 'magiclink' })` or `generateLink({ type: 'signup' })` will NOT create valid sessions. The client has no `code_verifier`. Use auto-confirm + `signInWithPassword` instead (as the lite challenge does).

### SMS

7. **Duplicate phone numbers across profiles.** If two profiles share a phone (e.g., Summit user + lite challenge user), `twilio-webhook` and `habit-sms-response` will error on `.maybeSingle()`. Both have been updated to fetch all matches and prefer the non-lite user.

8. **Inbound SMS logging: twilio-webhook only.** The `twilio-webhook` function logs all inbound messages to `sms_messages`. Downstream functions (`habit-sms-response`, `sms-backup-plan`) should NOT log the inbound message again.

9. **Admin SMS hold scope.** `admin_sms_hold_until` only suppresses Step 3 (AI coaching). Steps 1-2 (pending clarification replies, Y/N followup responses) still work. Scheduled followups (`habit-sms-followup`) are NOT blocked.

### Timezone

10. **Never filter timestamps with midnight UTC.** Using `.gte('sent_at', '2026-03-24T00:00:00')` filters at midnight UTC, not the user's local midnight. Compute `todayStartUtc` by converting the user's local midnight to UTC:
   ```typescript
   const todayStartLocal = `${dateStr}T00:00:00`
   const todayStartUtc = new Date(
     new Date(todayStartLocal).toLocaleString('en-US', { timeZone: timezone })
   ).toISOString()
   ```

### OpenAI

11. **All AI calls use gpt-4o-mini.** Responses are parsed as JSON. Some responses arrive wrapped in markdown code blocks (`` ```json ... ``` ``), so the parsing logic strips those before `JSON.parse()`.

### Database

12. **RLS admin policies use hardcoded email.** Admin access in RLS is granted via `auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'`. Adding a new admin requires new migration(s) for each table's policy.

13. **PostgREST join limitations.** Tables that both reference `auth.users` (like `lite_challenge_enrollments` and `profiles`) can't be joined with `!inner()` syntax. Query them separately and join in JavaScript.

### Habits

14. **Always filter `archived_at IS NULL` when querying `weekly_habits` for active habits.** Every edge function and frontend service that queries habits for reminders, tracking, followups, or AI context must include `.is('archived_at', null)`. Forgetting this will send reminders for archived habits. The only exceptions are informational queries (e.g., `notify-new-signup` showing admin what habits a user has, or `send-habit-setup-emails` checking if a user has any habits).

15. **Challenge auto-completion is client-triggered.** `getActiveEnrollment()` checks `isChallengeOver()` and auto-completes if 28+ days have passed. This means auto-completion only fires when a page loads that calls `getActiveEnrollment` (Dashboard, Habits, Challenges, Reflection). There is no server-side cron for auto-completion — the `send-challenge-completion-sms` cron only sends SMS for already-completed enrollments.

---

## 10. Admin Dashboard

### Two Tabs

- **Summit Users** — All profiles where `challenge_type` is NOT 'lite'. Shows name, email, phone, last login, habit count, engagement status.
- **Challenge Participants** — Queries `lite_challenge_enrollments` + matching profiles. Shows name, email, phone, registered date, status (Pending/Paid/Active/Completed).

### Admin Features

- **Bulk SMS**: Select users → compose message → sends via `send-admin-sms` → sets 24h AI hold
- **Bulk Delete**: Select users → cascading delete across all related tables
- **SMS Thread Viewer**: Side panel showing recent conversations per user
- **User Detail Page** (`/admin/users/:id`): Profile info, health vision, habits (with tracking config), reflections, resources, full SMS conversation, coaching session log
- **Engagement Filters**: All / New / Active / Inactive / No Habits + tier filter + SMS opt-out filter
- **Quiet Users Alert**: Yellow banner showing users with no login in 5+ days

### Admin Email

Hardcoded in two places:
1. `src/services/adminService.js` → `ADMIN_EMAILS` array (frontend route guard)
2. RLS policies on each table → `auth.jwt()->>'email' = 'eric.alan.boggs@gmail.com'`
3. `ADMIN_EMAILS` Supabase secret (edge function admin verification)

---

## Quick Reference: Deploy Checklist

```bash
# Frontend (auto on push to main)
git push origin main  # Vercel auto-deploys

# Edge function (manual)
supabase functions deploy FUNCTION_NAME --no-verify-jwt  # if applicable

# Database migration
supabase db push

# Check Supabase secrets
supabase secrets list
supabase secrets set KEY=value
```
