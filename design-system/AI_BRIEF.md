# Summit Design System — AI Brief

> Drop this file into a Claude Desktop chat (or paste its contents) before asking it to design or build artifacts for Summit. Self-contained: Claude can produce on-brand HTML, React, or static prototypes from this file alone.

---

## 1. Identity

**Summit Health** — habit coaching platform with SMS, AI, Stripe subscriptions, and 4-week challenges.

**Aesthetic:** "Rich Nature-Tech." Crisp whites + vibrant greens sampled from mountain artwork. Bold expressive typography. Tactile, satisfying interactions. Fluid open-canvas layouts, not card-heavy containers.

**Brand keywords:** Ascent · Clarity · Sustainable · Growth · North Star.

**Brand promise:** uplifting, positive regard, wholeness, clarity, sustainable. Never guilt-trippy, never streak-pressure, never "you should."

---

## 2. Color tokens (use these exactly — no ad-hoc colors)

### Primary Summit palette
| Token | Hex | Usage |
|---|---|---|
| `summit-lime` | `#A3E635` | High-energy CTA accent (sparingly) |
| `summit-emerald` | `#10B981` | Primary CTA, active states, focus rings, checkmarks |
| `summit-moss` | `#059669` | Secondary accent, hover states, links, meta labels |
| `summit-pine` | `#065F46` | Mid-shade accent |
| `summit-forest` | `#022C22` | Primary text (sophisticated alternative to black) |
| `summit-sage` | `#D1FAE5` | Soft UI backgrounds, tag fills, subtle dividers |
| `summit-mint` | `#F0FDFA` | Page background (when not white) |

### Emerald scale (for tints)
50 `#ECFDF5` · 100 `#D1FAE5` · 200 `#A7F3D0` · 300 `#6EE7B7` · 400 `#34D399` · 500 `#10B981` · 600 `#059669` · 700 `#047857` · 800 `#065F46` · 900 `#064E3B` · 950 `#022C22`

### Grays
50 `#F9FAFB` · 100 `#F3F4F6` · 200 `#E5E7EB` · 300 `#D1D5DB` · 400 `#9CA3AF` · 500 `#6B7280` · 600 `#4B5563` · 700 `#374151` · 800 `#1F2937` · 900 `#111827`

### Semantic
- **Surface base** `#FFFFFF` (cards) · **Page** `#F0FDFA` (mint) · **Overlay** `rgba(0,0,0,0.5)`
- **Text primary** `#064E3B` (forest variant for headlines) · **Body** `rgba(6,78,59,0.8)` · **Muted** `rgba(6,78,59,0.5)`
- **Border subtle** `#D1FAE5` · **Border default** `#E5E7EB` · **Focus ring** `#10B981`
- **Success** `#10B981` · **Warning** `#F59E0B` · **Error** `#EF4444` · **Info** `#3B82F6`

**Forest on white = 9.5:1 contrast (AAA).** All combos must meet WCAG AA minimum.

---

## 3. Typography

**Font family:** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Sizes
| Token | px | Use |
|---|---|---|
| `xs` | 12 | All-caps meta labels, small footnotes |
| `sm` | 14 | Secondary text, helper text |
| `base` | 16 | Standard body |
| `lg` | 18 | Vision statements, lead body |
| `xl` | 20 | Large body |
| `2xl` | 24 | H3, card headers |
| `3xl` | 30 | H2, section headers |
| `4xl` | 36 | Large H1 |
| `5xl` | 40 | H1, page titles |
| `6xl–8xl` | 48–72 | Display / hero |

### Weights
`400 normal` · `500 medium` · `600 semibold` · `700 bold` · `800 extrabold`. Headlines lean **600–800**, body 400, labels 600.

### Line heights
Display `1.1` · H1 `1.2` · H2 `1.3` · H3 / meta `1.4` · body `1.6` · prose `1.7`.

### Treatments
- **Meta labels:** uppercase, letterspaced `0.08em`, weight 600, size 12, color `summit-moss`. Used as eyebrow text above titles.
- **Editorial run-in:** uppercase letterspaced `0.2em`, weight 700, small size (10–12), color moss — for masthead-style metadata (e.g. `WEEK 1 OF 4 · ENERGY MASTERS`).
- **Pull-quote:** giant Times Roman Bold `"` (Georgia is fine fallback) in `summit-emerald`, paired with a vision statement at 18–22px in semibold forest.

---

## 4. Layout, spacing, radius, shadow

- **Spacing scale (rem):** 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6 — i.e. 4-px base.
- **Container widths:** narrow 640 · default 768 · wide 1024 · max 1280.
- **Page padding:** 16–24px mobile, 40–56px desktop.
- **Section gap:** 48–64px between major blocks.

### Border radius
none · `sm 2` · `default 4` · `md 6` (inputs) · `lg 8` (buttons, tags) · `xl 12` (cards) · `2xl 16` (large cards, modals) · `full 9999` (pills, circles).

### Shadow
- `sm` `0 1px 2px 0 rgba(0,0,0,0.05)` — subtle card
- `DEFAULT` `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)`
- `md` `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`
- `lg` `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` — modals
- `focus` `0 0 0 3px rgba(16,185,129,0.4)` — focus rings (emerald 40% alpha)

---

## 5. Component catalog (available in `@summit/design-system`)

When prototyping, use the established patterns below. Don't invent new component shapes.

| Component | Variants / props | Notes |
|---|---|---|
| **Button** | `primary` `secondary` `ghost` `danger` `link` · `shape: pill\|rounded` | Pill is the default "Summit feel." Hover scale `1.02`, click `0.98`. |
| **Card** | `CardHeader` `CardTitle` `CardDescription` `CardContent` `CardFooter` | Floating shadow-based, minimal borders. Radius `xl` (12). |
| **Input / Textarea** | label, helperText, error | Emerald focus glow ring. Border `gray-300`, focus `emerald 500`. |
| **Checkbox** | `size: sm\|md\|lg` | Tactile circular fill with "pop" animation. 32px default, 44px `lg`. |
| **Tag** | `default` `success` `warning` etc. | Tone-on-tone, sage backgrounds for "default." |
| **Badge** | counts and statuses | Smaller and bolder than Tag. |
| **Modal** | header, content, footer | Radius `2xl`, shadow `lg`, backdrop `overlay`. |
| **Toggle / ToggleButtonGroup** | binary or multi | |
| **Select / RadioSelect** | dropdown or visual radio cards | |
| **Banner** | `info` `success` `warning` `error` | Full-width contextual banners. |
| **Navbar** | top nav | Forest text on white, sage divider underneath. |

If a needed component or token is missing, **propose adding to the design system** rather than hand-rolling a one-off.

---

## 6. Anti-patterns (do NOT do these)

- **No ad-hoc colors.** Never introduce amber, orange, blue, purple, etc. unless explicitly asked. Stay in the Summit palette + grays + semantic feedback colors.
- **No magic numbers.** Padding/margin/radius come from the spacing/radius scale.
- **No card-heavy nesting.** Open canvas > stacked card-in-card-in-card.
- **No raw HTML inputs/buttons** when the design-system component exists.
- **No streak / pressure language.** "5 day streak!" feels gym-app-y. Prefer "this week's notice," "what worked," "your ascent."
- **No unstyled black `#000`.** Headlines use `summit-forest` or `text-primary`.
- **No tiny touch targets.** Minimum 44×44px tappable area.
- **No animations >300ms.** Default 150–200ms ease-out. Respect `prefers-reduced-motion`.
- **No emojis as functional UI.** OK in marketing copy; not in component labels.

---

## 7. Voice & tone

| Do | Don't |
|---|---|
| "Let's climb this together" | "You should do this" |
| "Your North Star" | "Your goal" |
| "This week's ascent" | "Tasks to complete" |
| "What did you notice?" | "Did you complete it?" |
| "One small step at a time" | "Don't break your streak!" |

Always: assume good intent, celebrate progress (not metrics), people have answers within. Coach, not boss.

---

## 8. Quick-start template (HTML + Tailwind)

When building static prototypes (the "Claude Design" use case), this gets you 90% of the way there:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'summit-lime': '#A3E635',
            'summit-emerald': '#10B981',
            'summit-moss': '#059669',
            'summit-pine': '#065F46',
            'summit-forest': '#022C22',
            'summit-sage': '#D1FAE5',
            'summit-mint': '#F0FDFA',
          },
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
        }
      }
    }
  </script>
</head>
<body class="bg-summit-mint text-summit-forest font-sans">
  <main class="max-w-[768px] mx-auto px-10 py-12">
    <!-- Eyebrow meta -->
    <div class="text-xs font-semibold tracking-[0.08em] uppercase text-summit-moss">Your North Star</div>
    <!-- Headline -->
    <h1 class="mt-2 text-4xl font-bold leading-tight">"Wake up energized and ready for the day."</h1>
    <!-- Body -->
    <p class="mt-4 text-base leading-relaxed text-summit-forest/80">A week's ascent toward the summit you described.</p>
    <!-- Primary CTA (pill) -->
    <button class="mt-8 inline-block px-8 py-4 bg-summit-emerald text-white font-semibold rounded-full hover:bg-summit-moss transition">
      Begin your ascent
    </button>
  </main>
</body>
</html>
```

For pixel-perfect printable artifacts (e.g., the weekly tracker), see `summit-tracker/project/trackers/` in the Claude Design bundle — those use the same palette and typography.

---

## 9. Output rules for prototypes

When asked to build a prototype:

1. **Single self-contained HTML file** unless told otherwise. CDN Tailwind, Google Fonts Inter, no build step.
2. **Use the exact hex values** from §2. Don't paraphrase ("a teal green") — copy hex.
3. **Use Inter** with weights 400/500/600/700/800. Don't substitute system fonts unless absolutely necessary.
4. **Prefer `summit-*` Tailwind color classes** (defined in the template) over raw hex in markup, so values stay consistent.
5. **No external images** unless provided — use CSS-drawn shapes, SVG, or text-based brand marks.
6. **Print-ready when relevant:** for printable PDFs, use `@media print` and `@page { size: letter; margin: 0; }`. Page dimensions: 8.5×11" = 816×1056px @ 96dpi (or 612×792 points @ 72dpi).
7. **One artifact per file.** If multiple variants requested, separate files (`v1-classic.html`, `v2-editorial.html`).
8. **Caption every artifact** with one sentence describing the core idea, so iteration is fast.

---

## 10. Reference files in this repo

- `design-system/README.md` — human-facing design system docs
- `design-system/tokens/colors.ts` `typography.ts` `spacing.ts` — TypeScript token sources of truth
- `design-system/tokens/tailwind.preset.js` — Tailwind preset that mirrors all tokens
- `design-system/components/` — React component implementations (study these when building React)
- `design-system/styles.css` — base styles, CSS variables
- `design-system/stories/` — Storybook foundations (`Colors`, `Typography`, `Spacing`, `Layout`) and guidelines (`Brand`, `Voice`, `Accessibility`, `Motion`)

If working in Claude Code locally, prefer reading the actual token files for ground truth. If working in Claude Desktop without filesystem access, this brief is sufficient.
