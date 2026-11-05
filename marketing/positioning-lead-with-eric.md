# Positioning: Lead With Eric

> **Decision:** 2026-10-27. Eric, after a SCORE business coaching session.
> **Scope:** whole site. Not `/coaching` alone.
> **Status:** direction agreed, phased below. No phase approved to build yet.
> **Related:** [`STRATEGIC_DIRECTION.md`](./STRATEGIC_DIRECTION.md) (holds, guardrails),
> [`coaching-client-quotes.md`](./coaching-client-quotes.md) (the evidence),
> [`ERIC_VOICE.md`](../ERIC_VOICE.md) (the voice this is written in).

## The decision in one line

People buy Eric. The site should say so first, not fourth.

## Why this is a correction, not a pivot

**On the provenance, precisely** (corrected 2026-10-27 after an earlier draft
overstated it): the virtues list is **Eric's own**, written after the SCORE
conversation and a re-read of the five client testimonials. It is one person
synthesising his own evidence, not two independent sources agreeing. An earlier
version of this document called it uncoordinated corroboration. It is not.

What it *is* is traceable. Every virtue on the list is something a paying client
put in writing first — nothing in it is aspirational, and nothing was invented to
fill a gap in the positioning. That is the bar this table exists to check, and it
is the reason the repositioning rests on something firmer than a consultant's
read of the market: these are what real clients experienced and said so.

| The virtue, as Eric names it | The client language behind it |
|---|---|
| Positive attitude, cheerleader, upbeat energy | Killian: "he's not just a coach, he's a cheerleader" |
| Breaks big things into achievable steps | Killian: "take big, overwhelming ideas and break them into simple, doable steps" |
| Meets discouragement with patience | Killian: "Even when I felt stuck or discouraged, he met me with patience" |
| Reframes challenges | Killian: "reframed challenges as new beginnings" |
| Cuts through the noise of online gurus | Suze: "cut through the overwhelming noise of many online diet and exercise gurus" |
| Builds confidence | Suze: "increased my muscle mass, but also my confidence" |
| Bespoke to the individual | Brianna: "approach to define and tackle *my* goals"; Suze: "a program that allowed me to focus on what truly works for me" |
| Accountability with kindness | Brianna: "flexible and focus on consistency, not perfection" |
| Movement made possible on a busy schedule | Brook: "achieve my movement and step goals, even alongside a busy schedule" |
| Lowers the barrier to starting | Jamie: "He makes it less intimidating to get started" |

**Consequence:** every one of the five quotes now has a job. The two that were held
in reserve (Jamie, Brook) are no longer reserves.

**The gap this exposes:** not one client names *energy*, which is what `/coaching`'s
hero and `SHIFT` both promise, and which is the lead benefit for the hero persona.
Ask for it at the next client wrap-up. Until then, no quote backs that claim.

## What binds this repositioning

These are not negotiable by the repositioning. They constrain how far it goes.

1. **Outcome claims stay in client voice.** `STRATEGIC_DIRECTION.md` §7: Summit's own
   voice stays at adherence and habit mechanics. So "build muscle mass" and "weight
   loss without frailty" are **quote-selection criteria, not headlines**. Suze may say
   she gained muscle. We may not say Summit builds muscle. This bites hardest on the
   GLP-1 messaging, which is built almost entirely out of outcome language.
2. **Mayo is "trained", NBHWC is the board certification.** Two separate credentials,
   never merged. Never "Mayo Clinic certified". §7 amended 2026-10-27 — it had been
   forbidding "board-certified" since before the results landed.
3. **The §4 holds still stand.** No new landing pages, no new lead capture, no new
   freebies, IG the only managed channel. New *populations* therefore get **messaging
   on pages that already exist**, not funnels of their own. Postpartum and burnout
   funnels are already scoped and unbuilt; a third and fourth would be queue, not
   progress.
4. **The hybrid argument survives.** §2.1 says Summit is AI *and* human, and that the
   human is the entire argument. "Lead with Eric" strengthens that; it does not mean
   retiring the app. See "What this does not mean" below.

## Page by page

### 1. `/coaching` — Phase 1, proposed

The page currently runs Hero → Problem → Shift → Coach → Method → Quotes → CTA, and
`coaching.ts` says it out loud: *"Warmth leads, credentials sit quietly underneath."*
That is the sentence this decision reverses. The page has no trial, no app, no
checkout. Eric is the entire offer, and he appears fourth.

- Credential line **above the fold**, under the hero CTA: Mayo Clinic trained ·
  National Board Certified Health & Wellness Coach.
- **`COACH` moves to position two**, directly after the hero. Named before the reader
  is asked to recognise themselves in a problem.
- **`QUOTES` moves up with it.** Proof belongs next to the claim it proves, not seven
  sections later.
- **All five quotes**, not three. Jamie and Brook come off the bench.
- `COACH.body` rewritten to lead with the credentials and the coaching philosophy
  rather than opening on "I run the same habits I'll ask of you."

### 2. Homepage — Phase 2

> **RESOLVED 2026-11-05, decisively rather than as planned below.** Eric asked for
> something simpler and stronger than the section-by-section rewrite this section
> proposed: make `/` literally become the `/coaching` page (Eric leads, full stop —
> no rewrite needed, no risk of some sections still arguing the old order), and move
> the entire former homepage to a new page, `/app`, reachable from a new "The App"
> nav item. `/company` was removed in the same pass; its one non-redundant section,
> `TRUST`, moved to `/app` rather than being lost. Implementation:
> `summit-web/src/pages/index.astro` (now the coaching page), `src/pages/app.astro`
> (the former homepage), `src/data/about.ts` (trimmed to just `TRUST`).
>
> The analysis below is kept for the reasoning — the app's place in the story
> (§"The app's place in the story") is exactly what `/app` now executes — but the
> "rewrite in place" plan it describes did not happen and will not; the swap
> superseded it.

`FounderNote` currently sits seventh of eleven sections, after Pricing. For a site
whose argument is the human in the loop, that is the wrong depth.

- Eric moves up. Credential line into or just under `Hero`.
- `FOUNDER` (about.ts) gets expanded from three short lines into a real statement of
  philosophy and credentials.
- **Keep the two testimonial sets separate.** `TESTIMONIALS` in `site.ts` are app
  users; the coaching quotes are clients who paid for twelve weeks of Eric. Mixing
  them implies each bought what the other bought. If coaching quotes go on the
  homepage they need their own labelled block.

#### The app's place in the story (Eric, 2026-10-27 — this settles it)

**The app follows Eric. It does not lead, and it is not demoted either.** The order
of the argument on the homepage is:

1. Eric — credentials, philosophy, what clients experience.
2. *"I build technology to support you between and beyond our sessions."*
3. Summit Health as the hero technology — continuously built and iterated with the
   latest in tech, by the coach you just met.

**The differentiator is not that Eric has an app.** Plenty of coaches have one. Two
things make this one different, and the copy has to carry both or it says nothing:

- **It is integrated with the coaching** — in sessions and between them. Not a
  separate product you use alone; the thing your coach is working inside with you.
- **It grows with you.** It adapts to the person rather than expecting the person to
  fit existing content and a pre-set direction. This is the same adaptation mechanism
  the homepage already tries to name, and the thing every content-library wellness app
  gets backwards.

Write it as capability, not as product: *"I have new tools at my fingertips every day
to help you."* The AI is how a solo coach builds something bespoke per person, which
is the argument §2.1 already makes — the AI does the daily per-person work, the human
does the judgment.

**This does not contradict the pricing fork.** `TIERS` sells the app standalone at $12
under the tagline "The system, on your own" — which is exactly right under this
framing: it is Eric's system, available without Eric. Keep that tagline; it is doing
load-bearing work now.

**Watch for:** the homepage currently sells the app first and reaches Eric in section
seven. Inverting that without also rewriting `Pillars`, `HowItWorks` and `Different`
will leave three sections arguing the old order. Phase 2 is a rewrite, not a reorder.

### 3. `/company` — Phase 3

Becomes the depth page for credentials and philosophy — what Mayo training and NBHWC
certification actually mean, why they're load-bearing, and the coaching philosophy in
full. `ABOUT_HERO`, `ORIGIN`, `PATTERN`, `BELIEFS` and `FOUNDER` already exist to
build on. `TRUST` stays as-is.

### 4. Population messaging — Phase 4

SCORE's target list, mapped against what exists. **No new pages** (§4.2).

| Population | Where it goes |
|---|---|
| Busy professionals, tech, 40s–50s, labs/inflammation, cutting back on alcohol | `/use-cases/warning-signs`. This is already the hero persona; the alcohol thread and the tech-career specificity are missing from the copy and would sharpen it. Alcohol is also Week 1 of the IG arc, so the page and the content would finally point at each other. |
| Busy moms | Already served by `/use-cases/postpartum`. SCORE frames them as a subset of busy professionals; the existing page is tighter than that. Leave it. |
| Late boomers / early retirees, 60s, longevity and strength | **No home today.** Nearest is `/use-cases/movement`. Needs a decision: a section on an existing page, or wait for the hold to lift. |
| GLP-1 (on, off, plateaued) | **No longer deferred — the coursework landed.** Eric completed a GLP-1 Coaching Course (Nov 2026) and the resulting framework mapped cleanly onto Understand/Stack/Believe without needing outcome claims — see `glp-1-page-content.md`. Shipping as `/use-cases/glp-1`, the fourth and final Tier-2 persona page, a named exception to §4.2's hold (see §4.2 itself). Funnels to the discovery call, not the app trial, since the content (prescriber coordination, dose-aware tracking) needs a real coach, not self-serve. |

### 5. Pricing — no change needed

`TIERS` already forks app-vs-Eric with the Signature Plan featured at $900/12 weeks.
This repositioning is an argument *for* that structure. One open TODO already in the
file: the real call cadence is still unnamed.

### 6. SEO — Phase 5

Not yet attempted anywhere. Cheapest version: per-page titles and descriptions
carrying the credential and the practice terms people actually search ("board
certified health coach", "habit coaching"). `/coaching`'s `SEO` const is the place to
start. No new pages needed to do this.

### 7. Social — content work, not build

SCORE's "10 minutes a day, align social to the site" is consistent with the §4.1 IG
hold, and the four-post rotation already exists. The change is *subject*: the rotation
should now carry credentials and coaching philosophy, not only tactics.

## Where I'd push back

**"Imitate the best. Copy everything Noom does."** Worth researching, wrong to copy.
Noom is the AI-only, scale-first pole that §2.1 explicitly bets against, and they are
funded to buy touchpoints that five hours a week cannot buy. Copying their funnel
imports their economics. The thing worth taking from Noom is their GLP-1 adjacency
*timing*, not their playbook.

## What this does not mean

- Not retiring the app. §2.1's hybrid is the differentiator and the app is half of it.
- Not "AI beats human coaches", and not the reverse either. §2.1 rule 1 still holds.
- Not four new funnels. Populations get messaging on existing pages.
- Not health-outcome claims in Summit's voice, however well the quotes perform.

## Open questions for Eric

1. ~~On the homepage, does the app stay co-equal with the coaching?~~ **Answered
   2026-10-27** — the app follows Eric as the technology he builds to support you
   between and beyond sessions. See "The app's place in the story" above.
2. Late boomers / early retirees: section on an existing page now, or hold?
3. The Signature Plan call cadence — still a TODO in `site.ts`, and a credential-led
   page makes the vagueness more conspicuous. Sharper now that the app is positioned
   as the between-sessions layer: "between sessions" implies a session count.
4. Is $900/12 weeks anchored against the $200–300/mo coach figure anywhere? A
   credential-forward page is where that comparison would land hardest, and §2.1
   requires it stay hedged.
