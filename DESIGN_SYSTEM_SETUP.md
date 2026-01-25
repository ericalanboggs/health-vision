# Design System Setup Complete ✅

The Summit Design System is now configured as a monorepo workspace!

## What Changed

### 1. Workspace Configuration
- Added `workspaces` to root `package.json`
- Design system is now `@summit/design-system` workspace package
- Dependencies are hoisted to root `node_modules` for efficiency

### 2. Tailwind Integration
- Root `tailwind.config.js` now imports Summit preset
- All Summit colors, typography, and utilities are available
- Legacy compass colors preserved for gradual migration

### 3. Styles Integration
- Root `src/index.css` imports design system base styles
- CSS custom properties available globally
- Summit font stack (Inter) applied automatically

## Usage

### Run Storybook (Design System Docs)
```bash
npm run storybook
```
Opens at http://localhost:6006

### Run Main App
```bash
npm run dev
```
Opens at http://localhost:5173

### Run Both Simultaneously
```bash
npm run dev:all
```
(Note: Requires `concurrently` package - install with `npm install -D concurrently`)

## Using Components in Your App

### Import Components
```jsx
import { Button, Card, Checkbox, Input } from '@summit/design-system'

function HabitCard() {
  return (
    <Card>
      <Checkbox label="Morning meditation" />
      <Button variant="primary">Complete</Button>
    </Card>
  )
}
```

### Use Tailwind Classes
All Summit tokens are available as Tailwind utilities:

```jsx
<div className="bg-summit-mint">
  <h1 className="text-h1 text-summit-forest">Welcome to Summit</h1>
  <p className="text-body text-text-secondary">Your health journey starts here</p>
  <button className="rounded-full bg-summit-emerald px-6 py-3 text-white hover:bg-summit-moss">
    Begin Your Ascent
  </button>
</div>
```

### Use Design Tokens Directly
```jsx
import { colors, typography, spacing } from '@summit/design-system/tokens'

const customStyles = {
  color: colors.summit.forest,
  fontSize: typography.fontSize['2xl'],
  padding: spacing.space[6],
}
```

## Summit Color Palette

| Variable | Hex | Tailwind Class |
|----------|-----|----------------|
| Summit Emerald | `#10B981` | `bg-summit-emerald` `text-summit-emerald` |
| Summit Moss | `#059669` | `bg-summit-moss` `text-summit-moss` |
| Summit Forest | `#064E3B` | `bg-summit-forest` `text-summit-forest` |
| Summit Sage | `#D1FAE5` | `bg-summit-sage` `text-summit-sage` |
| Summit Mint | `#F0FDFA` | `bg-summit-mint` `text-summit-mint` |

## Typography Classes

```jsx
<h1 className="text-display">Display Headline</h1>
<h1 className="text-h1">Page Title</h1>
<h2 className="text-h2">Section Header</h2>
<h3 className="text-h3">Card Header</h3>
<p className="text-body-lg">Large body text</p>
<p className="text-body">Standard body text</p>
<p className="text-body-sm">Small body text</p>
<span className="text-meta uppercase">Meta label</span>
```

## Component Examples

### Button Variants
```jsx
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>
<Button variant="link">Text Link</Button>
```

### Input with States
```jsx
<Input
  label="Email"
  placeholder="you@example.com"
  helperText="We'll never share your email"
/>

<Input
  label="Username"
  errorMessage="Username is already taken"
/>
```

### Checkbox for Habits
```jsx
<Checkbox
  label="Morning meditation"
  description="10 minutes"
  size="lg"
/>
```

### Cards
```jsx
<Card variant="default">Basic card</Card>
<Card variant="elevated">Elevated card with more shadow</Card>
<Card variant="outlined">Outlined card</Card>
<Card variant="feature">Feature card with gradient</Card>
```

## Migration Path

### Phase 1: New Features (Now)
Use Summit components for all new features:
- New habit tracking UI
- Vision editor redesign
- Dashboard refresh

### Phase 2: Gradual Refactor
Update existing pages one at a time:
1. Landing page
2. Dashboard
3. Habits page
4. Reflection page

### Phase 3: Cleanup
Remove legacy styles and compass colors.

## Next Steps

1. **Browse Storybook** — See all components and guidelines
2. **Try a Component** — Replace one button or card with Summit version
3. **Update a Page** — Redesign one page with new aesthetic
4. **Deploy Storybook** — Share docs at design.summithealth.app

## Resources

- **Storybook Docs:** http://localhost:6006 (after `npm run storybook`)
- **Design System README:** `design-system/README.md`
- **Component Source:** `design-system/components/`
- **Design Tokens:** `design-system/tokens/`

---

Questions? Check the Storybook docs or reach out to the team!
