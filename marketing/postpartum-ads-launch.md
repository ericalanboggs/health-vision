# Postpartum "Your Turn" — Meta ads launch

*Second paid funnel. Mirrors `meta-ads-launch.md` (men-40+). Audience: moms rebuilding
~6mo–3yr postpartum. Funnel: ad → `/yourturn` opt-in → guide PDF → postpartum drip →
14-day trial. Voice: `ERIC_VOICE.md`. Source copy themes: the landing + guide.*

## Campaign settings (reuse the men-40+ setup)
- **Account:** Summit Health Ads · **Pixel:** `1636185717449653` (already installed).
- **Objective:** Leads → **Conversion location: Website**.
- **Performance goal: Maximize number of landing page views** (NOT Lead conversions) —
  the health-data restriction blocks the Lead event for fine optimization, and the budget
  is small. Lead still tracked for reporting. Truth source = `freebie_leads` table.
- **Special Ad Category: OFF** (health/postpartum is NOT a special category — those are
  credit/employment/housing/politics only).
- **Audience:** Women, ~27–44, US. Broad — no/minimal interests (let the algorithm find them).
  Advantage+ min-age control caps at 25; set the age *suggestion* to 27–44.
- **Placements:** Advantage+ (automatic). Export creative **square 1080×1080 + portrait
  1080×1350** (founder video 9:16).
- **Budget:** ~$10/day, bounded (cap duration ~2 weeks like men-40+).
- **Campaign name / utm:** `postpartum-rebuild`. Each ad carries a distinct `utm_content`
  → landing folds it into `freebie_leads.source` as `postpartum-rebuild/<variant>`.

## ⚠️ Meta ad-policy watch-outs (this audience + topic draws extra review)
- **No "personal attributes."** Don't imply "you're an exhausted/struggling mom." Frame in
  general/first-person ("everyone needs something from you"), never "you are X." (Copy below
  is written to comply.)
- **No before/after body imagery.** No "bounce back," no weight/body-transformation visuals.
- Keep it warm and non-clinical. Expect a higher rejection rate; if rejected, soften and resubmit.

## Measurement
Cost per opt-in by `utm_content`, from `freebie_leads`:
`select source, count(*) from freebie_leads where source like 'postpartum-rebuild/%' group by source;`
Pair with per-ad spend from Ads Manager. Real read ~4–5 weeks out (cohort finishes the 17-day drip).

---

## Ad 1 — "This one's about you"  ·  `utm_content=validation`
**Format:** single image (square + portrait). **Visual:** warm, real, not stock-y — a quiet
mom's moment (coffee + a notebook, a short walk), or a sticky note that reads "your turn."
No bodies, no before/after.
**Primary text:**
> Everyone needs something from you. The baby, the job, the house, the people.
>
> Somewhere in there, your own health quietly fell off the list. This isn't about bouncing back — there's nothing to bounce back to. You're someone new now.
>
> It's simpler: five or ten minutes that are yours. Anything counts. I wrote a free 2-page guide for moms rebuilding — how to take your turn, starting from exactly where you are.

**Headline:** `This one's about you` · **Description:** `A free guide for moms rebuilding.`
**CTA:** Download · **URL:** `https://go.summithealth.app/yourturn?utm_campaign=postpartum-rebuild&utm_content=validation`

---

## Ad 2 — "Stop waiting for the calm week"  ·  `utm_content=method`
**Format:** single image (square + portrait). **Visual:** "PICK ONE" big on screen, or a short
handwritten list with one item circled. Minimal text.
**Primary text:**
> You don't need a 6-week plan you'll quit by Thursday. You need five minutes you'll actually repeat.
>
> Pick one small thing — a short walk, a real breakfast, lights out ten minutes earlier. Decide when. Run it a week. That's it.
>
> It's how habits actually form — just never explained to someone running on no sleep. Free 2-page guide for moms rebuilding: the method, made simple.

**Headline:** `Stop waiting for the calm week` · **Description:** `It's not a willpower problem.`
**CTA:** Download · **URL:** `https://go.summithealth.app/yourturn?utm_campaign=postpartum-rebuild&utm_content=method`

---

## Ad 3 — "Why I built this" *(the video one)*  ·  `utm_content=founder`
**Format:** the "Your Turn" founder video (script: `founder-video-scripts.md`) once filmed —
upload the raw MP4 native to Ads Manager. Until then, run a **still of Eric + the headline** as a
static (cheap way to test message vs. video).
**Primary text:**
> When I piloted Summit, I didn't know if it'd matter to moms. A few were in the group, so I watched.
>
> What surprised me was how little it took — five or ten minutes on you, with someone actually in your corner. It puts you first and asks for almost nothing.
>
> We say moms are heroes. Let's start treating them like it. Grab the free guide — it's yours.

**Headline:** `Why I built this` · **Description:** `A Mayo-certified coach, for moms rebuilding.`
**CTA:** Download · **URL:** `https://go.summithealth.app/yourturn?utm_campaign=postpartum-rebuild&utm_content=founder`

---

## Pre-launch checklist
- [ ] Build campaign `postpartum-rebuild` (Leads → Website → Maximize landing page views).
- [ ] Audience Women 27–44 US, broad; Advantage+ placements.
- [ ] 3 ads above, each with its `utm_content`, CTA Download, display label `summithealth.app`.
- [ ] Confirm each URL's `utm_content` differs (founder/method/validation) — the #1 duplication trap.
- [ ] Founder video: film → Vimeo (landing) + raw MP4 (ad) → set `POSTPARTUM_FOUNDER_VIDEO_URL` in the drip.
- [ ] Leave 3–4 days untouched after launch; judge by cost-per-opt-in from `freebie_leads`.
