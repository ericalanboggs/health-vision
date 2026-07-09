# Burnout funnel — "Off the Treadmill" (plan)

*Third acquisition funnel — the last of the "3 doors." Mirrors the proven
`lifestyle-changes` (men-40+) and `postpartum` (`/yourturn`) funnels. Audience:
mid-to-senior knowledge workers running on fumes. Voice: `ERIC_VOICE.md` for the
guide/landing/ads (Eric-as-coach), `SUMMIT_COACH_VOICE.md` for in-product.
Source copy draft: `marketing-copy/landing-draft-burnout.md` (refactored 2026-05-30).*

## Where this door stands today
Unlike postpartum/lifestyle, only the **back half** of this funnel exists:
- ✅ `burnout` segment fully wired in `src/data/onboardingSegments.js` — `/welcome`
  headline, ack, vision-intro personalization. A `?source=burnout` trial signup already
  gets the tailored onboarding.
- ✅ Landing-page **copy draft** (`marketing-copy/landing-draft-burnout.md`) — good bones,
  still has `[BRACKET]` placeholders for real outcome numbers.
- ❌ No `/burnout` route/page, no guide PDF, no `capture-freebie-lead` slug, no drip, no ads.

This plan builds the front half by cloning the postpartum machinery.

## Locked / proposed decisions
- **Name (PROPOSED):** guide **"Off the Treadmill,"** route **`/burnout`** (keep "burnout"
  in title/SEO for findability). Subtitle carries the method, e.g. *"come back to what
  matters — in the small increments you actually have."* Alt names to weigh: "Back to What
  Matters," "The Realign," "Off the Grind." ← **Eric to confirm.**
- **Audience:** mid-to-senior knowledge workers (PM, designer, eng, consultant, exec).
  Sleep wrecked, can't unplug, app-fatigued (quit Headspace/Calm/Whoop/Oura/Notion),
  high willingness-to-pay. This is a *values/time-alignment* play, not a "recover so you
  grind better at work" play — recovery is the entry, realignment is the point.
- **Clinical scope:** non-clinical. Stress/sleep/energy/boundaries/time. Warmly name the
  hard stuff (chronic exhaustion, anxiety, depression) but **refer out** to a clinician.
  Stays inside the clinical guardrail.
- **Voice/face:** Eric-as-**coach** intro — Mayo-certified, *built* Summit, and knows the
  knowledge-worker treadmill personally (this is the credibility hook the draft leans on).
  Testimonial: **need a real burnout pilot user** (postpartum had Julie; no burnout
  equivalent yet — quote PENDING, or launch text-only + add later). ← **open.**
- **Channel:** paid Meta/IG test to start (reuse the pixel + attribution we already ship).
  LinkedIn is where this audience lives and is a strong Phase 4b follow-up. Same health-data
  restriction → optimize **landing-page views**, measure `freebie_leads` by `utm_content`.
  `utm_campaign=burnout-realign`. Ad-policy: **no "personal attributes"** (can't imply
  "you're burned out"), speak to the situation, not the person.

## The resource — "Off the Treadmill" guide
Habit stacking reframed for the over-committed professional. Method mirrors the men-40+/
postpartum guide, re-voiced around protecting time + realigning to what matters:
1. **Name what's draining you — and what you'd protect.** One line: what are you reaching
   for that the treadmill crowded out? That line is the anchor.
2. **Shrink it small + anchor it** to a cue you already hit every workday (the first coffee,
   the calendar's last meeting, the commute, laptop-shut). A micro-recovery or one boundary,
   not an overhaul.
3. **Run it a week — small still counts.** Built for the week you actually have, not the one
   you keep promising yourself. A 2-minute version beats a skipped hour.
4. **Add the next only when the last holds.** One a week. It feels slow. It's supposed to.
- Warm **refer-out box** (chronic exhaustion / anxiety / depression → a clinician).
- Format: PDF + worksheet (page 2) + readable web version on the landing.

## Onboarding (already built — no fork needed)
`source=burnout` trial signups already flow through the tailored `/welcome` → Vision →
AI-suggestion path (`onboardingSegments.js` `burnout` entry). **No new onboarding dev
required** — this is the big advantage over the postpartum build, which needed the
motivation-mode fork. (Optional future upgrade: offer the same "start small vs. dive in"
fork, but not required to ship.)

## Architecture to clone (proven twice)
- **Landing:** clone `src/pages/YourTurn.jsx` → `src/pages/Burnout.jsx` at `/burnout`.
  Swap constants (`FREEBIE_SLUG='burnout-guide'`, `PDF_PATH`, `TRIAL_URL` →
  `use-cases/burnout?source=burnout`), re-voice STEPS / KEEP_GOING / hero / founder note /
  proof / footer. Register route in `src/App.jsx`. ← **built as the draft in this session.**
- **Lead capture:** add `'burnout-guide'` to `FREEBIES` in
  `supabase/functions/capture-freebie-lead/index.ts` (`kind:'guide'`, pdf) + a
  `buildOffTreadmillGuideHtml()` download email in burnout voice. Redeploy `--no-verify-jwt`.
- **Drip:** `supabase/functions/send-freebie-drip-emails/index.ts` — add a `BURNOUT_CONTENT`
  map + extend `resolveContent()` to serve burnout variants for `freebie_slug='burnout-guide'`
  (same 6-day schedule/emailTypes; default content untouched — same pattern as postpartum).
- **Assets:** `freebies/burnout-guide/off-the-treadmill.md` → `public/freebies/burnout-guide.pdf`.
- **Attribution:** same `utm_content`→source fold + Meta pixel, already in the cloned page.
- **Trial target:** needs a `use-cases/burnout` page on the Framer marketing site (the
  `use-cases/*` pages live on summithealth.app, not this repo) — or point `TRIAL_URL` at an
  existing page until it's built. ← **flag for Eric.**

## Build sequence
- **Phase 0:** confirm guide name + testimonial plan; fill `[BRACKET]` numbers in the draft copy.
- **Phase 1:** write "Off the Treadmill" guide → PDF; ship the `/burnout` landing (this session's
  draft); add `FREEBIES` entry + download email; deploy. *(Fast — machinery is proven.)*
- **Phase 2:** burnout drip (add `BURNOUT_CONTENT`, extend `resolveContent`, deploy).
- **Phase 3:** *skip* — onboarding already handles `source=burnout`. (Optional fork later.)
- **Phase 4a:** Meta ad creative (3 angles) + campaign `burnout-realign`.
- **Phase 4b (optional):** LinkedIn test — best-fit channel for this audience.
- Phases 1+2+4 ship a working lead→drip→trial funnel; because Phase 3 is free here, this is
  the *cheapest* of the three doors to complete.

## Open / pending
- Guide name (proposed: "Off the Treadmill") + subtitle wording.
- Real outcome numbers for the `[BRACKET]` placeholders in the copy draft.
- Burnout testimonial — real pilot user + quote (or launch text-only).
- Whether a founder video sits on the landing (postpartum shipped text-only first).
- `use-cases/burnout` Framer page for the `TRIAL_URL`.
