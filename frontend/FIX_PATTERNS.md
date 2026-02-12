# Fix Patterns - Quality Polish Guide
**Date:** February 12, 2026
**Status:** ✅ Ready to Apply
**Build Status:** ✅ SUCCESS (1.92s)

---

## Quick Reference

This document provides **copy-paste patterns** to fix the issues identified in `POLISH_LOG.md`.

**Total fixes needed:** ~30 changes across 15-20 files

**Estimated time:** 30-45 minutes

---

## PATTERN 1: Replace Gradient Buttons with Button Component

### Before (Old Pattern):
```jsx
<button
    onClick={handleClick}
    disabled={loading}
    className="px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
>
    {loading ? 'Salvataggio...' : 'Salva'}
</button>
```

### After (New Pattern):
```jsx
import { Button } from '../common'

<Button
    variant="primary"
    onClick={handleClick}
    disabled={!isValid}
    loading={loading}
>
    Salva
</Button>
```

**Benefits:**
- ✅ No gradients
- ✅ No shadow-glow
- ✅ Loading spinner built-in
- ✅ Consistent height (32px)
- ✅ TypeScript type-safe

**Files to fix (10 files):**
- `components/settings/JiraInstancesSection.jsx` (4 buttons)
- `components/settings/TeamsSection.jsx` (1 button)
- `components/settings/UsersSection.jsx` (1 button)
- `components/settings/TeamModal.jsx` (1 button)
- `components/settings/UserModal.jsx` (1 button)
- `components/settings/PackageTemplateModal.jsx` (1 button)
- `components/settings/BulkUserModal.jsx` (1 button)
- `components/settings/FactorialSection.jsx` (2 buttons)
- `components/settings/HolidaysSection.jsx` (2 buttons)
- `components/CreatePackageModal.jsx` (2 buttons)

---

## PATTERN 2: Fix Typography text-3xl → text-2xl

### Before (Old Pattern):
```jsx
<p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
    {formatHours(totalHours)}
</p>
```

### After (New Pattern):
```jsx
<p className="text-2xl font-bold text-primary font-mono">
    {formatHours(totalHours)}
</p>
```

**Changes:**
1. `text-3xl` (30px) → `text-2xl` (24px)
2. Remove `bg-gradient-primary bg-clip-text text-transparent`
3. Add `text-primary` for color
4. Add `font-mono` for numbers (optional but recommended)

**Files to fix (5 files):**
- `pages/IssueView.jsx:78`
- `pages/EpicView.jsx:145, 185`
- `pages/TeamView.jsx:171`
- `pages/UserView.jsx:138`

---

## PATTERN 3: Replace glass-card with flat-card

### Before (Old Pattern):
```jsx
<div className="glass-card p-6">
    Content here
</div>
```

### After (New Pattern):
```jsx
<div className="flat-card p-6">
    Content here
</div>
```

**Change:** Simply replace `glass-card` with `flat-card`

**Global find & replace:**
```bash
# In VS Code: Cmd+Shift+F
# Find: glass-card
# Replace: flat-card
# Files to include: src/pages/*.jsx
```

**Files affected:** 15+ files (all old pages)

**Result:**
- ✅ Flat design (no glass morphism)
- ✅ Consistent border (1px solid)
- ✅ Subtle shadow (shadow-sm)

---

## PATTERN 4: Reduce Excessive Padding

### Before (Old Pattern):
```jsx
<div className="glass-card p-12 text-center">
    Empty state message
</div>

<div className="glass-card p-8">
    Card content
</div>
```

### After (New Pattern):
```jsx
<div className="flat-card p-6 text-center">
    Empty state message
</div>

<div className="flat-card p-4">
    Card content
</div>
```

**Rules:**
- `p-12` (48px) → `p-6` (24px) for empty states
- `p-8` (32px) → `p-4` (16px) for regular cards
- `p-6` (24px) → keep as-is (acceptable)

**Files to fix:**
- `pages/IssueView.jsx` - `p-8` → `p-4`
- `pages/EpicView.jsx` - `p-12` → `p-6`, `p-8` → `p-4`
- `pages/TeamView.jsx` - `p-8` → `p-4`
- `pages/TeamsListView.jsx` - `p-8` → `p-4`
- `pages/UserView.jsx` - `p-8` → `p-4`
- `pages/UsersListView.jsx` - `p-8` → `p-4`
- `pages/Billing.jsx` - `p-12` → `p-6`

---

## PATTERN 5: Convert Input Fields to Input Component

### Before (Old Pattern):
```jsx
<div>
    <label className="block text-sm font-medium text-dark-300 mb-1.5">
        Email
    </label>
    <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-500 focus:border-accent-blue focus:outline-none"
        placeholder="user@example.com"
    />
</div>
```

### After (New Pattern):
```jsx
import { Input } from '../common'

<Input
    label="Email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="user@example.com"
/>
```

**Benefits:**
- ✅ Consistent height (36px)
- ✅ Design tokens only
- ✅ Built-in error handling
- ✅ Less code (6 lines → 3 lines)

---

## PATTERN 6: Convert Secondary Buttons

### Before (Old Pattern):
```jsx
<button
    onClick={onClose}
    className="px-5 py-2 bg-dark-700 border border-dark-600 text-dark-200 font-medium rounded-lg hover:bg-dark-600 transition-colors"
>
    Annulla
</button>
```

### After (New Pattern):
```jsx
<Button variant="secondary" onClick={onClose}>
    Annulla
</Button>
```

**Applies to:** All "Cancel", "Close", "Annulla" buttons in modals

---

## EXAMPLE 1: Complete Modal Fix

### Before - TeamModal.jsx:
```jsx
// OLD: 20 lines with inline styles
<div className="flex justify-end gap-3 mt-6">
    <button
        onClick={onClose}
        className="px-5 py-2 bg-dark-700 border border-dark-600 text-dark-200 font-medium rounded-lg hover:bg-dark-600 transition-colors"
    >
        Annulla
    </button>
    <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        className="px-5 py-2 bg-gradient-primary text-white font-medium rounded-lg shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {saving ? 'Salvataggio...' : (team ? 'Salva Modifiche' : 'Crea Team')}
    </button>
</div>
```

### After - TeamModal.jsx:
```jsx
// NEW: 10 lines with Button component
import { Button } from '../common'

<div className="flex justify-end gap-3 mt-6">
    <Button variant="secondary" onClick={onClose}>
        Annulla
    </Button>
    <Button
        variant="primary"
        onClick={handleSave}
        disabled={!name.trim()}
        loading={saving}
    >
        {team ? 'Salva Modifiche' : 'Crea Team'}
    </Button>
</div>
```

**Reduction:** 20 lines → 10 lines (-50%)

---

## EXAMPLE 2: Complete Page Fix (IssueView.jsx)

### Changes Needed:

**1. Typography Fix (line ~78):**
```diff
- <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
+ <p className="text-2xl font-bold text-primary font-mono">
      {formatHours(totalHours)}
  </p>
```

**2. Glass-card Fix (all occurrences):**
```diff
- <div className="glass-card p-8">
+ <div className="flat-card p-4">
```

**3. Empty State Padding Fix:**
```diff
- <div className="glass-card p-12 text-center">
+ <div className="flat-card p-6 text-center">
```

**Total changes:** 3-5 replacements per page

---

## STEP-BY-STEP CHECKLIST

### Phase 1: Settings Components (30 min)
- [ ] Add Button import to all 10 settings files
- [ ] Replace all `bg-gradient-primary` buttons with `<Button variant="primary">`
- [ ] Replace all secondary buttons with `<Button variant="secondary">`
- [ ] Remove all `shadow-glow` classes
- [ ] Test in Settings page (/app/settings)

### Phase 2: Old Pages Typography (15 min)
- [ ] Fix IssueView.jsx - text-3xl → text-2xl
- [ ] Fix EpicView.jsx - text-3xl → text-2xl (2x)
- [ ] Fix TeamView.jsx - text-3xl → text-2xl
- [ ] Fix UserView.jsx - text-3xl → text-2xl
- [ ] Remove all gradient text classes

### Phase 3: Glass-card Replacement (5 min)
- [ ] Global find & replace in all pages:
  - Find: `glass-card`
  - Replace: `flat-card`
  - Files: `src/pages/*.jsx`

### Phase 4: Padding Reduction (10 min)
- [ ] IssueView.jsx - p-8 → p-4
- [ ] EpicView.jsx - p-12 → p-6, p-8 → p-4
- [ ] TeamView.jsx - p-8 → p-4
- [ ] TeamsListView.jsx - p-8 → p-4
- [ ] UserView.jsx - p-8 → p-4
- [ ] UsersListView.jsx - p-8 → p-4
- [ ] Billing.jsx - p-12 → p-6

### Phase 5: Build & Test (5 min)
- [ ] Run `npm run build`
- [ ] Verify no errors
- [ ] Test visual changes in browser
- [ ] Check responsive at 1920px, 1440px, 1280px

**Total time:** ~60 minutes for complete polish

---

## VERIFICATION SCRIPT

```bash
# Check for remaining gradient buttons
grep -r "bg-gradient-primary" src/components/settings/ src/components/CreatePackageModal.jsx

# Check for remaining shadow-glow
grep -r "shadow-glow" src/components/settings/

# Check for text-3xl in pages
grep -r "text-3xl" src/pages/

# Check for glass-card
grep -r "glass-card" src/pages/

# Build test
npm run build

# Expected output: ✓ built in ~2s with NO errors
```

---

## QUICK WINS (5-10 minutes)

If you only have time for the most impactful changes:

### 1. Glass-card → Flat-card (2 min)
```bash
# VS Code: Cmd+Shift+H (Replace in Files)
# Find: glass-card
# Replace: flat-card
# Files to include: src/pages/*.jsx
# Click "Replace All"
```

### 2. Fix Typography in 5 Pages (5 min)
```bash
# VS Code: Cmd+Shift+F (Find in Files)
# Search: text-3xl.*bg-gradient-primary
# Files: src/pages/IssueView.jsx, EpicView.jsx, TeamView.jsx, UserView.jsx
# Manual replace with: text-2xl font-bold text-primary font-mono
```

### 3. Build & Test (2 min)
```bash
npm run build
```

**Total:** 9 minutes for 70% of visual improvement

---

## AFTER FIXES - EXPECTED RESULTS

### Build Output:
```
✓ 3421 modules transformed
✓ built in ~2s
dist/assets/index-*.css     65.XX kB (unchanged)
dist/assets/index-*.js   1,107.XX kB (unchanged)
```

### Visual Changes:
- ✅ No gradients on buttons or text
- ✅ Max text size 24px (text-2xl)
- ✅ Flat card design throughout
- ✅ Higher information density (reduced padding)
- ✅ Consistent button styles
- ✅ Consistent input heights

### Code Quality:
- ✅ 50% less button code (inline → component)
- ✅ 100% design token usage (no hardcoded colors)
- ✅ TypeScript type safety on new components
- ✅ Accessible (Button component is WCAG AA)

---

## NOTES

### What NOT to Change:
- ✅ Chart colors (#667eea, etc.) - Intentional for data viz
- ✅ Landing page large text - Marketing pages have different rules
- ✅ Login page gradients - Out-of-app auth flow
- ✅ shadow-lg on Modal - Intentional for elevated UI

### Files That Don't Need Changes:
- ✅ All files in `pages/New*.tsx` - Already polished
- ✅ All files in `components/common/` - Already polished
- ✅ `NewLayout.tsx` - Already polished
- ✅ `App.jsx` - No visual changes needed

---

## SUPPORT

If you encounter issues:

1. **Build fails:** Check import paths for Button/Input components
2. **TypeScript errors:** Make sure to import correct types
3. **Visual regression:** Compare with NewBilling.tsx or NewTeams.tsx for reference
4. **Questions:** Check `components/common/README.md` for component API

---

**Last Updated:** February 12, 2026
**Build Verified:** ✅ SUCCESS (1.92s)
**Ready to Apply:** ✅ YES
**Estimated Time:** 30-60 minutes
**Impact:** 🎨 High (removes all gradient/glass morphism, improves typography)
