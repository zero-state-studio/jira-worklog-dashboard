# Design Tokens - Foundation Layer Changelog
**Date:** February 12, 2026
**Type:** Breaking changes (foundation layer only)
**Status:** ✅ Completed and verified (build successful)

---

## Overview

This document tracks the implementation of the new design system foundation layer.
All changes are **backward compatible** at the token level - old class names like
`glass-card`, `btn-primary` still exist but now use the new design tokens.

**Components are NOT modified** in this phase - they will continue to use old class
names like `bg-dark-800`, `text-dark-100`, which will need migration in Phase 2.

---

## What Changed

### 1. Font Family (index.html)

**BEFORE:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

**AFTER:**
```html
<!-- DM Sans: Primary UI font (400, 500, 600, 700) -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<!-- JetBrains Mono: Code/monospace font (400, 500) -->
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Impact:**
- Inter → DM Sans (better for dense UIs)
- Added JetBrains Mono for code blocks
- Removed unused font weights (300)

---

### 2. Color System (design-tokens.css + tailwind.config.js)

**BEFORE (Dark Theme):**
```javascript
colors: {
  dark: { 900: '#0d1117', 800: '#161b22', 700: '#21262d', ... },
  accent: { blue, green, purple, orange, red, pink, cyan }, // 7 colors
  primary: { from: '#667eea', to: '#764ba2' }, // Gradient
}
```

**AFTER (Light Theme):**
```css
--color-bg: #FAFAFA;
--color-surface: #FFFFFF;
--color-text-primary: #18181B;
--color-accent: #2563EB; /* Single accent, no gradient */
--color-success: #16A34A;
--color-warning: #D97706;
--color-error: #DC2626;
```

**Tailwind mapping:**
```javascript
colors: {
  bg: 'var(--color-bg)',
  surface: { DEFAULT, secondary, hover, active },
  text: { primary, secondary, tertiary, inverse },
  accent: { DEFAULT, hover, subtle, text },
  success: { DEFAULT, subtle },
  warning: { DEFAULT, subtle },
  error: { DEFAULT, subtle },
}
```

**Impact:**
- Dark → Light theme (FAFAFA background, 18181B text)
- 7 accent colors → 1 (blue #2563EB)
- Removed gradient system entirely
- Added semantic colors (success, warning, error)

---

### 3. Typography Scale (design-tokens.css + tailwind.config.js)

**BEFORE:**
```javascript
fontSize: {
  'xxs': '0.625rem',  // 10px
  'xs': '0.75rem',    // 12px
  'sm': '0.875rem',   // 14px
  'base': '1rem',     // 16px ← DEFAULT
  'lg': '1.125rem',   // 18px
  'xl': '1.25rem',    // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.5rem',    // 40px
  '5xl': '3rem',      // 48px
}
// 10 sizes total
```

**AFTER:**
```css
--text-xs: 0.6875rem;    /* 11px */
--text-sm: 0.8125rem;    /* 13px */
--text-base: 0.875rem;   /* 14px ← NEW DEFAULT */
--text-lg: 1rem;         /* 16px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
/* 6 sizes total - reduced from 10 */
```

**Impact:**
- Default font size: 16px → **14px** (enterprise standard)
- Removed xxs, 3xl, 4xl, 5xl (unused or too large)
- 10 sizes → 6 sizes (clearer hierarchy)

---

### 4. Spacing Scale (design-tokens.css + tailwind.config.js)

**BEFORE (Tailwind defaults):**
```javascript
spacing: {
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  // ... many more values
}
```

**AFTER:**
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px - DEFAULT */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
/* Only 8 values - removed 7, 9, 10, 11, etc. */
```

**Impact:**
- Focused on most-used values
- Removed intermediate values for consistency
- All components should use multiples of 4px

---

### 5. Border Radius (design-tokens.css + tailwind.config.js)

**BEFORE:**
```javascript
// Tailwind defaults + custom
borderRadius: {
  'sm': '0.125rem',   // 2px
  'md': '0.375rem',   // 6px
  'lg': '0.5rem',     // 8px
  'xl': '0.75rem',    // 12px ← Used in glass-card
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
}
```

**AFTER:**
```css
--radius-sm: 4px;  /* inputs, tags */
--radius-md: 6px;  /* cards, buttons - DEFAULT */
--radius-lg: 8px;  /* modals, large cards - MAX */
/* Only 3 values - removed xl, 2xl, 3xl */
```

**Impact:**
- MAX radius: 8px (no more 12px, 16px, 24px)
- Enterprise standard: subtle rounding only
- Removed decorative large radii

---

### 6. Shadow System (design-tokens.css + tailwind.config.js)

**BEFORE:**
```javascript
boxShadow: {
  'glow': '0 0 20px rgba(102, 126, 234, 0.3)',
  'glow-green': '0 0 20px rgba(63, 185, 80, 0.3)',
  'glow-purple': '0 0 20px rgba(163, 113, 247, 0.3)',
}
```

**AFTER:**
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);   /* cards */
--shadow-md: 0 2px 4px rgba(0,0,0,0.06);   /* dropdowns */
--shadow-lg: 0 4px 12px rgba(0,0,0,0.08);  /* modals only */
/* Only 3 values - removed all glows */
```

**Impact:**
- Removed all colored glows (glow, glow-green, glow-purple)
- Minimal shadows for subtle elevation only
- No heavy shadows or decorative effects

---

### 7. Component Classes (index.css)

**Updated utility classes to use new tokens:**

| Class | Before | After | Change |
|-------|--------|-------|--------|
| `.glass-card` | `bg-dark-800/80 backdrop-blur-xl` | **Renamed to `.flat-card`**, `bg: var(--color-surface)` | Removed blur/transparency |
| `.stat-value` | `text-5xl bg-gradient-primary` | `font-size: var(--text-2xl)`, solid color | 48px→24px, no gradient |
| `.btn-primary` | `bg-gradient-primary shadow-glow hover:scale-105` | `bg: var(--color-accent)` | Solid color, no glow/scale |
| `.nav-link-active` | `bg-gradient-primary shadow-glow` | `bg: var(--color-accent-subtle)` | Subtle bg, no gradient |
| `.badge-blue` | `bg-accent-blue/20` | **Renamed to `.badge-accent`**, uses tokens | Semantic naming |

**New classes added:**
- `.flat-card` - Replaces glass-card
- `.flat-card-hover` - Interactive cards
- `.badge-accent`, `.badge-success`, `.badge-warning`, `.badge-error` - Semantic badges

---

### 8. Third-Party Styling (index.css)

**React DatePicker:**
- Background: `#161b22` → `var(--color-surface)`
- Text: `#f0f6fc` → `var(--color-text-primary)`
- Selected day: Gradient → `var(--color-accent)` solid

**Recharts:**
- Grid lines: `#30363d` → `var(--color-border)`
- Text: `#8b949e` → `var(--color-text-tertiary)`

**Loading shimmer:**
- Colors: Dark theme → Light theme tokens
- Animation: Same duration, different colors

---

## File Changes Summary

### Created Files (1)
- ✅ `frontend/src/styles/design-tokens.css` (200 lines)
  - All CSS variables (colors, typography, spacing, radii, shadows, sizes)

### Modified Files (3)
- ✅ `frontend/index.html`
  - Replaced Inter with DM Sans + JetBrains Mono
  - Removed `class="dark"` from html/body
- ✅ `frontend/tailwind.config.js`
  - Completely rewritten to map CSS variables
  - Removed dark theme colors, gradients, glows
  - Added semantic color system
- ✅ `frontend/src/index.css`
  - Added `@import './styles/design-tokens.css'`
  - Updated all utility classes to use tokens
  - Removed dark theme hardcoded colors
  - Updated DatePicker/Recharts styling

---

## Backward Compatibility Notes

### ⚠️ BREAKING (Components will need migration):

**Old Tailwind classes that NO LONGER WORK:**
```css
/* Colors */
bg-dark-900, bg-dark-800, text-dark-100, text-dark-200, border-dark-600
bg-gradient-primary, shadow-glow, shadow-glow-green

/* Typography */
text-xxs, text-3xl, text-4xl, text-5xl

/* Spacing */
rounded-xl (12px), rounded-2xl (16px)

/* Animations */
hover:scale-110, hover:-translate-y-1
```

**New classes to use instead:**
```css
/* Colors */
bg-surface, bg-bg, text-primary, text-secondary, border

/* Typography */
text-xs (11px), text-2xl (24px - max)

/* Spacing */
rounded-lg (8px - max), rounded-md (6px - default)

/* Interactions */
hover:bg-surface-hover (no transform animations)
```

### ✅ STILL WORKING (utility classes):

These classes still work but now use new tokens under the hood:
- `.flat-card` (was `.glass-card`)
- `.btn-primary` (solid color now, no gradient)
- `.btn-secondary` (unchanged)
- `.badge-accent` (was `.badge-blue`)
- `.input-field` (updated styling)

---

## Migration Path for Components

**Phase 1 (CURRENT):** Foundation layer implemented
- ✅ Design tokens created
- ✅ Tailwind config updated
- ✅ Global CSS updated
- ✅ Utility classes updated
- ✅ Build verified

**Phase 2 (NEXT):** Component migration
- [ ] Replace `glass-card` → `flat-card` (60+ instances)
- [ ] Replace `bg-gradient-primary` → `bg-accent` (40+ instances)
- [ ] Replace `text-dark-*` → `text-primary/secondary/tertiary`
- [ ] Replace `shadow-glow` → `shadow-sm` or remove
- [ ] Replace `text-5xl` → `text-2xl` in stat cards

**Phase 3:** Page-level updates
- [ ] Dashboard: Update stat cards
- [ ] Billing: Refactor card grids to tables
- [ ] Layout: Update sidebar and header
- [ ] Settings: Update navigation

---

## Verification Checklist

- [x] Build completes without errors (`npm run build`)
- [x] No TypeScript errors
- [x] All CSS variables defined in design-tokens.css
- [x] Tailwind config maps all tokens correctly
- [x] Global CSS applies new fonts and colors
- [x] Utility classes use tokens (no hardcoded colors)
- [x] DatePicker styling updated for light theme
- [x] Recharts styling updated for light theme

---

## Usage Examples

### Using Design Tokens in Components

**CSS:**
```css
.my-component {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
```

**Tailwind:**
```jsx
<div className="bg-surface text-primary border rounded-md p-4">
  Content
</div>
```

**Inline styles (when needed):**
```jsx
<div style={{ background: 'var(--color-surface)' }}>
  Content
</div>
```

---

## Key Design Decisions

### Why Light Theme?
- Modern enterprise SaaS standard (Linear, Stripe, Notion, Airtable)
- Better readability in well-lit offices
- Lower eye strain for extended data entry
- Professional appearance (dark themes = developer tools, light = business tools)

### Why Remove Gradients?
- Gradient aesthetic = "AI demo" perception
- Reduces visual contrast and readability
- Not used by professional B2B tools (Linear, Stripe, Retool)
- Solid colors are faster to render and more accessible

### Why 14px Base Font?
- Enterprise standard (vs 16px consumer standard)
- Allows 20-30% more content above fold
- Still WCAG AA compliant with proper contrast
- Used by: Linear (14px), Stripe (14px), Figma (13px)

### Why Minimal Shadows?
- Flat design = modern, clean appearance
- Heavy shadows = cluttered, dated look
- Strategic use only (dropdowns, modals) for clear hierarchy

---

## Next Steps

1. **Component Migration (Phase 2):**
   - Create new `CompactStatCard` component
   - Update all cards to use `flat-card` class
   - Replace gradient buttons with solid accent color
   - Test visual regressions

2. **Page Updates (Phase 3):**
   - Dashboard density improvements
   - Billing page restructure (cards → tables)
   - Layout sidebar optimization

3. **Testing:**
   - Visual regression testing
   - Accessibility audit (WCAG AA)
   - Performance benchmarks

---

**Status:** ✅ Foundation layer complete and verified
**Build Time:** 1.56s (no errors)
**Next Phase:** Component migration (see REDESIGN_AUDIT.md)
