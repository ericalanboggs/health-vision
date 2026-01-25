# Design System Integration Testing Plan

Testing the Summit Design System across all pages systematically.

## Testing Approach

For each page, we'll:
1. **Audit** - Document current components and styles
2. **Map** - Identify which design system components to use
3. **Migrate** - Replace with Summit components
4. **Test** - Verify functionality, responsive behavior, and accessibility
5. **Review** - Check against design principles

## Page Inventory & Priority

### Phase 1: Core User Experience (Start Here)
- [ ] **Dashboard** (`/dashboard`) - Main landing page, highest visibility
- [ ] **Habits** (`/habits`) - Core habit tracking interface
- [ ] **Vision** (`/vision`) - Vision statement display/edit
- [ ] **Add Habit** (`/add-habit`) - Habit creation form

### Phase 2: Onboarding & Setup
- [ ] **Landing Page** (`/`) - First impression for new users
- [ ] **Login** (`/login`) - Authentication page
- [ ] **Profile Setup** (`/profile-setup`) - Initial user configuration
- [ ] **Start** (`/start`) - Onboarding flow entry

### Phase 3: Secondary Features
- [ ] **Profile** (`/profile`) - User profile management
- [ ] **Schedule Habits** (`/schedule-habits`) - Habit scheduling
- [ ] **Reflection** (if exists) - Weekly reflection page

### Phase 4: Admin & Auxiliary
- [ ] **Admin** (`/admin`) - Admin dashboard
- [ ] **Admin User Detail** (`/admin/user/:id`) - User management

---

## Dashboard Migration Checklist

### Current State Audit

**Colors:**
- Background: `bg-gradient-to-b from-stone-50 to-amber-50`
- Cards: `bg-white` with stone text
- Icons: Blue, green, amber color variants

**Components:**
- Large clickable cards (Vision, Habits, Reflection)
- Welcome section with pilot info
- TopNav component
- WelcomeModal

**Typography:**
- Headers: `text-2xl font-bold text-stone-800`
- Body: `text-stone-600`
- Large text in cards

### Design System Mapping

| Current Element | Summit Component | Notes |
|----------------|------------------|-------|
| Page background | `bg-summit-mint` | Replace gradient |
| Card containers | `<Card>` | Use elevated variant |
| Card headers | `<CardTitle>` with `text-h2` | Bold, Summit Forest |
| Card descriptions | `<CardDescription>` | Secondary text |
| Icons with backgrounds | Custom wrapper + Lucide icons | Sage background, emerald icons |
| "View & Edit" links | `<Button variant="ghost">` with `rightIcon` | Arrow icon |
| Welcome section | `<Card variant="feature">` | Feature card style |
| Loading state | Use Summit colors | Keep simple |

### Migration Steps

#### Step 1: Update Color Scheme
```jsx
// OLD
<div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">

// NEW
<div className="min-h-screen bg-summit-mint">
```

#### Step 2: Replace Welcome Card
```jsx
// OLD
<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">

// NEW
<Card variant="feature" className="mb-6">
  <CardHeader>
    <div className="text-meta text-summit-moss">PILOT PROGRAM</div>
    <CardTitle>Welcome to Your Summit 🏔️</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-text-secondary">
      This is a 4-week pilot program...
    </p>
  </CardContent>
</Card>
```

#### Step 3: Replace Vision Card
```jsx
// OLD
<button className="w-full bg-white rounded-2xl shadow-lg p-8...">

// NEW
<Card
  interactive
  className="cursor-pointer"
  onClick={() => navigate('/vision?view=display')}
>
  <div className="flex items-start gap-4">
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-summit-sage">
      <Mountain className="h-8 w-8 text-summit-moss" />
    </div>
    <div className="flex-1">
      <CardHeader>
        <CardTitle className="text-h2">Your North Star</CardTitle>
        <CardDescription className="line-clamp-3">
          {visionData.visionStatement || "Create your health vision..."}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="ghost" rightIcon={<ArrowRight className="h-4 w-4" />}>
          {visionData.visionStatement ? 'View & Edit Vision' : 'Create Vision'}
        </Button>
      </CardFooter>
    </div>
  </div>
</Card>
```

#### Step 4: Replace Habits & Reflection Cards
Similar pattern to Vision card, using:
- `<Card interactive>`
- Summit color scheme (emerald/moss instead of green, sage backgrounds)
- Design system typography classes

#### Step 5: Update Typography
```jsx
// OLD: text-2xl font-bold text-stone-800
// NEW: text-h2 text-summit-forest

// OLD: text-stone-600
// NEW: text-text-secondary

// OLD: text-sm text-stone-600
// NEW: text-body-sm text-text-muted
```

### Testing Checklist

After migration, verify:

**Visual**
- [ ] Page background is Summit Mint (#F0FDFA)
- [ ] Cards have subtle shadows (no harsh borders)
- [ ] All text is Summit Forest or appropriate opacity
- [ ] Icons use Summit color palette
- [ ] Hover states show scale animation
- [ ] Focus states show emerald ring

**Typography**
- [ ] Headlines are bold and prominent
- [ ] Body text is readable with proper line height
- [ ] Hierarchy is clear (h2 > body > small text)

**Responsive**
- [ ] Mobile: Cards stack vertically
- [ ] Tablet: 2-column grid works well
- [ ] Desktop: Proper max-width centering
- [ ] Touch targets are 44px minimum

**Accessibility**
- [ ] Color contrast meets AA standards
- [ ] Focus visible on all interactive elements
- [ ] Screen reader: Card content is properly labeled
- [ ] Keyboard navigation works smoothly

**Functionality**
- [ ] All navigation links work
- [ ] Loading states display correctly
- [ ] Welcome modal still functions
- [ ] Data displays properly

---

## Testing Template for Other Pages

Use this template for each page:

### [Page Name] Migration

**Current Components:**
- List all current UI elements

**Design System Mapping:**
- Map each to Summit component

**Migration Steps:**
1. Color scheme update
2. Component replacements
3. Typography updates
4. Spacing adjustments

**Testing:**
- [ ] Visual verification
- [ ] Responsive check
- [ ] Accessibility check
- [ ] Functionality check

---

## Quick Reference

### Color Replacements
```
stone-50 → summit-mint
stone-100 → summit-sage
stone-600 → text-secondary
stone-800 → summit-forest
amber-50 → summit-mint (page bg)
green-100 → summit-sage
green-600 → summit-emerald
blue-100 → summit-sage
blue-600 → summit-moss
```

### Typography Replacements
```
text-2xl font-bold → text-h2
text-xl font-semibold → text-h3
text-base → text-body
text-sm → text-body-sm
uppercase tracking-wide → text-meta uppercase
```

### Component Imports
```jsx
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Checkbox,
  Input,
  Tag,
} from '@summit/design-system'
```

---

## Running Tests

### Visual Testing
```bash
# Start app with design system
npm run dev

# Compare pages side-by-side
# Before: main branch at localhost:5173
# After: design-system-integration branch at localhost:5174 (different port)
```

### Storybook Reference
```bash
npm run storybook
# Reference components at localhost:6006
```

### Screenshot Comparison
Take before/after screenshots:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

---

## Success Criteria

A page migration is complete when:
- ✅ Uses Summit color palette exclusively
- ✅ Uses design system components (no ad-hoc styling)
- ✅ Typography follows Summit scale
- ✅ Passes accessibility checks
- ✅ Maintains all functionality
- ✅ Responsive on all breakpoints
- ✅ Feels "aspirational" not "utilitarian"

---

## Notes & Learnings

Document any insights or challenges during migration:

-
-
