# Summit Design System

The official design system for Summit Health — a "Nature-Tech" aesthetic for aspirational health experiences.

## Overview

Summit transforms from a utility-first pilot into an aspirational health platform with:
- **Crisp whites with vibrant greens** (moving from warm beige)
- **Bold, expressive typography** (headlines as design elements)
- **Tactile, energetic interactions** (satisfying animations)
- **Fluid, open canvas layouts** (ditching card-heavy containers)

**Brand Keywords:** Ascent • Clarity • Sustainable • Growth • North Star

## Quick Start

### View Documentation

```bash
npm run storybook
```

Open http://localhost:6006 to browse:
- Interactive component demos
- Foundation documentation (colors, typography, spacing, layout)
- Guidelines (brand, voice, accessibility, motion)

### Using in the Main App

The design system is configured as a workspace, so you can import directly:

```jsx
// Import components
import { Button, Card, Checkbox, Input } from '@summit/design-system'
import '@summit/design-system/styles.css'

// Import tokens (if needed directly)
import { colors, typography, spacing } from '@summit/design-system/tokens'

function MyPage() {
  return (
    <Card>
      <Checkbox label="Morning meditation" />
      <Button variant="primary">Complete Habit</Button>
    </Card>
  )
}
```

The Tailwind preset is already configured in the root `tailwind.config.js`, so all Summit colors, typography, and utilities are available:

```jsx
<div className="bg-summit-mint text-summit-forest">
  <h1 className="text-h1 text-summit-forest">Welcome to Your Summit</h1>
  <p className="text-body text-text-secondary">Start your ascent today</p>
</div>
```

## The Summit Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Summit Emerald** | `#10B981` | Primary CTA, high energy actions |
| **Summit Moss** | `#059669` | Secondary accent, hover states, links |
| **Summit Forest** | `#064E3B` | Primary text (sophisticated alternative to black) |
| **Summit Sage** | `#D1FAE5` | Soft UI, tag backgrounds, subtle alerts |
| **Summit Mint** | `#F0FDFA` | Page background (crisp, expansive feel) |

## Components

### Button
Primary, secondary, ghost, danger, and link variants. Pill-shaped with satisfying hover/click animations.

```jsx
<Button variant="primary" shape="pill">Begin Your Ascent</Button>
<Button variant="secondary">Learn More</Button>
<Button variant="ghost">Cancel</Button>
```

### Input & Textarea
Clean inputs with emerald focus glow. Supports labels, helper text, and error states.

```jsx
<Input
  label="Habit name"
  placeholder="e.g., 10 minute morning walk"
  helperText="Choose something small and sustainable"
/>
```

### Checkbox
Tactile circular checkboxes with a satisfying "pop" animation. 32px default size for optimal touch targets.

```jsx
<Checkbox label="Morning meditation" />
<Checkbox size="lg" label="30 minute walk" description="After lunch" />
```

### Tag & Badge
Tone-on-tone tags for categorization, badges for counts and status.

```jsx
<Tag>Health</Tag>
<Tag variant="success">Completed</Tag>
<Badge variant="primary">3</Badge>
```

### Card
Floating, shadow-based cards with minimal borders.

```jsx
<Card>
  <CardHeader>
    <CardTitle>Morning Routine</CardTitle>
    <CardDescription>Start your day with clarity</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Edit</Button>
  </CardFooter>
</Card>
```

## Design Tokens

All tokens are available for direct import:

```js
import { colors, typography, spacing, animation } from '@summit/design-system/tokens'

// Use in custom styles
const customStyle = {
  color: colors.summit.emerald,
  fontSize: typography.fontSize.h1,
  padding: spacing.space[4],
  transition: `all ${animation.duration.normal} ${animation.easing.out}`,
}
```

## Tailwind Utilities

All Summit tokens are available as Tailwind classes:

```jsx
// Colors
className="bg-summit-emerald text-white"
className="text-summit-forest"
className="border-summit-sage"

// Typography
className="text-h1 font-bold"
className="text-body text-text-secondary"
className="text-meta uppercase tracking-wide"

// Spacing
className="p-6 gap-4"
className="rounded-lg shadow-card"

// Animations
className="duration-normal ease-out"
className="hover:scale-[1.02]"
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Storybook dev server |
| `npm run build-storybook` | Build static Storybook site |
| `npm run build` | Build component library |

From the root directory:
```bash
npm run storybook              # Start design system Storybook
npm run build-storybook        # Build design system docs
```

## Architecture

```
design-system/
├── .storybook/          # Storybook config
├── tokens/              # Design tokens (colors, typography, spacing)
├── components/          # React components
│   ├── Button/
│   ├── Input/
│   ├── Checkbox/
│   ├── Tag/
│   └── Card/
├── stories/
│   ├── foundations/     # Colors, Typography, Spacing, Layout docs
│   └── guidelines/      # Brand, Voice, Accessibility, Motion docs
└── styles.css           # Base styles and CSS variables
```

## Guidelines

### Brand Principles
1. **Uplifting** — Encouraging language, vibrant greens, gentle animations
2. **Positive Regard** — Assume good intent, celebrate progress, no guilt
3. **Wholeness** — People have answers within; we support their journey
4. **Clarity** — Clean interfaces, bold typography, information hierarchy
5. **Sustainable** — Long-term thinking over quick fixes

### Voice & Tone
- **Do:** "Let's climb this together" • "Your North Star" • "This week's ascent"
- **Don't:** "You should do this" • "Your goal" • "Tasks to complete"

### Accessibility
- All color combinations meet WCAG AA standards
- Forest on White = 9.5:1 contrast (AAA)
- Minimum 44x44px touch targets
- Visible focus states on all interactive elements
- Respects `prefers-reduced-motion`

## Deployment

Build the static Storybook site for deployment:

```bash
npm run build-storybook
```

Output is in `storybook-static/` ready for deployment to `design.summithealth.app`.

## Contributing

1. Follow existing component patterns
2. Use design tokens for all values (no magic numbers)
3. Ensure WCAG AA accessibility compliance
4. Add Storybook stories with interactive controls
5. Update documentation as needed

---

Built with ❤️ for the Summit Health team
