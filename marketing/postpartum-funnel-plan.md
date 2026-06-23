# Postpartum funnel — "Your Turn" (plan)

*Second acquisition funnel, mirroring the men-40+ `lifestyle-changes` funnel
(`marketing/meta-ads-launch.md`). Audience: moms rebuilding ~6mo–3yr postpartum.
Voice: `ERIC_VOICE.md` for the guide/landing/ads (Eric-as-coach), `SUMMIT_COACH_VOICE.md`
for in-product (onboarding, SMS, motivation content). Decisions locked 2026-06-23.*

## Locked decisions
- **Name:** guide **"Your Turn"**, route **`/yourturn`**. (Subtitle carries the method, e.g.
  *"getting back to you — 5 minutes at a time, anything counts."*) Rejected `/reclaim` (too high-end).
- **Audience:** rebuilding moms ~6mo–3yr postpartum (inclusive of newer, but speaks to the rebuilder).
- **Clinical scope:** non-clinical. Energy/time/identity/gentle strength. Warmly name the hard
  stuff (mood, overwhelm, pelvic floor) but **refer out** to providers. Stays inside the clinical guardrail.
- **Voice/face (3c hybrid):** Eric-as-**coach** intro (Mayo-certified, built Summit, "in the pilot
  it was incredibly resonant with moms — 'anything counts,' 5–10 min on you and just you, with a real
  coach behind it") + **Julie's testimonial** as the real-mom emotional proof. (Julie = postpartum
  testimonial mom; distinct from motivation-mode pilot "Jen" unless Eric says same person. Julie's
  expanded quote pending.) Pressure-test draft with the council's postpartum advisor.
- **Channel:** paid Meta/IG test (mirror men-40+). 3 ad angles. Same health-data restriction →
  optimize **landing-page views**, measure `freebie_leads` by `utm_content`. utm_campaign `postpartum-rebuild`.
  Ad-policy watch-outs: no "personal attributes" (don't imply "you're a struggling new mom"), **no
  before/after body imagery**, careful with body/postpartum claims.

## The resource — "Your Turn" guide
Habit stacking reframed for postpartum reality. Method mirrors the men-40+ guide, re-voiced:
1. **Name what you miss** — energy, sleep, strength, *you*. Pick one, not all.
2. **Shrink it absurdly small + anchor it** to a cue you already hit 20×/day (the feed, the stroller, the kettle).
3. **Run it a week — "small still counts"** (built for the day you actually have, not the one you wish you had).
4. **Add the next only when the last holds.**
- Warm **refer-out box** (PPD/PPA, pelvic floor → your provider).
- Format: PDF + web version on landing. Julie's quote woven in as emotional proof.

## Onboarding fork (the real dev work)
After a `source=postpartum` trial signup → simpler `/welcome` (skip full Vision), then a fork:
- **"I'm ready to start small and get the hang of it"** → **motivation mode** (used to texting / AI
  support / daily encouragement). → single prompt: *"What would be most helpful right now — what are
  you struggling with or want more of?"* **That free-text answer becomes the motivation-mode steering
  prompt** (one input, two jobs: feels like gentle onboarding, seeds content curation).
- **"Dive right in"** → full Vision + habits.

Build pieces: (a) the choice/fork screen; (b) `skipVision` lite path; (c) **motivation-mode
auto-enrollment** (set flag + seed steering prompt from the answer); (d) a **postpartum content
batch** for the curation queue. Known MVP gap: motivation mode is **SMS-only, no dashboard** — fine
to launch, flag as future.

## Architecture to clone (from Explore map, 2026-06-23)
- **Landing:** clone `src/pages/LifestyleGuide.jsx` → `/yourturn`. Swap constants
  (`FREEBIE_SLUG='postpartum-guide'`, PDF path, TRIAL_URL → `use-cases/postpartum?source=postpartum`,
  video), re-voice STEPS/copy. Register route in `src/App.jsx`.
- **Lead capture:** add `'postpartum-guide'` to `FREEBIES` in `supabase/functions/capture-freebie-lead/index.ts`
  (`kind:'guide'`, pdf). Duplicate `buildGuideHtml()` for postpartum voice if needed.
- **Drip:** `supabase/functions/send-freebie-drip-emails/index.ts` — **duplicate the 6-email sequence
  with postpartum voice** (don't reuse as-is; warmth + no-bounce-back + refer-out must be native).
  Key by `freebie_slug='postpartum-guide'`. Day 13 → trial.
- **Assets:** `freebies/postpartum-guide/your-turn.md` → `public/freebies/postpartum-guide.pdf`.
- **Onboarding:** `src/data/onboardingSegments.js` (postpartum entry exists) + `src/pages/SegmentWelcome.jsx`
  (add fork + `skipVision`). `Home.jsx`/`App.jsx` routing auto-works by `acquisition_source`.
- **Motivation mode:** admin-only today (`src/components/admin/MotivationModePanel.jsx`; `profiles.motivation_mode`
  + `motivation_*`; `motivation_content_queue`). Need signup auto-enroll + postpartum batch.
- **Attribution:** same `utm_content`→source fold we shipped for men-40+; same Meta pixel.

## Build sequence
- **Phase 0:** lock voice + guide outline; pressure-test w/ postpartum advisor. ← in progress
- **Phase 1:** write "Your Turn" guide → PDF; clone landing `/yourturn`; `FREEBIES` entry; deploy. *(Fast.)*
- **Phase 2:** postpartum drip (duplicate + re-voice).
- **Phase 3:** choice onboarding + `skipVision` + motivation auto-enroll + postpartum content batch. *(Real code.)*
- **Phase 4:** ad creative (3 angles) + Meta campaign.
- Phases 1+2+4 ship a working lead→drip→trial funnel on their own; Phase 3 upgrades the trial experience.

## Open / pending
- Julie's expanded quote (for guide + ads).
- Guide subtitle wording.
- Whether there's a video on the landing (and who's in it) — TBD.
