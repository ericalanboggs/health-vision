# Summit Health — Strategic Direction & Build Holds

> **For:** Claude Code (and any agent doing work on `health-vision`)
> **Written:** 2026-07-30 · **Supersedes:** prior weekly-playbook assumptions
> **Review date:** ~2026-09-21 (end of the 60-day Instagram push)

Read this before proposing or building anything growth-related. It documents
**what Eric deliberately decided NOT to build right now** as much as what's in scope.
If a task isn't listed under "In scope," assume it's on hold and ask first.

---

## 1. The constraint that drives everything

**5 hours per week.** Solo founder, working largely from phone + remote.

The previous playbook — 5 conversations/wk, reel + carousel, LinkedIn, product
work, funding scan, bookkeeping — was a ~15 hr/wk design running on a 5 hr budget.
It was audited and cut down on 2026-07-23. **Concentration over spread** is the bet:
one channel, one persona, one story arc, for 60 days.

Any proposal that adds a new surface, channel, or system needs to name what it
displaces from the 5 hours.

---

## 2. Positioning (use this language, not older copy)

**Niche (locked):**
> Summit is for professionals approaching 40 who want the system and accountability
> to build healthy habits around what actually matters to them — at their own pace,
> without app obsession.

**Hero persona for the next 60 days — the "wake-up call recipient":**
Someone approaching or past 40 who has had the moment — the lab reading, the
diagnosis, the family conversation, the mirror — where the old ways stopped working.
They want a partner to figure out what does work, at their pace.

Postpartum and burnt-out-professional personas stay live on their landing pages but
receive **static maintenance only**. Don't build new flows, copy, or funnels for them.

### 2.1 Category position: the hybrid (Eric, 2026-08-19)

The competitive set has two poles, and the bet is that **both fail, for opposite
reasons**:

- **AI-only.** Where most of the money and most of the new entrants are going,
  because it scales fast. Nobody is actually paying attention to you. It is a
  very responsive way of being alone.
- **Human-only.** Traditional 1:1 coaching. Real attention, but roughly
  $200–300/mo for two or three calls, so most of the month happens without them.
  And any coach carrying a full roster ends up running one framework across
  everyone — not laziness, just hours.

**Summit is the hybrid, and the hybrid is not a compromise between the two.** AI
does the work that needs doing daily and per-person (reading the week, shaping the
next suggestion). The human does the work that needs judgment. Each covers the
other's failure mode.

Use this frame when the question is "how is this different." Two rules when
writing it:

1. **Never position as AI beating human coaches.** Eric is a coach; the human in
   the loop is the entire argument. Criticism of one-to-one work is a concession
   made from the inside, never an attack.
2. **The $200–300 figure is a hedged market observation** from conversations, not
   published data and not a claim about a named competitor. Keep it hedged.

Live implementation: `summit-web/src/components/Different.astro` (homepage +
all three persona pages).

**Retired language — do not reintroduce anywhere in code, copy, or metadata:**
- "5 minutes a day"
- "reset boundaries" / "redefine what health means"
- Any transformation framing (the direction is agency, not transformation)

---

## 3. Weekly time shape (current cadence)

| Block | Time | Contents |
|---|---|---|
| **Sunday** | 120 min | 30 min reset (pick next beat, sketch 4 posts) · 30 min shoot/edit/post Sun reel ("what stuck") · 60 min batch Mon (arc declare) + Wed (tactical) |
| **Friday** | 120 min | 60 min shoot/edit/post Fri reel (mechanism) · 60 min — 2 real conversations that feed content |
| **Floating** | 60 min | ~10–12 min/day outbound IG engagement (comment on larger accounts where the persona gathers) |

**Posting rotation** — the week opens and closes on the arc, written for the wake-up
call recipient throughout:

| Day | Angle | What it does |
|---|---|---|
| **Mon** | "this week I'm working on X" | Names the beat at the start of the week, when it's actually still ahead |
| **Wed** | Making time count (tactical) | A swap or time-saver they can use immediately |
| **Fri** | Personalized systems (mechanism) | Why one-size-fits-all fails and how Summit adapts to the person |
| **Sun** | "what stuck / what didn't" | Closes the loop on Monday's beat, sets up the next |

All four are reels for the first 30 days.

**Arc:** one behavior at a time, sequenced. Week 1 opener = **alcohol**, then food
swaps, breathing, yoga, meditation. Sequencing is the point — parallel would model
the wrong behavior. Mon → Sun is a closed loop within the week: declare it Monday,
report honestly Sunday.

**CTA discipline:** 1 in every 5 posts (~every 8 days). Rotation: wake-up call
worksheet → weekly tracker → free coaching session → back to worksheet. Everything
else is pure value, no link push.

---

## 4. HOLDS — lead capture and distribution

These are decisions, not oversights. Do not "helpfully" build past them.

### 4.1 Instagram is the only managed acquisition channel
For 60 days (through ~Sept 21, 2026), **Instagram is the single channel that gets
weekly investment.** Everything else is on hold:

- **LinkedIn** — going dark after one 45-min batching session to queue the remaining
  burnout series. No new LinkedIn-specific assets, scheduling tooling, or repurposing
  pipelines.
- **Paid social** — off. Already tested; spend produced clicks-to-nowhere at this
  budget level. Do not rebuild ad landing pages or conversion infrastructure for paid.
- **TikTok** — cross-post only, ~5 min/wk, zero managed engagement. No TikTok-specific
  build work.
- **Email list building** — no newsletter, no list-growth mechanics, no capture modals.

### 4.2 No new lead-capture surfaces
Do not add email/phone capture to any new surface. Specifically on hold:

- **Wake-Up Call worksheet tool** — ships as **v0: localStorage only, no capture field.**
  The Supabase-wired "text me my plan" version (which would feed SMS onboarding) is
  **v1 and deliberately deferred.** It is the known next step; it is not this quarter's
  work. Do not add the field, the table, or the edge function.
- **No new landing pages.** The three persona pages that exist are the set.
- **No new freebies/lead magnets** beyond the three CTAs that already exist and ship:
  wake-up call worksheet, weekly trackers, free coaching session.
- **No popups, exit-intent, scroll-triggered capture, or gated content** anywhere on
  summithealth.app.

**Rationale:** capture surfaces without traffic are wasted build time. The 60-day bet
is that the constraint is *attention*, not conversion plumbing. Conversion work resumes
only after Instagram produces measurable, repeatable traffic to the existing CTAs.

### 4.3 What's also cut from the old weekly playbook
- 5 formal conversations/wk → **2** that feed content
- Weekly full keystone → 30-min Sunday reset; full 4-part keystone runs **biweekly**
- Weekly content brief `.docx` → **retired for 60 days**
- Weekly product work → **only when a conversation surfaces a specific user ask**
- Three-persona equal investment → hero persona only

---

## 5. IN SCOPE — what product/dev work is still welcome

- **Keeping the existing funnel healthy.** Bugs in the live SMS pipeline
  (`habit-sms-followup`, `habit-sms-response`, `twilio-webhook`) outrank everything.
- **Instrumentation of what already exists.** UTM tags on the existing CTA links
  (e.g. `?utm_source=freebie-tool`), PostHog events on existing flows. Measurement is
  cheap and tells us when a hold should lift.
- **Anything a real user or conversation specifically asked for.** That's the trigger
  for product work now — not a roadmap.
- **Multilingual (ES / PT-BR) SMS** — already in flight, continues.
- **iOS/SwiftUI** — learning project, backlog-only, never displaces the 5 hours.
- **Deploy hygiene** — see `SUMMIT_HANDOFF.md` §9. `--no-verify-jwt` resets on every
  redeploy; that gotcha still applies.
- **Marketing site edits** — cheap now, see §5.1.

### 5.1 The marketing site moved off Framer (2026-08-19)

`summithealth.app` is an Astro site in the **`summit-web`** repo, auto-deployed by
Vercel on push to `main`. Framer is retired.

This changes the cost side of several decisions in this document. A landing page
was an afternoon in Framer; it's now a data file and a push. A blog post was a
manual CMS entry; it's now a markdown file in `summit-web/src/content/posts/`.

**The holds in §4 still stand.** They were never about build cost — §4.2's stated
rationale is that *capture surfaces without traffic are wasted build time*, and
that's unchanged. What's changed is that when a hold does lift, acting on it is
hours rather than days. Do not read "it's cheap now" as permission to build past
§4.2. In particular the site ships **no email capture anywhere**: the persona pages
have the slot built and disabled (`capture.enabled: false` in
`summit-web/src/data/personas.ts`).

Slug changes from the move, both 308 at the edge:
`/use-cases/lifestyle-changes` → `/use-cases/warning-signs`, `/category/all` → `/resources`.

---

## 6. When a hold lifts

Don't lift a hold on vibes. Concrete triggers:

| Hold | Lifts when |
|---|---|
| Worksheet v1 capture (Supabase/SMS) | The v0 tool shows real, repeated traffic from IG — i.e. there's something to capture |
| New landing pages / freebies | An existing CTA converts consistently and demand outruns it |
| LinkedIn | The 60 days end and IG either worked (extend) or didn't (reassess channel) |
| Paid | Value prop is validated organically first — confirmed prerequisite |
| Second persona investment | Hero persona has a working, repeatable content→CTA→trial path |

---

## 7. Standing guardrails (non-negotiable, apply to all copy and code)

- **Claims stay at adherence and habit mechanics.** Never specific health outcomes.
- **Credential reads "Mayo Clinic-trained."** NBHWC exam has been taken; results are
  weeks out. Do **not** write "board-certified" anywhere until results land.
- **"Coaching, not medical advice" disclaimer** is preserved verbatim on every
  freebie, tool, and page that carries method content.
- Brand accent: `#1F7A8C`. Domain: summithealth.app.
