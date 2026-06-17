# Design Brief: Summit Trail Report — Julie Dillon

A personalized "year-in-review"-style achievement certificate for Summit's standout pilot
user, Julie Dillon. Think **national-park badge meets Strava year-in-review meets a heartfelt
thank-you note**. The insight IS the gift — render her real journey beautifully.

Pairs with a physical gift: a **Summit-branded insulated water bottle** (her signature win is
hydration, so the bottle is the keepsake; this certificate is the meaning).

---

## Purpose
- Celebrate Summit's most engaged founding pilot user and make her feel genuinely seen.
- Double as a shareable artifact (she's a true believer — she may post it / show friends → organic proof).
- Establish a **repeatable template** Summit can later auto-generate as milestone certificates / annual
  Trail Reports for any user. Design it once, parameterized, so the same layout works for the next person.

## Output spec
- **Primary:** print-ready single page, **US Letter portrait (8.5×11in, 2550×3300px @ 300dpi)**. Export **PDF + PNG**.
- **Secondary (optional):** a **square 1080×1080 social version** (condensed — header, award badge, 3 hero stats,
  one-line coach note) for texting/sharing.
- Self-contained, no external assets beyond fonts + the Summit mark.

## Brand & aesthetic
- Use the **`@summit/design-system`** palette (pull exact hex from the design system / tailwind preset):
  `summit-forest` (deep green, primary/ink), `summit-emerald`, `summit-sage`, `summit-mint` (soft bg tints),
  `summit-lime`, `summit-moss`. Warm off-white / cream paper background, not stark white.
- **Mountain motif** ⛰️ — a subtle topographic-line or summit-ridge graphic. Premium and calm, not busy.
- A **gold/foil accent** for the award badge only (it's the hero) — feels like an actual award seal.
- Typography: a confident serif or characterful display for the headline/award title; a clean sans for stats
  and body. Generous whitespace. This should feel earned and premium, not like a coupon.
- Reference the visual restraint of the recent `/lifestyle-changes` polish pass — copy-density discipline,
  every element earns its place.

## Voice
- Headline/labels: Summit brand voice (warm, encouraging, summit/trail metaphor).
- **The coach's note: Eric's founder voice** — read `ERIC_VOICE.md`. Personal, specific, a little playful,
  zero corporate. It should read like Eric actually wrote it to her (he did).

---

## Content / copy (ready to render)

> Numbers below are **defensible from her SMS history**; confirm exact counts from the DB before final print
> (see "Stats to confirm"). Placeholders in `{{ }}`.

### Header
- Summit wordmark + ⛰️
- Eyebrow: **SUMMIT TRAIL REPORT**
- Big: **Julie Dillon** · *Founding Summiter since Jan 10, 2026*

### The Award (hero badge — gold seal)
- **Recommended title:** **"The Hydration Hero" 🥇** — specific to her breakthrough, fun, true.
- Alternates (pick one): *"Peak Performer — {{WEEKS_ACTIVE}} Weeks on the Mountain"* · *"The Consistency Award"*
- Sub-line: *Awarded for showing up — on 75 different days across 23 weeks.*

### Hero stats row (4 big numbers — CONFIRMED from DB 2026-06-17)
- **23** weeks on Summit *(founding pilot user, since Jan 10, 2026)*
- **58** workouts completed *(30-min sessions, 3–5×/week — including full 5/5 weeks)*
- **75** active days *(distinct days she showed up and logged something)*
- **42 / 57** days she hit her 80oz water goal *(74% — and she pushed as high as 110oz)*

### The signature story — Hydration (a small visual)
- Short callout: *"In week 2, Julie said: 'I need a better way to track my water.' She set a goal of 80oz —
  then logged it 57 times, hit the goal on 42 of those days, and pushed as high as 110oz."*
- A simple **hydration viz**: a clean bar/line of her daily oz against the 80oz goal line, or a row of filled
  water-drop icons (42 of 57 filled). Keep it elegant and legible, not a dense chart.
- Pull-stat for the viz: *"Best week: **97oz/day average.**"*

### The journey (1 short paragraph)
- *"She did it through work travel, sick days, vacations, and a full house — and she was honest every single
  week about what slipped. That's not an app working. That's Julie working — building the strong, healthy
  foundation she wants for her family and what's ahead."*
- (Note: frame her vision — peak health to prepare for a strong second pregnancy — as a **future goal she's
  training toward**. She is NOT currently pregnant. Do not imply otherwise.)

### Coach's note (Eric's voice — draft, Eric to tweak)
> *Julie — you were one of the very first people to say yes to Summit. 23 weeks later you're still here,
> showing up on 75 different days. You turned "I can't track my water" into hitting 80oz like it's nothing
> (and once, 110), and you kept moving through travel, sick weeks, and a full life — always honest with me
> about the hard parts. That's the whole thing, right there. This one's for you.*
> *— Coach Eric* ⛰️🤜🤛

### Footer
- *Summit Health* · go.summithealth.app · issued June 17, 2026
- Tiny: *Paired with your Summit bottle — stay hydrated, Hydration Hero.* 💧

---

## Layout suggestion (wireframe)

```
┌────────────────────────────────────────────┐
│  ⛰ SUMMIT            SUMMIT TRAIL REPORT     │  ← header band (summit-forest)
│                                              │
│            J U L I E   D I L L O N           │
│       Founding Summiter · since Jan 10       │
│                                              │
│              ╭──────────────╮                │
│              │   GOLD SEAL   │   ← award      │
│              │ Hydration Hero│                │
│              ╰──────────────╯                │
│                                              │
│   23wks      58         75        42/57       │  ← hero stats
│   on Summit  workouts   activedays 80oz goal  │
│                                              │
│   "I need a better way to track my water."   │  ← hydration story + viz
│   ░░▓▓▓▓▓▓▓▓▓▓ 80oz line ▓▓▓▓▓▓▓ (trend)      │
│                                              │
│   [ short journey paragraph ]                │
│                                              │
│   ┌ Coach's note (handwritten feel) ───────┐ │
│   │  Julie — you were one of the first...  │ │
│   │                        — Coach Eric ⛰  │ │
│   └────────────────────────────────────────┘ │
│   Summit Health · go.summithealth.app        │  ← footer
└────────────────────────────────────────────┘
```

---

## Stats — CONFIRMED from the DB (pulled 2026-06-17)
- Joined: **Jan 10, 2026** → **23 weeks** active.
- Workouts completed: **58**.
- Active days (distinct days with a log): **75**.
- Water: logged **57** days, hit the 80oz goal on **42** (74%), peak **110oz**, best week **97oz/day avg**
  (week of Apr 6). Overall daily average across all logged days: **77oz** (just under goal — lead with the
  74% hit-rate and the 97oz best week, which are the flattering, true framing).
- Formal weekly reflections in `weekly_reflections`: only **3** — so DON'T claim "15 weekly check-ins." Her
  weekly check-in conversations happened over SMS (not stored in that table); use **75 active days** as the
  engagement stat instead. (Honest > inflated.)

## Notes for the builder
- Keep it to **one page**. Restraint is the brand.
- The gold award seal is the single focal point — everything else supports it.
- This is a template: parameterize name, dates, stats, award title, and the coach note so the next user's
  Trail Report is a data swap, not a redesign.
