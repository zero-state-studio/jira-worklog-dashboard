# Design System - Quick Reference

This guide shows how to use the new design tokens in your components.

---

## 🎨 Color Usage

### Surface Colors (Backgrounds)
```jsx
// Page background
<div className="bg-bg">...</div>
<div style={{ background: 'var(--color-bg)' }}>...</div>

// Card/panel background
<div className="bg-surface">...</div>
<div className="flat-card">...</div>  // Includes border, radius, shadow

// Secondary surface (nested elements)
<div className="bg-surface-secondary">...</div>

// Interactive states
<button className="hover:bg-surface-hover">...</button>
<button className="active:bg-surface-active">...</button>
```

### Text Colors
```jsx
// Primary text (headings, body)
<h1 className="text-primary">Title</h1>
<p style={{ color: 'var(--color-text-primary)' }}>Body</p>

// Secondary text (labels, descriptions)
<span className="text-secondary">Label</span>

// Tertiary text (metadata, captions)
<small className="text-tertiary">Updated 2h ago</small>

// Inverse (on dark backgrounds)
<div className="bg-accent">
  <span className="text-inverse">Button text</span>
</div>
```

### Border Colors
```jsx
// Default border
<div className="border">...</div>
<div style={{ borderColor: 'var(--color-border)' }}>...</div>

// Strong border (emphasis)
<div className="border-strong">...</div>

// Focus border (form inputs)
<input className="focus:border-focus" />
```

### Accent Color (Primary Brand)
```jsx
// Accent background
<button className="bg-accent text-inverse">CTA Button</button>

// Accent hover
<button className="bg-accent hover:bg-accent-hover">...</button>

// Accent subtle (highlights)
<div className="bg-accent-subtle text-accent-text">Highlighted</div>

// Accent text (links)
<a className="text-accent hover:text-accent-hover">Link</a>
```

### Semantic Colors
```jsx
// Success
<div className="bg-success-subtle text-success">
  ✓ Operation completed
</div>

// Warning
<div className="bg-warning-subtle text-warning">
  ⚠ Please review
</div>

// Error
<div className="bg-error-subtle text-error">
  ✕ Something went wrong
</div>
```

---

## 📝 Typography

### Font Families
```jsx
// Sans-serif (default - DM Sans)
<div className="font-sans">Text content</div>
<div style={{ fontFamily: 'var(--font-sans)' }}>...</div>

// Monospace (code - JetBrains Mono)
<code className="font-mono">const x = 42;</code>
```

### Font Sizes
```jsx
// Small text (metadata, captions)
<span className="text-xs">11px - Tiny labels</span>

// Form labels, secondary text
<label className="text-sm">13px - Form label</label>

// Body text (DEFAULT)
<p className="text-base">14px - Default body text</p>

// Section headings, emphasized text
<h3 className="text-lg">16px - Section heading</h3>

// Card titles, modal headings
<h2 className="text-xl">20px - Card title</h2>

// Page titles, primary headings
<h1 className="text-2xl">24px - Page title</h1>
```

### Font Weights
```jsx
<span className="font-normal">400 - Regular</span>
<span className="font-medium">500 - Medium</span>
<span className="font-semibold">600 - Semibold</span>
<span className="font-bold">700 - Bold</span>
```

### Line Heights
```jsx
<h1 className="leading-tight">1.25 - Headings</h1>
<p className="leading-normal">1.5 - Body text</p>
<p className="leading-relaxed">1.75 - Long-form content</p>
```

---

## 📏 Spacing

### Padding & Margin
```jsx
// Compact spacing
<div className="p-1">4px padding</div>
<div className="p-2">8px padding</div>
<div className="p-3">12px padding</div>

// Standard spacing (DEFAULT for cards)
<div className="p-4">16px padding</div>
<div className="flat-card">Uses p-4 by default</div>

// Generous spacing
<div className="p-5">20px padding</div>
<div className="p-6">24px padding</div>

// Section spacing
<div className="p-8">32px padding</div>
<div className="p-12">48px padding</div>
```

### Gaps (Flexbox/Grid)
```jsx
<div className="flex gap-2">8px gap</div>
<div className="flex gap-3">12px gap</div>
<div className="flex gap-4">16px gap (default)</div>
<div className="grid grid-cols-3 gap-4">...</div>
```

---

## 🔲 Border Radius

```jsx
// Small (inputs, tags, small buttons)
<button className="rounded-sm">4px radius</button>

// Medium (cards, buttons) - DEFAULT
<div className="rounded-md">6px radius</div>
<div className="flat-card">Uses rounded-md by default</div>

// Large (modals, large cards) - MAXIMUM
<dialog className="rounded-lg">8px radius</dialog>
```

**Note:** No rounded-xl (12px), rounded-2xl (16px), etc. - max is 8px for professional look.

---

## 🌑 Shadows

```jsx
// Small shadow (cards, subtle elevation)
<div className="shadow-sm">Subtle card elevation</div>
<div className="flat-card">Uses shadow-sm by default</div>

// Medium shadow (dropdowns, popovers)
<div className="shadow-md">Dropdown menu</div>

// Large shadow (modals ONLY)
<dialog className="shadow-lg">Modal dialog</dialog>
```

**Note:** No colored glows. Use shadows sparingly for clear hierarchy.

---

## 🧩 Component Sizes

### Buttons
```jsx
<button className="h-button-sm">28px height</button>
<button className="h-button-md">32px height</button>
<button className="h-button-lg">36px height</button>

// With utility class
<button className="btn-primary">Uses 32px height</button>
```

### Inputs
```jsx
<input className="h-input" />  {/* 36px height */}
<input className="input-field" />  {/* Includes height + styling */}
```

### Layout
```jsx
<aside className="w-sidebar">220px width</aside>
<aside className="w-sidebar-collapsed">48px width</aside>
<header className="h-header">48px height</header>
```

---

## 🎭 Utility Classes Reference

### Cards
```jsx
// Basic flat card
<div className="flat-card">
  Content
</div>

// Interactive card
<div className="flat-card-hover">
  Clickable content
</div>

// Stat card (compact)
<div className="stat-card">
  <p className="stat-label">Label</p>
  <p className="stat-value">42.5h</p>
</div>
```

### Buttons
```jsx
// Primary CTA
<button className="btn-primary">
  Save changes
</button>

// Secondary action
<button className="btn-secondary">
  Cancel
</button>
```

### Badges
```jsx
<span className="badge-accent">New</span>
<span className="badge-success">Completed</span>
<span className="badge-warning">Pending</span>
<span className="badge-error">Failed</span>
```

### Navigation
```jsx
<a className="nav-link">Inactive link</a>
<a className="nav-link nav-link-active">Active link</a>
```

### Forms
```jsx
<input className="input-field" placeholder="Enter value" />
<label className="text-sm text-secondary">Form label</label>
```

### Tables
```jsx
<table>
  <thead>
    <tr>
      <th className="table-header">Name</th>
      <th className="table-header">Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="table-cell">Row 1</td>
      <td className="table-cell">42</td>
    </tr>
  </tbody>
</table>
```

---

## 🚫 What NOT to Use

### ❌ OLD (Do not use):
```jsx
// Old dark theme colors
<div className="bg-dark-900">❌</div>
<div className="text-dark-100">❌</div>
<div className="border-dark-600">❌</div>

// Old gradients
<div className="bg-gradient-primary">❌</div>
<div className="shadow-glow">❌</div>

// Old large font sizes
<h1 className="text-5xl">❌ (48px too large)</h1>

// Old large radius
<div className="rounded-xl">❌ (12px too rounded)</div>
<div className="rounded-2xl">❌ (16px too rounded)</div>

// Old hover animations
<button className="hover:scale-110">❌</button>
<div className="hover:-translate-y-1">❌</div>

// Old glass morphism
<div className="glass-card">❌ Use flat-card instead</div>
```

### ✅ NEW (Use instead):
```jsx
// New semantic colors
<div className="bg-surface text-primary border">✓</div>

// Solid colors (no gradients)
<button className="bg-accent">✓</button>

// Appropriate font sizes
<h1 className="text-2xl">✓ (24px max for titles)</h1>

// Subtle radius
<div className="rounded-lg">✓ (8px max)</div>

// Minimal hover effects
<button className="hover:bg-accent-hover">✓</button>

// Flat design
<div className="flat-card">✓</div>
```

---

## 📦 Component Patterns

### Stat Card (Compact)
```jsx
<div className="flat-card">
  <p className="stat-label">Total Hours</p>
  <p className="stat-value">42.5h</p>
  <p className="text-tertiary text-sm">vs 40h expected</p>
</div>
```

### Data Table Row
```jsx
<tr className="border-t hover:bg-surface-hover">
  <td className="table-cell">John Doe</td>
  <td className="table-cell">42.5h</td>
  <td className="table-cell">
    <span className="badge-success">Complete</span>
  </td>
</tr>
```

### Form Field
```jsx
<div className="space-y-2">
  <label className="text-sm text-secondary">Email address</label>
  <input
    type="email"
    className="input-field"
    placeholder="you@example.com"
  />
  <p className="text-xs text-tertiary">We'll never share your email.</p>
</div>
```

### Modal
```jsx
<dialog className="flat-card shadow-lg rounded-lg p-6 max-w-md">
  <h2 className="text-xl font-semibold mb-4">Confirm action</h2>
  <p className="text-secondary mb-6">Are you sure you want to proceed?</p>
  <div className="flex gap-3 justify-end">
    <button className="btn-secondary">Cancel</button>
    <button className="btn-primary">Confirm</button>
  </div>
</dialog>
```

---

## 🎯 Design Principles

1. **Use tokens, not hardcoded values**
   - `var(--color-accent)` ✓ vs `#2563EB` ❌

2. **Prefer Tailwind classes over inline styles**
   - `className="bg-surface"` ✓ vs `style={{ background: '#FFF' }}` ❌

3. **Use semantic color names**
   - `text-secondary` ✓ vs `text-[#52525B]` ❌

4. **Keep spacing consistent**
   - Use `space-*` scale (4px increments)
   - Avoid arbitrary values like `p-[17px]`

5. **Minimize shadow usage**
   - Cards: `shadow-sm` or none
   - Dropdowns: `shadow-md`
   - Modals only: `shadow-lg`

6. **No decorative effects**
   - No gradients on backgrounds/text
   - No glowing shadows
   - No scale/translate animations (except buttons)

---

## 📚 Resources

- **Full Token Reference:** `src/styles/design-tokens.css`
- **Tailwind Config:** `tailwind.config.js`
- **Global Styles:** `src/index.css`
- **Design Audit:** `frontend/REDESIGN_AUDIT.md`
- **Changelog:** `frontend/DESIGN_TOKENS_CHANGELOG.md`

---

**Questions?** Check the design-tokens.css file for all available variables.
