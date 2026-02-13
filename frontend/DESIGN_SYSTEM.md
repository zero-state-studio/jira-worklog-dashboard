# Design System

**Last Updated:** February 12, 2026
**Version:** 2.0 (Complete Redesign)
**Philosophy:** Functional Density

---

## Overview

The JIRA Worklog Dashboard uses an enterprise-grade design system inspired by **Linear, Stripe, and Metabase**. The design prioritizes **high information density, professional aesthetics, and consistency** over decorative elements.

### Core Principles

1. **Functional Density** - Maximize information per viewport, compact spacing
2. **Flat Design** - No gradients, no glass morphism, minimal shadows
3. **Single Accent** - One primary color (#2563EB blue), semantic colors for status only
4. **Design Tokens Only** - All values from CSS variables, zero hardcoded values
5. **Component Library** - 8 core components, reusable, TypeScript type-safe

### Key Metrics

- **Max text size:** 24px (text-2xl) - never larger
- **Body text:** 14px - default for all content (not 16px!)
- **Table text:** 13px - optimized for data density
- **Table row height:** 36px - compact but readable
- **Border radius:** Max 8px - professional, not playful
- **Shadows:** Only on modals/dropdowns, never on cards

---

## Color Palette

All colors are defined in `src/styles/design-tokens.css` and referenced via CSS variables.

### Surface Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | #FAFAFA | Page background (subtle off-white) |
| `--color-surface` | #FFFFFF | Cards, panels (pure white) |
| `--color-surface-secondary` | #F4F4F5 | Nested cards, subtle backgrounds |
| `--color-surface-hover` | #F4F4F5 | Interactive surface hover state |
| `--color-surface-active` | #EFF6FF | Active/selected state |

### Border Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-border` | #E4E4E7 | Default border (cards, dividers) |
| `--color-border-strong` | #D4D4D8 | Strong border (emphasis) |
| `--color-border-focus` | #2563EB | Focus state (inputs, interactive) |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | #18181B | Headings, body text |
| `--color-text-secondary` | #52525B | Labels, descriptions |
| `--color-text-tertiary` | #A1A1AA | Metadata, captions |
| `--color-text-inverse` | #FFFFFF | Text on dark backgrounds |

### Accent Colors (Primary Brand)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-accent` | #2563EB | CTA buttons, links, primary actions |
| `--color-accent-hover` | #1D4ED8 | Accent hover state |
| `--color-accent-subtle` | #EFF6FF | Subtle background, hover states |
| `--color-accent-text` | #1E40AF | Accent text on light backgrounds |

**Rule:** This is the ONLY accent color. No purple, no teal, no multi-color themes.

### Semantic Colors (Status)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | #16A34A | Completed, approved, positive |
| `--color-success-subtle` | #F0FDF4 | Success background |
| `--color-warning` | #D97706 | Pending, attention needed |
| `--color-warning-subtle` | #FFFBEB | Warning background |
| `--color-error` | #DC2626 | Failed, critical, destructive |
| `--color-error-subtle` | #FEF2F2 | Error background |

**Use ONLY for status indicators** (Badge component). Do not use for branding or decoration.

---

## Typography

### Font Families

- **Sans-serif:** DM Sans (primary font for all UI)
- **Monospace:** JetBrains Mono (numbers, metrics, code, currency)

### Type Scale

| Token | Rem | Px | Usage |
|-------|-----|----|----|
| `--text-xs` | 0.6875rem | 11px | Metadata, tiny labels |
| `--text-sm` | 0.8125rem | 13px | Form labels, table text |
| `--text-base` | 0.875rem | **14px** | Body text (DEFAULT) |
| `--text-lg` | 1rem | 16px | Section headings, emphasized text |
| `--text-xl` | 1.25rem | 20px | Card titles, modal headings |
| `--text-2xl` | 1.5rem | **24px** | Page titles, primary headings (MAX) |

**Critical Rules:**
- ❌ Never use text-3xl (30px) or larger in the application
- ✅ Body text is 14px (NOT 16px like most designs)
- ✅ Tables use 13px (text-sm) for high density
- ✅ Numbers use font-mono (JetBrains Mono)

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--leading-tight` | 1.25 | Headings |
| `--leading-normal` | 1.5 | Body text |
| `--leading-relaxed` | 1.75 | Long-form content |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Labels, emphasized text |
| `--font-semibold` | 600 | Headings, strong emphasis |
| `--font-bold` | 700 | Rare, only for high emphasis |

---

## Spacing System

Based on a **4px grid**. Use Tailwind classes that map to design tokens.

| Token | Rem | Px | Tailwind | Usage |
|-------|-----|----|----|-------|
| `--space-1` | 0.25rem | 4px | `p-1`, `m-1` | Minimal spacing |
| `--space-2` | 0.5rem | 8px | `p-2`, `m-2` | Compact spacing |
| `--space-3` | 0.75rem | 12px | `p-3`, `m-3` | Standard tight spacing |
| `--space-4` | 1rem | 16px | `p-4`, `m-4` | Standard spacing (DEFAULT) |
| `--space-5` | 1.25rem | 20px | `p-5`, `m-5` | Comfortable spacing |
| `--space-6` | 1.5rem | 24px | `p-6`, `m-6` | Generous spacing |
| `--space-8` | 2rem | 32px | `p-8`, `m-8` | Section spacing |
| `--space-12` | 3rem | 48px | `p-12`, `m-12` | Large section spacing |

**Rules:**
- ✅ Use p-4 or p-6 for card padding (16px or 24px)
- ❌ Avoid p-8, p-10, p-12 on regular cards (too spacious)
- ✅ Empty states can use p-6 (24px)
- ✅ Section gaps: 16-24px between major sections

---

## Borders & Shadows

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Inputs, tags, small buttons |
| `--radius-md` | 6px | Cards, buttons (DEFAULT) |
| `--radius-lg` | 8px | Modals, large cards (MAX) |

**Rule:** Maximum 8px radius for enterprise UI. No 12px, 16px, or 24px radii (too rounded).

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.04) | Cards (subtle elevation) |
| `--shadow-md` | 0 2px 4px rgba(0,0,0,0.06) | Dropdowns, popovers |
| `--shadow-lg` | 0 4px 12px rgba(0,0,0,0.08) | Modals, overlays |

**Rules:**
- ✅ Cards: border + shadow-sm (subtle)
- ✅ Modals/Dropdowns: shadow-lg (elevated)
- ❌ Buttons: NO shadows (flat design)
- ❌ No colored glows, no heavy shadows

---

## Component Library

All components in `src/components/common/`. Import pattern:

```tsx
import { Button, Badge, Card, Input, Select, Modal, KpiBar, DataTable } from '@/components/common'
```

### Button

**Variants:** `primary`, `secondary`, `outline`, `ghost`
**Sizes:** `sm` (28px), `md` (32px), `lg` (36px)
**States:** `loading`, `disabled`

```tsx
<Button variant="primary" size="md" loading={isSaving}>
  Save Changes
</Button>
```

**Rules:**
- ❌ No gradients, no shadow-glow
- ✅ Flat design with hover transition
- ✅ Only ONE primary button per view

### Badge

**Variants:** `accent`, `success`, `warning`, `error`, `default`
**Pattern:** Dot + text (no pill background)

```tsx
<Badge variant="success">Active</Badge>
```

**Rules:**
- ❌ No pill/chip backgrounds
- ✅ Dot + text pattern only
- ✅ Use semantic colors (success, warning, error)

### Card

**Purpose:** Content container with flat design

```tsx
<Card className="p-6">
  Content here
</Card>
```

**Rules:**
- ✅ Border (1px) + shadow-sm
- ✅ Max radius 8px (--radius-lg)
- ❌ No shadow-lg on cards
- ❌ No glass morphism

### Input

**Props:** `label`, `error`, `type`, `placeholder`
**Height:** 36px (--input-height)

```tsx
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
/>
```

**Rules:**
- ✅ Consistent 36px height
- ✅ Built-in label and error display
- ✅ Design tokens only (no inline styles)

### Select

**Props:** `label`, `options`, `value`, `onChange`, `searchable`
**Features:** Keyboard navigation, search, consistent height

```tsx
<Select
  label="Status"
  options={statusOptions}
  value={selectedStatus}
  onChange={setSelectedStatus}
  searchable
/>
```

**Rules:**
- ✅ Height matches Input (36px)
- ✅ Searchable dropdown
- ✅ Keyboard accessible (↑↓ to navigate, Enter to select)

### Modal

**Sizes:** `sm` (400px), `md` (600px), `lg` (800px)
**Animation:** slide-up 200ms ease-out

```tsx
<Modal size="md" isOpen={isOpen} onClose={handleClose}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleSave}>Save</Button>
  </Modal.Footer>
</Modal>
```

**Rules:**
- ✅ shadow-lg allowed (intentional elevation)
- ✅ slide-up 200ms animation
- ✅ Backdrop with blur

### KpiBar

**Purpose:** Compact metrics row at top of pages
**Pattern:** Label + value (font-mono)

```tsx
<KpiBar metrics={[
  { label: 'Total Hours', value: '1,234', format: 'hours' },
  { label: 'Team Members', value: '8', format: 'number' },
  { label: 'Completion', value: '87%', format: 'percent' }
]} />
```

**Rules:**
- ❌ No gradients
- ✅ Values in font-mono (JetBrains Mono)
- ✅ High density layout

### DataTable

**Props:** `columns`, `data`, `sortable`, `pagination`
**Row Height:** 36px
**Text Size:** 13px (text-sm)

```tsx
<DataTable
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'hours', label: 'Hours', sortable: true, align: 'right' }
  ]}
  data={rows}
  sortable
  pagination
/>
```

**Rules:**
- ✅ Row height 36px (compact)
- ✅ Text 13px (high density)
- ❌ No zebra stripes
- ✅ Hover state on rows (150ms transition)

---

## Layout Components

### NewLayout (Main Wrapper)

**Sidebar:**
- Width: 220px (expanded) → 48px (collapsed)
- Icons: 16px
- Font: 13px
- Transition: 200ms ease

**Header:**
- Height: 48px
- Contains: Breadcrumbs, user menu
- Fixed position

**Content:**
- Padding: 24px (p-6)
- Max width: none (full viewport)

---

## Animations & Interactions

### Micro-interactions

All animations under **200ms** - subtle, not elaborate.

| Element | Animation | Duration | Notes |
|---------|-----------|----------|-------|
| Modal entrance | slide-up + scale(0.95→1) | 200ms | ease-out |
| Button hover | color transition | 150ms | ease |
| Table row hover | background color | 150ms | ease |
| Sidebar collapse | width transition | 200ms | ease |
| Tooltip | fade-in with 300ms delay | 100ms | ease |

**Rules:**
- ❌ No bounce, spring, or "playful" effects
- ❌ No elaborate loading animations
- ❌ No animations on scroll
- ✅ Subtle, functional, fast

---

## Do's and Don'ts

### Typography

| ✅ DO | ❌ DON'T |
|-------|----------|
| Use 14px for body text | Use 16px (too large) |
| Max 24px for headings | Use text-3xl (30px) or larger |
| Font-mono for numbers | Use sans-serif for metrics |
| text-sm (13px) for tables | Use text-base (14px) in tables |

### Colors

| ✅ DO | ❌ DON'T |
|-------|----------|
| Use CSS variables | Hardcode hex colors |
| Single accent (#2563EB) | Multiple accent colors |
| Semantic colors for status | Use status colors for branding |
| #FAFAFA for page background | Use pure white (#FFF) for page |

### Spacing

| ✅ DO | ❌ DON'T |
|-------|----------|
| p-4 or p-6 for cards | Use p-8, p-10, p-12 |
| Compact spacing (4px grid) | Large gaps between elements |
| 16-24px section gaps | 32-48px+ section gaps |

### Shadows

| ✅ DO | ❌ DON'T |
|-------|----------|
| shadow-sm on cards | shadow-lg on cards |
| shadow-lg on modals | Colored glow shadows |
| Minimal, subtle shadows | Heavy drop shadows |

### Components

| ✅ DO | ❌ DON'T |
|-------|----------|
| Use Button component | Inline button styles |
| Use Badge for status | Custom badge classes |
| Use DataTable for lists | Custom table markup |
| Use Modal component | Custom modal divs |

---

## File Structure

```
frontend/src/
├── styles/
│   ├── design-tokens.css        # Single source of truth
│   └── index.css                # Global styles + utilities
├── components/
│   └── common/
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── KpiBar.tsx
│       ├── DataTable.tsx
│       ├── index.ts             # Re-exports all components
│       └── README.md            # Component API docs
├── pages/
│   ├── NewLayout.tsx            # Main layout wrapper
│   ├── NewDashboard.tsx         # Dashboard redesign
│   ├── Worklogs.tsx             # Worklog list
│   ├── NewBilling.tsx           # Billing redesign
│   └── NewTeams.tsx             # Teams redesign
└── DESIGN_SYSTEM.md             # This file
```

---

## References

- **Design Tokens:** `frontend/src/styles/design-tokens.css` (single source of truth)
- **Component API:** `frontend/src/components/common/README.md`
- **Initial Audit:** `frontend/REDESIGN_AUDIT.md`
- **Quality Review:** `frontend/QUALITY_REVIEW_COMPLETE.md`
- **Fix Patterns:** `frontend/FIX_PATTERNS.md`
- **CLAUDE.md:** Design System section for AI agents

---

## Migration Guide

### For Developers

When working on old pages, follow these patterns:

**1. Replace gradient buttons:**
```tsx
// ❌ Old
<button className="px-5 py-2 bg-gradient-primary shadow-glow">
  Save
</button>

// ✅ New
<Button variant="primary">Save</Button>
```

**2. Fix typography:**
```tsx
// ❌ Old
<h1 className="text-3xl bg-gradient-primary bg-clip-text text-transparent">
  {value}
</h1>

// ✅ New
<h1 className="text-2xl text-primary font-mono">{value}</h1>
```

**3. Replace glass-card:**
```tsx
// ❌ Old
<div className="glass-card p-8">Content</div>

// ✅ New
<div className="flat-card p-4">Content</div>
```

**4. Use Input component:**
```tsx
// ❌ Old
<div>
  <label className="block text-sm">Email</label>
  <input className="w-full px-4 py-2 bg-dark-700 border border-dark-600" />
</div>

// ✅ New
<Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
```

---

**Last Updated:** February 12, 2026
**Maintained by:** Frontend Team
**Questions?** Check `frontend/src/components/common/README.md` or CLAUDE.md
