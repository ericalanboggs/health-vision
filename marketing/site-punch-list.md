# Site punch list

From the external AI site audit (2026-08-23). Reviewed against the actual code
and against `marketing/STRATEGIC_DIRECTION.md`, not taken at face value.

**Verdict on the audit:** it reflects the site as it actually is today, including
the 2026-08-21/22 changes — it names the Build My Vision CTA on the homepage, the
competing trial ask beside it, and lists "Build my vision" in its CTA inventory.
Directionally right. Where it needs pushback is on cost: it prices some items as
copy changes when they are new pages, business decisions, or blocked by a
documented hold.

Its single best insight is #4 — the vision output is not yet good enough to be
the acquisition engine everything now points at. That is correct and it is the
week's work.

**Being worked section by section with Eric.** Each section gets a decision
recorded below rather than an assumption.

---

## Decisions, section by section

### §1 — What business Summit is in — DECIDED 2026-08-23

"Healthy habit platform and coaching service" reads B2B. That is useful language
later, for an enterprise page, and wrong for a consumer arriving cold. Consumer
copy should be approachable, direct and consumer-directed.

**Decision:** rewrite the consumer-facing description in consumer voice. Do not
follow the audit's proposed wording strictly — it is 27 words doing the work of
six. **Park** the platform/service framing for a future "For enterprise" page
rather than deleting it.

Consequence: the subhead is now a copy task, not a reopening of the positioning
decision in `site.ts`. The *headline* ("Your vision. Your habits. Your pace.")
is still open and gets decided at §5.

### §2 — Too much to understand before experiencing it — DECIDED 2026-08-23

The structural half was already handled: Build My Vision is the primary CTA, so a
cold visitor's first move is to use the product rather than read about it.

The audit counted fourteen concepts as a flat list. Read in place, every
proprietary name is immediately followed by a plain-English line that explains it
("The Climb" -> "Pick 1-3 habits, sized for a hard week"). That is naming a step,
not teaching vocabulary.

**Decision:** Basecamp and The Climb stay. The mountain metaphor is the brand.

**Decision + DONE:** pull tier names out of pre-pricing copy. Six bullets in the
persona steps named Plus and Premium well above the pricing table, which asked
readers to hold a pricing structure before seeing one and made "a human is
involved" read as a paywall notice.

    'Real coach in the loop on Plus and Premium'    -> 'A real coach in the loop'
    'Talk to Coach Eric monthly on Plus and Premium' -> 'Talk to Coach Eric on a monthly call'

`about.ts` keeps its "I still coach Summit Premium members personally" line —
that is Eric's own bio, read well after the pricing question, and the tier name
is load-bearing there.

### §3 — The new funnel — DECIDED 2026-08-24

The audit's economic argument is the strongest line in it: "Start free trial asks
me to believe Summit is valuable. Build my vision can prove value before asking
me to buy anything." That is why the CTA change was worth making.

**Decision:** the two CTAs are not competing, they are ranked — a filled button
and a text link two sizes down. A high-intent visitor should not have to answer
seven questions to find signup. Keep the secondary link. No change.

**The real finding:** the audit's funnel diagram is already our shape, except two
steps that do not exist yet — "Summit creates something personal" and "3
recommended habits." So §3 is not a funnel-architecture problem. It is §4.

**Blocking everything:** no analytics were connected anywhere. Now fixed —
see below.

---

### §3a — Analytics — DONE 2026-08-24

There were no analytics on either site. The app had PostHog fully wired (22 files
calling `trackEvent`) but no key, so every event since launch went nowhere. The
marketing site had nothing at all.

Shipped:

- **summit-web**: PostHog in the Base layout, gated on `PUBLIC_POSTHOG_KEY`.
  Named events `marketing_quiz_clicked` and `marketing_trial_clicked`, both
  carrying the originating path so we can see which pages actually feed the quiz.
- **health-vision**: `cross_subdomain_cookie` + `localStorage+cookie` persistence.
- **health-vision**: `quick_plan_question_viewed` on every question, carrying
  number, total, field, section and source — so a drop-off number tells us *which*
  question loses people, which is the only actionable part.

**The trap to avoid:** both sites must use the SAME PostHog project key. A
mismatch does not error. The same person just counts twice and the
marketing -> `/plan` step reads as zero conversion, which is the single number
this exists to measure.

**VERIFIED IN PRODUCTION 2026-08-24.** One person ID
(`01a0345d-dfee-79b9-...`) carried all seven events across both domains:

    Pageview                    www.summithealth.app
    marketing_quiz_clicked      www.summithealth.app
    Pageleave                   www.summithealth.app
    Pageview                    go.summithealth.app/plan
    quick_plan_viewed           go.summithealth.app/plan
    quick_plan_question_viewed  x2

Cross-subdomain stitching works. The funnel is readable end to end.

**Two gotchas worth remembering:**

1. `posthog-js` drops events from automated browsers (`navigator.webdriver`,
   headless UA). Claude cannot verify analytics from the headless browser — it
   loads, initialises, reports `__loaded=true`, and silently discards every
   capture. Verification has to be a human in a real browser.
2. The Activity table lags the Live tab by a minute or two, longer on a project's
   first ingestion. Empty Activity + active Live is normal, not a fault.

### §4 — Make the vision result feel personal — DECIDED 2026-08-24

The audit is right that the payoff is thin, but it assumed we lack signal. We do
not: the quiz collects seven answers and the paragraph uses two. Score, capacity,
barriers and named habits all sit unused.

**Decision:** leave the vision *content* generation alone for now. Instead make
the result feel more formidable at the front end.

**DONE:** "Download a copy of my vision" on the payoff screen — a one-page PDF
they can print, keep, or show a doctor. Given away before signup on purpose: the
artifact is the proof, the account is for having Summit run it. Fires
`quick_plan_downloaded`, which is the evidence that will settle the habits
question below.

**Decision:** no recommended habits pre-auth. The CTA tease ("create an account
and Summit will suggest a few") is enough for now.

**Decision:** no anonymous AI synthesis endpoint. `ai-chat` requires a signed-in
user, and opening it would put an unauthenticated OpenAI proxy on a public URL.
Revisit only if the funnel shows high completion and low signup — the case where
the payoff is provably the bottleneck.

---

### §5 — Homepage — DECIDED 2026-08-25

**DONE — the lede.** Rewritten consumer-first, following §1. Meta description
updated to match, since that is what a cold visitor sees in search results and
link previews.

**Decision: the headline stays.** "Your vision. Your habits. Your pace." The
audit wanted a question headline. Question headlines are a direct-response
convention and read as being sold to, which `ERIC_VOICE.md` names as the failure
mode for this audience. The line also now sets up the primary CTA — it promises
three things and the button delivers the first.

**Decision: show-the-product is already handled.** The audit wanted the SMS
thread higher. It sits inside the hero, with testimonials directly beneath it
since 2026-08-22, so the top of the page is headline, CTA, product, proof.
Revisit once analytics shows whether people scroll at all.

---

## P1 — The vision output (audit #4)

**The one that matters.** Everything now points at `/plan`, and what `/plan`
gives back is thinner than what the audit imagines.

Today the payoff paragraph is a deterministic concatenation of canned sentence
fragments carried on each quiz option:

> "I wake up feeling energized and ready for the day. I want to feel like myself again."

The audit's target is a synthesis that reads like it understood them, plus three
concrete scheduled habits. That is a real gap and it is the difference between
"nice quiz" and "holy shit, that's me."

**Two decisions needed before building:**

1. **Do we show habits before signup?** Today habits are gated — `/plan` ends at
   "create a free account and Summit will suggest a few." The audit wants three
   named, scheduled habits *on the payoff screen*. That gives away the plan to
   convert on the follow-through. Probably right, but it is a real change to what
   the trial is for.
2. **How do we synthesize anonymously?** `ai-chat` requires a signed-in user
   (`supabase/functions/ai-chat/index.ts:33`), which is why the current paragraph
   is deterministic. Opening it to anonymous callers puts an unauthenticated
   OpenAI proxy on a public URL. Needs a purpose-built endpoint with rate
   limiting, or a much better deterministic template.

**Cheaper interim:** improve the deterministic version. Better fragments, a real
opening line, the starting-point card reworked to read as a read on them rather
than a receipt of their answers. Gets maybe 60% of the effect for a fraction of
the work, and de-risks the decision above.

---

## P2 — Finish the CTA work (audit #8, #31.1)

Verified inventory across the site, seven distinct labels for two actions:

    4x  Start free for 14 days
    3x  Start for free
    2x  Get 2 weeks free
    2x  Build my vision
    2x  2 Weeks Free          (nav)
    1x  Try it free for 14 days
    1x  Or start your free trial

The audit is right and this is cheap. Target architecture:

- **Primary:** Build my vision
- **Secondary:** Start 14 days free
- **Tertiary:** Talk to Eric

Also: the four Tier 1 use case pages (`energy`, `sleep`, `stress`, `movement`)
still lead with "Start for free" pointing at the bare trial URL. They should get
the quiz CTA, tagged, same as the persona pages. That finishes what the
2026-08-22 change started.

---

## P3 — Instrument the funnel (audit #31.6)

The audit is right that at this stage conversion learning beats traffic.

`/plan` already emits `quick_plan_viewed`, `quick_plan_completed`,
`quick_plan_signup_clicked`, `quick_plan_claimed`, and `profile_completed`. So
the events exist. What is unverified is whether they are landing: there is no
`VITE_POSTHOG_API_KEY` in the local `.env`, and dev logs "PostHog API key not
found."

**Do first, it is nearly free:** confirm the key is set in the Vercel env for
`health-vision`, then walk the funnel in production and check the events arrive.
An instrumented funnel that silently drops events is worse than none, because it
looks like zero traffic rather than a broken pipe.

Missing from the chain: nothing fires per question, so we cannot see *which*
question loses people. One event with the question index would fix that.

---

## P4 — Eric on the homepage (audit #9)

Cheap and the audit is right. He is on `/company` and in the `/plan` videos, but
the homepage never says who is behind this.

**Credential wording is a hard guardrail.** It reads **"Mayo Clinic-trained
health coach"** and nothing else. Never "Mayo-certified", "board-certified" or
"certified at" until the NBHWC results land (`STRATEGIC_DIRECTION.md` §7, and the
header comment in `summit-web/src/data/about.ts`).

An earlier note here recommended "Mayo-certified" as the stronger phrasing. That
was wrong and is corrected. The four `/plan` video scripts say only "health
coach", which is safe but understates it; "Mayo Clinic-trained health coach" is
both accurate and stronger.

Small: photo, name, one or two lines, the credential as worded above. No founder
mythology.

---

## P5 — Plain-English trust and AI transparency (audit #23, #24)

Health data plus AI plus SMS is a higher trust bar than ordinary SaaS, and the
audit's list of unanswered questions is fair: who sees my data, what does AI do
vs what does Eric do, is my data training a model, can I delete it, what should I
never use Summit for.

**Scope caution:** the audit proposes a new "Your Data & Summit" page. §4.2 holds
new pages. Build it as a section on an existing page (`/company` is the natural
home) and it sidesteps the hold entirely. Revisit a dedicated page later.

The AI-does / Eric-does / Summit-doesn't split from #24 is genuinely
confidence-building and is mostly a writing job.

---

## Needs a decision before it is a punch list item

**Homepage hero rewrite (audit #5, #6).** The audit wants concrete
problem-first copy over "Your vision. Your habits. Your pace." That may be right,
but the current copy is a deliberate fidelity port and `src/data/site.ts` says so
at the top: repositioning is a separate decision, not a site edit. This belongs
in a strategy conversation, not a punch list.

**Pricing hierarchy (audit #18).** Making $69 the default instead of $12 is a
revenue and positioning decision with Stripe consequences. The audit's logic is
sound — if the differentiation is AI + human, leading with the AI-only tier
undercuts it — but this is a council question, not a website task.

**Customer story page (audit #16, #17).** The strongest credibility idea in the
audit, and blocked on two things: it needs real clients' explicit permission to
publish their story and conversation screenshots, and it is a new page under
§4.2. Worth doing, not this week.

---

## Do not action

**LinkedIn (audit #25).** The audit says pursue founder-led LinkedIn
aggressively. `STRATEGIC_DIRECTION.md` §4.1 puts LinkedIn dark through
~2026-09-21, with Instagram as the single managed channel. The audit did not have
that context. The hold stands until it is reviewed.

**Referral loops, Summit Score, interactive demo (audit #10, #26, #27).** All
interesting, all new surfaces or new build, none of them this week. Park them.

---

## Suggested order

1. **P3** funnel verification — nearly free, and everything else is guesswork without it
2. **P2** CTA consolidation + the four Tier 1 pages — cheap, finishes started work
3. **P4** Eric on the homepage — cheap, high trust value
4. **P1 interim** better deterministic vision output — the real prize, lower-risk half
5. **P5** trust/AI section on `/company`
6. **P1 full** anonymous AI synthesis + pre-auth habits, once the two decisions are made
