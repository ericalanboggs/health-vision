# GLP-1 Persona Page — Content

> Written 2026-11-04, mapped from Eric's "GLP-1 Coaching Program: Core
> Elements" framework (pulled from a GLP-1 Coaching Course he completed) onto
> Summit's Understand/Stack/Believe model. Full plan and reasoning:
> `/Users/ericboggs/.claude/plans/floofy-beaming-feather.md` (local plan file,
> not checked in) — this doc is the durable copy.
>
> **Status:** Eric is taking this into Figma to iterate with another agent.
> When he brings the frame back, read it and build
> `summit-web/src/data/personas.ts` (new `glp-1` entry) +
> `summit-web/src/pages/use-cases/glp-1.astro` (static route, mirrors
> `burnout.astro`).

## The decision this content is built on

This is the fourth and final Tier-2 persona page — Eric's call, 2026-11-04:
"this is the last one." `STRATEGIC_DIRECTION.md` §4.2 was amended the same
day to carve out this one exception and close the hold again after it.

**This page funnels to the discovery call, not the $12 app trial.** The
three live personas (burnout, postpartum, warning-signs) all point at
`hero.ctaLabel: 'Start free for 14 days'` and share a generic five-step
app-onboarding `steps` block (Vision → The Climb → Daily nudges → Weekly
reflection → Basecamp). GLP-1 content doesn't fit that: scope agreements
with a prescriber, dose-aware symptom tracking, a coach making judgment
calls about what's safe during a dose step — a self-serve app trial can't
carry that responsibly. `hero.ctaLabel` is "Set up a discovery call,"
`trust` items are coaching-appropriate, and `steps` is rebuilt as three
(Understand / Stack / Believe) instead of the generic five.

## Content model (how the source framework maps to Understand/Stack/Believe)

- **Understand** = the framework's On-ramp (medication intake, scope
  agreement, vision, baseline, risk screen) + one real quick win banked
  immediately — a protein-first bite, a water-bottle cue. Not the full
  guideline target yet; that's Stack. Eric's steer: Understand should bank a
  real win, not just intake and assessment.
- **Stack** = the framework's Active phase / habit pillars — protein, water,
  fiber, movement, strength, one sleep/stress/alcohol/connection pick per
  cycle — read as a sequence building toward full guideline targets. This is
  where the bulk of "tapering up" belongs, per Eric's explicit steer. The
  side-effect symptom log runs underneath as the Stack-phase feedback
  signal, same logic as "stack what works, adjust what doesn't," just using
  symptom data instead of a habit result.
- **Believe** = the framework's Plateau + Off-ramp/maintenance, combined.
  Reuses existing `/coaching` language almost directly: "the voice that says
  you'll quit again shows up right on schedule," "evidence of progress."
  The sharpest line in the whole mapping: the off-ramp's habit audit
  ("which habits run without the drug's help") mirrors the existing FAQ's
  "independence, not ongoing dependence on a coach." Same underlying model,
  applied twice — once to the drug, once to the coaching relationship. Kept
  as an explicit line in the Believe step's bullets.
- **Cross-cutting, not a step**: medication check every session, daily
  touchpoints (the app, between sessions), red-flag referral, scope
  guardrails. Lives in `mechanism` and `boundary`, not forced into a phase.

**Guardrails this content was written against** (`STRATEGIC_DIRECTION.md`
§7): claims stay at habit mechanics and coordination, never at weight,
muscle, or side-effect outcomes, in Summit's own voice. No specific drug
brand named anywhere (the source framework stays generic to "GLP-1" too).
The `boundary` field carries the actual safety/scope line — this is the one
sentence on the page worth a second read before it ships.

## The content (Persona-shaped, matches `src/data/personas.ts` field names)

```ts
{
  slug: 'glp-1',
  seoTitle: 'GLP-1 Coaching: Build Habits That Last | Summit Health Coaching',
  seoDescription:
    'Board certified coaching for people on a GLP-1, built around the habits that hold before, during and after. Works alongside your prescriber, not instead of them.',
  hero: {
    eyebrow: 'For GLP-1 users building the habits underneath',
    title: 'Your GLP-1 is doing its job. The habits that outlast it are still yours to build.',
    body: 'Coaching for people on a GLP-1 who want a real plan for the protein, the movement, and the plateau nobody warns you about. Twelve weeks, 1:1, built around where you are in your prescription, not a generic program. Your prescriber handles the medication. I handle what happens around it.',
    ctaLabel: 'Set up a discovery call',
    trust: ['Works with your prescriber', 'Board certified coach', 'No judgment', 'Cancel anytime'],
  },
  pattern: {
    eyebrow: 'The gap',
    title: 'You started the medication. Nobody handed you the rest of the plan.',
    points: [
      'The appetite dropped. Nobody told you what to actually eat instead, or how much protein you actually need.',
      'Every dose step brings new side effects, and you’re tracking them alone.',
      'The scale is moving. You have no idea if the muscle is going with it.',
      'Somewhere around month nine, the number stops moving. Nobody warned you that’s normal.',
      'And underneath all of it: what happens if you ever come off.',
    ],
    punch:
      'The medication changes your appetite. It was never going to teach you what to eat, how to move, or what to do when it stops working the way it did in month one. That part was always going to be coaching.',
  },
  mechanism: {
    title: 'Built around your prescription, not instead of it.',
    lede: 'A board certified coach who stays inside his lane, and knows exactly where that lane ends.',
    paragraphs: [
      'Your prescriber handles the dose, the side effects that need a clinical answer, and anything that needs their judgment. I handle the habits: the protein, the movement, the plateau, and the plan for after, built around where you actually are in your prescription, not a generic 12-week template.',
      'We check in on the medication every session, not because I’m managing it, but because it changes what’s realistic that week. A dose step week looks different from a steady week. The habits adjust. You don’t have to explain that to someone starting from zero.',
    ],
  },
  boundary:
    'Summit is habit coaching, not medical care. It does not prescribe, adjust, or advise on GLP-1 medications, dosing, or side effects that need a clinical answer. That’s your prescriber’s call, always. If something feels seriously wrong, stomach pain that won’t quit, can’t keep fluids down, signs of low blood sugar, talk to your provider first. This coaching picks up around the medication. It never replaces the person managing it.',
  // testimonial: deliberately unset. Persona.testimonial pulls from site.ts's
  // TESTIMONIALS (app-pilot users — Julie, Karin, Tim, AJ, Jesse), none of
  // whom speak to GLP-1 themes. The tightest real match is Suze, from
  // coaching.ts's QUOTES (1:1 coaching clients): "increased my muscle mass,
  // but also my confidence" — speaks directly to the muscle-loss fear this
  // page names. But Testimonials.astro only reads the app-pilot list. Resolve
  // at build time: either leave unset (falls back to Julie, harmless but
  // generic) or give PersonaPage.astro an explicit way to pull one coaching
  // quote for this page specifically.
  steps: [
    {
      step: 'Understand',
      title: 'Start where you actually are.',
      body: 'Which medication, what dose, how long you’ve been on it. What you want beyond the number on the scale. One small habit you can start this week, no matter what step you’re on.',
      bullets: ['Scope split: you keep your prescriber, I handle the habits', 'One real win in week one', 'No generic protocol'],
    },
    {
      step: 'Stack',
      title: 'Build toward the real targets, one at a time.',
      body: 'Protein first, then more. Movement, scheduled around the week you actually have. Strength, even if it’s two ten-minute sessions. We add one layer at a time, and track how your body’s handling each dose step along the way.',
      bullets: ['Protein, movement and strength, stacked in order', 'A symptom log tied to your dose calendar', 'Adjust what isn’t working, keep what is'],
    },
    {
      step: 'Believe',
      title: 'For the plateau, and for after.',
      body: 'Around month nine, the number usually stops moving. We name that before it happens, and shift the goal to holding what you built. If you ever come off the medication, we start that conversation early, not the week you stop.',
      bullets: ['A plan for the plateau, named in advance', 'A real off-ramp, not a cliff', 'Habits built to run without the medication, or without me'],
    },
  ],
  guide: {
    slug: 'glp-1-guide',
    name: 'The GLP-1 Habit Starter',
    heading: 'Not ready for a call? Take the guide.',
    body: 'The same starting point, on paper. Where you are in your prescription, one real habit to start this week, and what to watch for as your dose changes. No email required.',
    pdf: '/freebies/glp-1-guide.pdf', // PLACEHOLDER — file doesn't exist yet. Build before launch or the link 404s.
  },
  capture: {
    enabled: false,
    heading: 'Get it in your inbox',
    body: 'We’ll email you the guide and a short series on making it stick.',
  },
  thread: [
    { from: 'summit', body: 'Dose step today, right? How’s your stomach handling it so far?', time: '9:10 AM' },
    { from: 'user', body: 'A little queasy. Skipped breakfast.', time: '9:14 AM' },
    { from: 'summit', body: 'Normal for step week. Small protein when you can stomach it beats nothing. We’ll keep movement light today.', time: '9:16 AM' },
    { from: 'user', body: 'Ok. Walk later instead of the gym.', time: '9:18 AM' },
  ],
}
```

## When Eric brings the Figma frame back

1. Read the frame, translate into `src/data/personas.ts` (new `glp-1` entry
   in `PERSONAS`) and `src/pages/use-cases/glp-1.astro` (mirrors
   `burnout.astro`: `getPersona('glp-1')` → `PersonaPage.astro`).
2. Resolve the `testimonial` mismatch (above) and the guide PDF (build it or
   stub the field).
3. Flip `site.ts`'s `USE_CASE_MENU` GLP-1 card: `comingSoon: false`, add
   `href: '/use-cases/glp-1'`.
4. Build, verify in browser (desktop + mobile), no console errors, no
   outcome-claim language slipped in anywhere.
