# Design Brief — `/lifestyle-changes` landing page visual polish

**For:** Claude Code (implementation)
**Target file:** `src/pages/LifestyleGuide.jsx` · **Route:** `/lifestyle-changes` (public)
**Status:** functional first draft, fully wired. This is a *visual* pass only.

---

## The ask

The page works and the message lands — but it's **copy-heavy and visually flat**:
it's a vertical stack of near-identical `Card`s with numbered circles. The job is to
**up-level it into a polished, modern landing page** that holds attention and converts,
without changing the message or breaking the funnel.

Think: the page a skeptical 40-something man lands on from a Meta ad and immediately
trusts. Most of that traffic is **mobile**, so design mobile-first.

## Hard guardrails — do NOT break these

1. **Design system only.** Use `@summit/design-system` components and color tokens
   (`summit-forest`, `summit-emerald`, `summit-sage`, `summit-mint`, `summit-lime`,
   `summit-moss`, `summit-pine`). No ad-hoc hex colors or one-off styled elements.
   (CLAUDE.md non-negotiable rule.)
2. **Voice is locked.** All copy follows `ERIC_VOICE.md`. You may tighten/restructure
   copy for layout, but don't change the voice or invent hype. When in doubt, keep the
   existing words and improve the *presentation*.
3. **Email-first conversion must stay primary.** The email capture (`CaptureBlock`) is
   the main action — it must stay visually dominant above the fold and repeat lower down.
   Do not add an ungated direct-download as the primary CTA (the email is the point).
4. **Don't touch the funnel wiring.** Leave intact: `FREEBIE_SLUG`, the
   `capture-freebie-lead` fetch, the `source`/utm capture, the `PDF_PATH` download,
   `TRIAL_URL`, the founder video embed (`FOUNDER_VIDEO_EMBED`), and all `trackEvent`
   calls (`freebie_page_viewed`, `freebie_lead_captured`, `freebie_download_clicked`).
   These power conversion tracking and the men-40+ ad test.
5. **Stays a single self-contained page** at the same route. No new deps without reason.

## The page today (sections, top → bottom)

1. Mint banner — "For men 40+ who were told to make 'lifestyle changes'…"
2. Hero — logo, H1, subhead, **email capture** (`CaptureBlock`)
3. Founder video (Vimeo embed)
4. The method — 4 steps, plain numbered circles
5. "Three things that keep it going" — 3 items in one card
6. Clinical guardrail — single checkmark line
7. Worksheet teaser + **second email capture**
8. Footer CTA → Summit 14-day trial

## Polish opportunities (use judgment — these are the problems to solve, not a spec)

- **Hero:** give it real presence — a stronger visual anchor, better type scale/hierarchy,
  breathing room. It should feel like a designed hero, not a centered text block.
- **Break the "stack of identical cards" monotony.** Vary section rhythm, backgrounds,
  and alignment so the eye moves. Alternate full-bleed bands vs. contained cards, etc.
- **The 4-step method is the centerpiece** — make it *visual*. Icons or simple
  illustrations per step, a connected/stacked progression, numbers that feel designed.
  This is where copy-heaviness hurts most; turn prose into a scannable visual sequence.
- **Add light proof/trust.** The Framer source page
  (`summithealth.app/use-cases/lifestyle-changes`) uses concrete results
  ("-12 mg/dL LDL") and a real-guy testimonial. Borrow that energy if it fits — a
  tasteful result stat or quote builds trust for cold traffic. Keep it honest.
- **Mobile:** consider a sticky/persistent email-capture or CTA on scroll, since the
  capture is the whole goal and the page is long on a phone.
- **Polish the small stuff:** spacing scale, consistent iconography (the page already
  pulls from `@mui/icons-material`), button hierarchy, the worksheet teaser, the footer.

## Visual reference

- Match the look-and-feel of `summithealth.app/use-cases/lifestyle-changes` (the Framer
  page this funnel feeds into) — forest/emerald greens, clean type, generous white space,
  masculine-but-warm, not stock-y or corporate.

## Definition of done

- `npm run build` passes.
- Funnel wiring + all `trackEvent` calls intact; email capture still works end-to-end.
- Noticeably more polished and less copy-heavy on both mobile and desktop.
- Verify in-browser (the `browse`/`qa` tooling) at mobile + desktop widths before calling it done.
