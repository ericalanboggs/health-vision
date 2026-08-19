---
name: write-blog-post
version: 1.0.0
description: |
  Research, write, illustrate and publish a post to the Summit Health blog at
  summithealth.app/resources. Use when Eric says "write a post on X", "draft a
  blog post", "write an article about X", "add a post", or asks to update or
  illustrate an existing post. Handles the whole path: sourcing real research,
  drafting in Eric's voice, hero image, frontmatter, and the push that deploys.
---

# Write a Summit blog post

The blog lives in the **`summit-web`** repo (`/Users/ericboggs/CascadeProjects/summit-web`),
which is a sibling of `health-vision`. Posts are markdown in
`src/content/posts/`, deployed by Vercel on push to `main`.

**`cd` into `summit-web` first.** Every command below assumes that.

## The workflow

### 1. Research before drafting

This is the step that matters most, and the one Eric will notice if it's skipped.

- Find **real, checkable sources**. Peer-reviewed work, PubMed Central,
  government or major-institution data. Not content-marketing blogs.
- **Never invent a statistic.** If you can't source a number, cut the claim
  rather than soften it into vagueness.
- State numbers conservatively. If a study says 40–60%, don't write "over half".
- Every source goes in the `sources` frontmatter array — it renders as a
  numbered citation list at the bottom of the post.
- Verify each URL resolves before including it.

Existing posts model this well. `why-wellness-apps-fail-before-they-start.md`
cites four sources inline and in frontmatter.

### 2. Draft in Eric's voice

Read **`health-vision/ERIC_VOICE.md`** before writing. The essentials:

- Short sentences, one idea each. Hedge, then land.
- Plain words. A flair for the dramatic, rationed to one spike.
- **No em dashes.** Use commas, periods, or restructure.
- No aphoristic mic-drop fragments. When a point lands it's the end of a
  walk-through, not a slogan. This is the tell Eric flags most often.
- No patronizing positivity. Uplift is earned by "this is doable", never by
  cheerleading.
- Name the mechanism when there's a real term for it (habit stacking), then
  move on. No academic throat-clearing.

Length: the existing posts run 350–750 words. Longer is fine if it earns it.

### 3. Hard guardrails

From `health-vision/marketing/STRATEGIC_DIRECTION.md` §7. These are
non-negotiable and apply to every word:

- **Claims stay at adherence and habit mechanics. Never specific health
  outcomes.** No "lower your cholesterol", no "lose weight", no implied
  clinical result. This is easiest to violate on anything touching medication,
  labs, or weight.
- **"Mayo Clinic trained."** Never "certified", never "board-certified" —
  NBHWC results are still pending.
- **"Coaching, not medical advice"** where method content warrants it.
- Retired language, never reintroduce: "5 minutes a day", "reset boundaries",
  "redefine what health means", any transformation framing. The direction is
  agency, not transformation.

### 4. Create the file

`src/content/posts/<slug>.md`. The slug becomes the URL:
`summithealth.app/resources/<slug>`.

```yaml
---
title: "Post title"
description: "Under 160 characters. The build fails without it."
publishDate: 2026-08-19
tags: ["habits", "sleep"]
persona: general        # burnout | postpartum | warning-signs | general
featured: false         # featured post leads the /resources index
draft: false            # true excludes from build, sitemap and RSS
sources:
  - title: "PubMed Central"
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC..."
---
```

The schema is `src/content.config.ts` and validates at build time — a missing or
over-long description **fails the build**. That guard exists because two Framer
template placeholders once went live on real posts, one of them about
"managing money".

**`persona` is not decoration.** It links the post to its `/use-cases/*` page and
back, which is the cluster structure that makes the blog compound. Set it
whenever the post genuinely speaks to one of the three personas.

### 5. Add a hero image

```bash
npm run image -- search "morning light bedroom"                  # browse Pexels
npm run image -- set <slug> 3822622 --alt "..."                  # Pexels ID/URL
npm run image -- set <slug> ~/Desktop/IMG_1234.jpg --alt "..."   # Eric's phone
```

Writes 1600w + 800w WebP and sets the frontmatter. Renders on the post, the
index cards, and as that post's `og:image`.

- **Always pass `--alt`.** Screen readers and Google both read it.
- **Show Eric candidates and let him pick.** Don't auto-select — generic stock
  imagery is precisely what the brand argues against.
- Eric's own phone photos are preferred when he has one.
- Pexels search needs `PEXELS_API_KEY` in `.env`. Local files don't.

### 6. Verify, then publish

```bash
npm run build     # schema violations fail here
npm run dev       # check it renders
git add -A && git commit && git push
```

Live in ~40 seconds.

## Gotchas

- **Restart `npm run dev` after adding a file that uses Tailwind utilities no
  other file uses.** The dev server's CSS pass misses brand-new utilities, which
  looks like a broken layout but builds fine. This has caused two false alarms.
- **Dates are UTC.** `formatDate` pins `timeZone: 'UTC'` because frontmatter
  dates parse as UTC midnight and would otherwise render a day early.
- Don't change a published post's slug without adding a redirect in
  `astro.config.mjs` — the URLs are indexed.

## Related

- Voice: `health-vision/ERIC_VOICE.md`
- Guardrails and positioning: `health-vision/marketing/STRATEGIC_DIRECTION.md`
- Repo overview: `summit-web/README.md`
